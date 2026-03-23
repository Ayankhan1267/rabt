import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'



const BRAND = `Rabt Naturals — Indian clean beauty brand (rabtnaturals.com). Founded in Indore. Products: natural skincare + haircare. USP: free skin analysis + specialist consultation. Tagline: "Apni skin ki baat samjho."`

const LANG_GUIDE: Record<string, string> = {
  hinglish: 'Hinglish (natural Hindi-English mix) — the way young urban Indians actually speak. Eg: "Skin dry ho rahi hai? Hamare Hyaluronic Serum try karo!"',
  hindi: 'Pure Hindi — formal but warm',
  english: 'Indian English — conversational, not British formal',
}

export async function POST(req: NextRequest) {
  try {
    const { platform, contentType, topic, tone, language } = await req.json()

    const lengthGuide: Record<string, string> = {
      post: '150-200 words',
      reel: 'Reel script: hook (0-3s) + main content (3-30s) + CTA (30-35s). Total: 100-150 words',
      story: '3-5 slides with text overlay copy. Each slide: 1-2 short sentences',
      caption: '2-3 sentences + call to action',
      broadcast: 'WhatsApp broadcast: 3-4 sentences, personal, warm, with emoji. No formatting',
      blog: 'Full blog: 600-800 words with H2 sections',
      hashtags: '15-20 relevant hashtags mix of Hindi, English, branded',
    }

    const prompt = `You are Rabt Naturals ka content AI. Create ${platform} ${contentType} content.

Brand: ${BRAND}
Topic: ${topic}
Platform: ${platform}
Content Type: ${contentType}
Tone: ${tone}
Language: ${LANG_GUIDE[language] || LANG_GUIDE.hinglish}
Length: ${lengthGuide[contentType] || '150-200 words'}

${platform === 'instagram' ? `Instagram specific:
- Hook first 3 seconds is crucial
- Use line breaks for readability
- End with question or CTA to increase engagement` : ''}

${platform === 'whatsapp' ? `WhatsApp specific:
- No markdown formatting (no bold/italic)
- Emojis instead of bullet points
- Personal, conversational, like a message from a friend
- Max 4 lines` : ''}

Respond in JSON:
{
  "content": "Main content here",
  "hashtags": "#hashtag1 #hashtag2 ... (only for Instagram)",
  "cta": "Call to action text"
}`

    const anthropic = await getAnthropicClient()
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    let result = { content: text, hashtags: '', cta: '' }

    if (jsonMatch) {
      try { result = JSON.parse(jsonMatch[0]) } catch { result.content = text }
    }

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
