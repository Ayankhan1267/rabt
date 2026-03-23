import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'



export async function POST(req: NextRequest) {
  try {
    const { topic, type, site } = await req.json()

    const brand = `Rabt Naturals (${site || 'rabtnaturals.com'}) — an Indian clean beauty brand offering natural skincare & haircare products. Founded in Indore. Known for skin consultations, personalized routines, and clean ingredients. USP: free skin analysis + specialist consultation.`

    let prompt = ''

    if (type === 'blog') {
      prompt = `You are an expert SEO content writer for ${brand}

Write a complete, SEO-optimized blog post targeting: "${topic}"

Structure:
1. **SEO Title** (55-60 chars, include keyword naturally)
2. **Meta Description** (150-155 chars, include keyword + CTA)
3. **URL Slug** (keyword-rich, hyphenated)
4. **Full Blog Post** (1200-1500 words):
   - Hook intro (100 words — speak directly to Indian reader's pain)
   - H2: [section] with H3 subsections
   - Include Rabt Naturals naturally (not pushy) in 2-3 places
   - End with CTA to free skin analysis on rabtnaturals.com
5. **Internal Links** — suggest 3 pages on rabtnaturals.com to link to
6. **Target Keywords** used — list primary + 5 LSI keywords

Write in friendly, conversational Indian English. Include India-specific context (weather, skin types, common problems). Optimize for Google featured snippet where possible.`

    } else if (type === 'product') {
      prompt = `You are an expert ecommerce SEO copywriter for ${brand}

Write a complete SEO-optimized product page for: "${topic}"

Include:
1. **SEO Title Tag** (55 chars max)
2. **Meta Description** (155 chars, CTA + keyword)
3. **Product H1** (compelling, keyword-rich)
4. **Product Description** (300-400 words):
   - Lead with the transformation/benefit
   - Key ingredients and what they do for Indian skin
   - How to use (step by step)
   - Who it's for (skin type, concern)
5. **Bullet Points** (8 key benefits for above-the-fold)
6. **FAQ Section** (5 questions) — schema-ready
7. **Keywords** — primary + secondary to include on page

Write for Indian consumers. Mention free consultation CTA. Focus on ranking for "[product name] india" and "[concern] serum/cream india" type keywords.`

    } else if (type === 'faq') {
      prompt = `You are an SEO expert for ${brand}

Create a comprehensive FAQ section about: "${topic}"

Requirements:
- 10 questions and detailed answers
- Target featured snippets (concise 40-60 word answers first, then expand)
- Include Rabt Naturals naturally in 2-3 answers
- Include JSON-LD FAQ schema markup at the end

Format:
**Q: [question]**
A: [40-60 word direct answer for featured snippet]. [2-3 more sentences expanding]

...

**JSON-LD Schema:**
\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  ...
}
\`\`\`

Questions should target "how to", "what is", "best", "does X work" type searches that Indians search for around skincare/haircare.`

    } else if (type === 'meta') {
      prompt = `You are an SEO meta tag specialist for ${brand}

Generate optimized meta tags for: "${topic}"

Provide:

**1. Title Tags (give 3 options, rank from best to good):**
- Option A: [55-60 chars] — [why this works]
- Option B: [55-60 chars] — [why this works]
- Option C: [55-60 chars] — [why this works]

**2. Meta Descriptions (give 3 options):**
- Option A: [150-155 chars] — [CTR hook used]
- Option B: [150-155 chars] — [CTR hook used]
- Option C: [150-155 chars] — [CTR hook used]

**3. Open Graph Tags:**
\`\`\`html
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:type" content="..." />
\`\`\`

**4. Structured Data (JSON-LD):**
[appropriate schema for this page type]

**5. Target Keywords for this page:**
- Primary: [keyword]
- Secondary: [2-3 keywords]

Optimize for click-through rate from Indian Google search results.`
    }

    const anthropic = await getAnthropicClient()
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = msg.content[0].type === 'text' ? msg.content[0].text : 'Generation failed'
    return NextResponse.json({ content })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
