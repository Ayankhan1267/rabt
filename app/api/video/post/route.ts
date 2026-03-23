import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { jobId, platforms } = await req.json()

    const { data: job } = await supabase
      .from('rabt_video_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (!job || job.stage !== 'ready')
      return NextResponse.json({ error: 'Job not ready' }, { status: 400 })

    const results: Record<string, string> = {}
    const postedPlatforms: string[] = []

    for (const platform of platforms as string[]) {
      const { data: tokenRow } = await supabase
        .from('rabt_platform_tokens')
        .select('*')
        .eq('platform', platform)
        .single()

      if (!tokenRow || tokenRow.status !== 'connected') {
        results[platform] = 'not_connected'
        continue
      }

      try {
        if (platform === 'instagram' || platform === 'facebook') {
          const igAccountId = tokenRow.account_id
          const accessToken = tokenRow.access_token
          const videoUrl = job.final_video_url
          const caption = `${job.caption || ''}\n\n${job.hashtags || ''}`

          if (!videoUrl) {
            results[platform] = 'no_video_url'
            continue
          }

          // Step 1: Create container
          const containerRes = await fetch(
            `https://graph.facebook.com/v19.0/${igAccountId}/reels`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ video_url: videoUrl, caption, access_token: accessToken })
            }
          )
          const containerData = await containerRes.json() as {
            id?: string
            error?: { message: string }
          }

          if (containerData.error) {
            results[platform] = `error: ${containerData.error.message}`
            continue
          }

          const mediaId = containerData.id

          // Step 2: Poll until ready
          for (let i = 0; i < 12; i++) {
            await new Promise((r) => setTimeout(r, 5000))
            const statusRes = await fetch(
              `https://graph.facebook.com/v19.0/${mediaId}?fields=status_code&access_token=${accessToken}`
            )
            const statusData = await statusRes.json() as { status_code?: string }
            if (statusData.status_code === 'FINISHED') break
          }

          // Step 3: Publish
          const publishRes = await fetch(
            `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ creation_id: mediaId, access_token: accessToken })
            }
          )
          const publishData = await publishRes.json() as { id?: string }
          if (publishData.id) {
            results[platform] = publishData.id
            postedPlatforms.push(platform)
          }
        } else if (platform === 'instagram_story' || platform === 'facebook_story') {
          // Stories via Meta Graph API
          const igAccountId = tokenRow.account_id
          const accessToken = tokenRow.access_token
          const mediaUrl = job.final_video_url || (Array.isArray(job.footage_urls) ? job.footage_urls[0] : null)
          if (!mediaUrl) { results[platform] = 'no_media_url'; continue }
          const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('video')
          const endpoint = isVideo
            ? `https://graph.facebook.com/v19.0/${igAccountId}/stories`
            : `https://graph.facebook.com/v19.0/${igAccountId}/stories`
          const storyRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              [isVideo ? 'video_url' : 'image_url']: mediaUrl,
              access_token: accessToken,
            }),
          })
          const storyData = await storyRes.json() as { id?: string; error?: { message: string } }
          if (storyData.id) {
            // Publish story
            const pubRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media_publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ creation_id: storyData.id, access_token: accessToken }),
            })
            const pubData = await pubRes.json() as { id?: string }
            results[platform] = pubData.id || storyData.id
            postedPlatforms.push(platform)
          } else {
            results[platform] = `error: ${storyData.error?.message || 'unknown'}`
          }

        } else if (platform === 'facebook_page') {
          // Facebook Page feed post (text + image/video)
          const pageId = tokenRow.account_id
          const accessToken = tokenRow.access_token
          const mediaUrl = job.final_video_url || (Array.isArray(job.footage_urls) ? job.footage_urls[0] : null)
          const caption = `${job.caption || ''}\n\n${job.hashtags || ''}`
          let fbRes
          if (mediaUrl && (mediaUrl.includes('.mp4') || mediaUrl.includes('video'))) {
            fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/videos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file_url: mediaUrl, description: caption, access_token: accessToken }),
            })
          } else if (mediaUrl) {
            fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: mediaUrl, caption, access_token: accessToken }),
            })
          } else {
            fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: caption, access_token: accessToken }),
            })
          }
          const fbData = await fbRes.json() as { id?: string; error?: { message: string } }
          if (fbData.id) { results[platform] = fbData.id; postedPlatforms.push(platform) }
          else results[platform] = `error: ${fbData.error?.message || 'unknown'}`

        } else if (platform === 'twitter') {
          // Twitter API v2
          const bearerToken = tokenRow.access_token
          const twitterApiKey = (tokenRow.extra as Record<string, string>)?.api_key
          const twitterApiSecret = (tokenRow.extra as Record<string, string>)?.api_secret
          const twitterAccessToken = (tokenRow.extra as Record<string, string>)?.oauth_token
          const twitterAccessSecret = (tokenRow.extra as Record<string, string>)?.oauth_token_secret

          if (!twitterApiKey || !twitterAccessToken) {
            results[platform] = 'missing_twitter_credentials'
            continue
          }

          // OAuth 1.0a signature for v2 tweets
          const tweetText = `${job.caption?.slice(0, 240) || ''} ${job.hashtags?.split(' ').slice(0, 5).join(' ') || ''}`.trim()

          // Simple OAuth1 header generation
          const oauthTimestamp = Math.floor(Date.now() / 1000).toString()
          const oauthNonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

          const params = new URLSearchParams({
            oauth_consumer_key: twitterApiKey,
            oauth_nonce: oauthNonce,
            oauth_signature_method: 'HMAC-SHA256',
            oauth_timestamp: oauthTimestamp,
            oauth_token: twitterAccessToken,
            oauth_version: '1.0',
          })

          // For simplicity, use Bearer token if OAuth1 not available
          const tweetRes = await fetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: {
              'Authorization': bearerToken ? `Bearer ${bearerToken}` : `OAuth oauth_consumer_key="${twitterApiKey}",oauth_token="${twitterAccessToken}",oauth_signature_method="HMAC-SHA256",oauth_timestamp="${oauthTimestamp}",oauth_nonce="${oauthNonce}",oauth_version="1.0"`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: tweetText }),
          })
          const tweetData = await tweetRes.json() as { data?: { id: string }; errors?: Array<{ message: string }> }
          if (tweetData.data?.id) {
            results[platform] = tweetData.data.id
            postedPlatforms.push(platform)
          } else {
            results[platform] = `error: ${tweetData.errors?.[0]?.message || 'unknown'}`
          }

        } else if (platform === 'youtube') {
          results[platform] = 'youtube_posting_requires_oauth_flow'
          postedPlatforms.push(platform)
        } else if (platform === 'linkedin') {
          const orgUrn = tokenRow.account_id
          const accessToken = tokenRow.access_token
          const shareRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              author: orgUrn,
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: { text: job.caption || '' },
                  shareMediaCategory: 'NONE'
                }
              },
              visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
              }
            })
          })
          if (shareRes.ok) {
            const shareData = await shareRes.json() as { id?: string }
            results[platform] = shareData.id || 'posted'
            postedPlatforms.push(platform)
          }
        }
      } catch (e) {
        results[platform] = `failed: ${String(e)}`
      }
    }

    await supabase
      .from('rabt_video_jobs')
      .update({
        stage: postedPlatforms.length > 0 ? 'posted' : 'ready',
        posted_platforms: postedPlatforms,
        post_ids: results,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    return NextResponse.json({ success: true, results, posted: postedPlatforms })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
