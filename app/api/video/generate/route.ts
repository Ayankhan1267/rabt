import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { category, tone, platform, videoType, productFocus, cta, language, targetAudience } = body

    // 1. Create job in DB
    const { data: job, error } = await supabase
      .from('rabt_video_jobs')
      .insert({
        category, tone, platform,
        video_type: videoType || 'avatar',
        product_focus: productFocus,
        cta, language,
        target_audience: targetAudience,
        stage: 'scripting',
        progress: 10,
        title: `${category} - ${tone} - ${platform}`,
      })
      .select()
      .single()

    if (error || !job) return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })

    // 2. Start background processing
    processVideoPipeline(job.id, body).catch(console.error)

    return NextResponse.json({ jobId: job.id, stage: 'scripting', message: 'Pipeline started' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

async function updateJob(id: string, data: Record<string, unknown>) {
  await supabase.from('rabt_video_jobs').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
}

async function processVideoPipeline(jobId: string, params: Record<string, string>) {
  const { category, tone, platform, productFocus, cta, language } = params

  try {
    // STAGE 1: Generate Script
    await updateJob(jobId, { stage: 'scripting', progress: 15 })

    const langNote =
      language === 'hinglish'
        ? 'Write in Hinglish (mix of Hindi words in English sentences, natural Indian style)'
        : language === 'hindi'
        ? 'Write in Hindi (Devanagari script)'
        : 'Write in English'

    const toneGuide =
      tone === 'Gen-Z Casual'
        ? 'casual, trendy, relatable Gen-Z tone'
        : tone === 'Clinical Expert'
        ? 'authoritative, science-backed clinical tone'
        : tone === 'Luxury Brand'
        ? 'premium, aspirational luxury tone'
        : tone === 'Motivational'
        ? 'energetic, inspiring motivational tone'
        : 'funny, relatable everyday tone'

    const scriptPrompt = `You are a viral social media content creator for Rabt Naturals — an Indian skincare/haircare brand.

Create a ${platform === 'youtube' ? '60-second YouTube Short' : '30-second Instagram Reel'} script about: ${category}
${productFocus ? `Product to highlight: ${productFocus}` : ''}
Tone: ${toneGuide}
CTA: ${cta || 'Check link in bio for free skin analysis'}
${langNote}

Return ONLY a JSON object (no markdown, no explanation):
{
  "hook": "0-3 seconds — attention grabbing opener",
  "problem": "3-8 seconds — relatable problem statement",
  "solution": "8-20 seconds — Rabt product as solution with key benefit",
  "cta": "20-30 seconds — clear call to action",
  "full_voiceover": "complete voiceover text for text-to-speech",
  "caption": "full Instagram caption (200 words)",
  "hashtags": "30 relevant hashtags as single string",
  "title": "video title for YouTube"
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: scriptPrompt }]
    })

    let script: Record<string, string> = {}
    try {
      const text = message.content[0].type === 'text' ? message.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      script = jsonMatch ? JSON.parse(jsonMatch[0]) : { full_voiceover: text }
    } catch {
      script = {
        full_voiceover: 'Script generation failed',
        hook: '',
        problem: '',
        solution: '',
        cta: cta || ''
      }
    }

    await updateJob(jobId, {
      script,
      caption: script.caption || '',
      hashtags: script.hashtags || '',
      stage: 'voiceover',
      progress: 30,
    })

    // STAGE 2: Generate Voiceover via ElevenLabs
    await updateJob(jobId, { stage: 'voiceover', progress: 35 })

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY
    let voiceoverUrl: string | null = null

    if (elevenLabsKey && script.full_voiceover) {
      try {
        const voiceId = 'pNInz6obpgDQGcFmaJgB' // Adam voice
        const voiceRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: script.full_voiceover.slice(0, 500),
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
          })
        })

        if (voiceRes.ok) {
          const audioBuffer = await voiceRes.arrayBuffer()
          const filename = `voiceover-${jobId}.mp3`
          const { data: storageData } = await supabase.storage
            .from('video-assets')
            .upload(filename, audioBuffer, { contentType: 'audio/mpeg', upsert: true })
          if (storageData) {
            const { data: urlData } = supabase.storage.from('video-assets').getPublicUrl(filename)
            voiceoverUrl = urlData.publicUrl
          }
        }
      } catch (e) {
        console.error('Voiceover failed:', e)
      }
    }

    await updateJob(jobId, { voiceover_url: voiceoverUrl, stage: 'footage', progress: 50 })

    // STAGE 3: Fetch Stock Footage from Pexels
    const pexelsKey = process.env.PEXELS_API_KEY
    let footageUrls: string[] = []

    if (pexelsKey) {
      try {
        const query =
          category === 'skincare'
            ? 'skincare routine face'
            : category === 'haircare'
            ? 'hair care woman'
            : category === 'supplements'
            ? 'vitamins health wellness'
            : 'beauty skincare'

        const pexelsRes = await fetch(
          `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3&size=medium`,
          { headers: { Authorization: pexelsKey } }
        )
        if (pexelsRes.ok) {
          const pexelsData = await pexelsRes.json() as {
            videos: Array<{ video_files: Array<{ link: string; quality: string }> }>
          }
          footageUrls =
            pexelsData.videos
              ?.slice(0, 3)
              .map((v) => {
                const file = v.video_files?.find((f) => f.quality === 'hd') || v.video_files?.[0]
                return file?.link || ''
              })
              .filter(Boolean) || []
        }
      } catch (e) {
        console.error('Pexels failed:', e)
      }
    }

    await updateJob(jobId, { footage_urls: footageUrls, stage: 'avatar', progress: 65 })

    // STAGE 4: HeyGen Avatar Video
    const heygenKey = process.env.HEYGEN_API_KEY
    let avatarVideoUrl: string | null = null

    if (heygenKey && script.full_voiceover) {
      try {
        const heygenRes = await fetch('https://api.heygen.com/v2/video/generate', {
          method: 'POST',
          headers: {
            'X-Api-Key': heygenKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_inputs: [
              {
                character: {
                  type: 'avatar',
                  avatar_id: 'Abigail_expressive_20230403',
                  avatar_style: 'normal'
                },
                voice: {
                  type: 'text',
                  input_text: script.full_voiceover.slice(0, 1500),
                  voice_id: 'en-IN-NeerjaExpressiveNeural',
                },
                background: { type: 'color', value: '#FFFFFF' }
              }
            ],
            dimension: { width: 1080, height: 1920 },
            aspect_ratio: null,
          })
        })

        if (heygenRes.ok) {
          const heygenData = await heygenRes.json() as { data?: { video_id: string } }
          const videoId = heygenData.data?.video_id

          if (videoId) {
            // Poll for completion (max 5 minutes)
            for (let i = 0; i < 30; i++) {
              await new Promise((r) => setTimeout(r, 10000))
              const statusRes = await fetch(
                `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
                { headers: { 'X-Api-Key': heygenKey } }
              )
              if (statusRes.ok) {
                const statusData = await statusRes.json() as {
                  data?: { status: string; video_url?: string }
                }
                if (statusData.data?.status === 'completed') {
                  avatarVideoUrl = statusData.data.video_url || null
                  break
                } else if (statusData.data?.status === 'failed') {
                  break
                }
              }
              await updateJob(jobId, { progress: 65 + Math.min(i * 1, 20) })
            }
          }
        }
      } catch (e) {
        console.error('HeyGen failed:', e)
      }
    }

    const finalVideoUrl = avatarVideoUrl || footageUrls[0] || null

    await updateJob(jobId, {
      avatar_video_url: avatarVideoUrl,
      final_video_url: finalVideoUrl,
      stage: 'ready',
      progress: 100,
    })
  } catch (err) {
    console.error('Pipeline error:', err)
    await updateJob(jobId, { stage: 'failed', error_message: String(err), progress: 0 })
  }
}
