import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'



export async function POST(req: NextRequest) {
  try {
    const { brief } = await req.json()

    const prompt = `You are a senior marketing strategist for Rabt Naturals — an Indian D2C skincare/haircare brand (rabtnaturals.com, Indore). Revenue channels: website, WhatsApp commerce, Instagram, consultant network.

Client Brief: ${brief}

Create a complete campaign plan with:

**Campaign Name & Tagline**

**Target Audience**
- Demographics, psychographics, pain points

**Channel Strategy** (pick 3-4 most effective)
- Instagram/Facebook Ads
- WhatsApp Broadcasts
- SEO/Blog
- Google Ads
- Influencer Outreach
- Email

**Budget Breakdown** (if budget mentioned, split it; if not, suggest)

**Content Plan** (week-by-week for 4 weeks)
- Week 1: Awareness
- Week 2: Engagement
- Week 3: Conversion
- Week 4: Retention

**KPIs & Success Metrics**
- Lead target, conversion target, ROAS target

**Key Messages** (3 core messages in Hinglish)

Keep it practical and specific to Rabt Naturals. India-market context always.`

    const anthropic = await getAnthropicClient()
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const plan = msg.content[0].type === 'text' ? msg.content[0].text : ''
    return NextResponse.json({ plan })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
