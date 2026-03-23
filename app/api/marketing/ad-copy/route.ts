import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'



export async function POST(req: NextRequest) {
  try {
    const { topic, channel, goal } = await req.json()

    const CHANNEL_GUIDE: Record<string, string> = {
      instagram: 'Instagram Feed/Reel ad. Hook line (3-5 words) + body (2-3 sentences) + CTA button text. Visual-first, emotion-driven.',
      facebook: 'Facebook ad. Longer body allowed (3-4 sentences). Trust-building. Clear value prop.',
      google: 'Google Search ad. Headline: 30 chars max. Description: 90 chars max. Very direct, keyword-rich.',
      whatsapp: 'WhatsApp broadcast message. Personal, conversational. No bold. 3-4 lines with emoji. Like friend texting.',
    }

    const GOAL_GUIDE: Record<string, string> = {
      awareness: 'Build brand awareness — focus on USP and brand story',
      leads: 'Get skin quiz/consultation sign-ups — offer free value',
      sales: 'Direct product sale — urgency, social proof, offer',
      consultation: 'Book free skin consultation — low-friction CTA',
    }

    const prompt = `You are an expert Indian D2C ad copywriter for Rabt Naturals (rabtnaturals.com) — clean beauty skincare brand.

Product/Offer: ${topic}
Channel: ${CHANNEL_GUIDE[channel] || channel}
Campaign Goal: ${GOAL_GUIDE[goal] || goal}

Write 3 different ad copy variants for A/B testing. Each should have different angle/hook.

Return JSON array:
[
  {
    "headline": "Short punchy headline",
    "body": "Ad body copy",
    "cta": "CTA button text"
  },
  ...
]

Angles to use across variants:
- Variant A: Problem-solution angle
- Variant B: Social proof / transformation angle
- Variant C: Offer/urgency angle

Use Hinglish naturally. India-specific context. Real pain points of Indian skin (humidity, pollution, sun damage). Max 3 variants.`

    const anthropic = await getAnthropicClient()
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    let variants = []

    if (jsonMatch) {
      try { variants = JSON.parse(jsonMatch[0]) } catch { /* fallback */ }
    }

    if (!variants.length) {
      variants = [
        { headline: 'Glow milega guaranteed', body: text.slice(0, 150), cta: 'Shop Now' },
      ]
    }

    return NextResponse.json({ variants })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
