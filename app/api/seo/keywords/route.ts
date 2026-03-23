import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'



export async function POST(req: NextRequest) {
  try {
    const { keyword, site } = await req.json()

    const prompt = `You are an expert SEO keyword strategist for ${site || 'rabtnaturals.com'} — an Indian natural skincare & haircare brand (based in Indore, India). Target audience: Indian consumers aged 18-45.

Do a deep keyword analysis for: "${keyword}"

Return in this format:

**🎯 Main Keyword Analysis**
- Search Intent: [informational / commercial / transactional]
- Estimated Monthly Searches (India): [number]
- Keyword Difficulty: [Easy/Medium/Hard — 1-100]
- Current opportunity: [why this is good/bad for rabtnaturals.com]

**📊 Related Keywords (rank these by opportunity)**
| Keyword | Est. Searches/mo | Difficulty | Priority |
|---------|-----------------|------------|----------|
| [keyword] | [number] | [score] | [High/Med/Low] |
(list 8-10 related keywords)

**🔍 Long-tail Variations (easier to rank, high buyer intent)**
1. [long-tail keyword]
2. [long-tail keyword]
3. [long-tail keyword]
4. [long-tail keyword]
5. [long-tail keyword]

**📝 Content Strategy to Rank:**
- Page type: [blog post / product page / landing page]
- Word count needed: [number]
- Key topics to cover: [list]
- Internal linking opportunity: [what pages to link from/to]

**⚡ Fastest Path to Rank:**
[1-3 specific steps rabtnaturals.com should take to rank for this keyword within 3-6 months]

Focus on Indian skincare/haircare market. Be specific with numbers.`

    const anthropic = await getAnthropicClient()
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const analysis = msg.content[0].type === 'text' ? msg.content[0].text : 'Analysis failed'
    return NextResponse.json({ analysis })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
