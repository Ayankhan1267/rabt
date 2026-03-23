import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { url, site } = await req.json()

    // Fetch the actual page HTML for analysis
    let pageContent = ''
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RabtSEOBot/1.0)' },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const html = await res.text()
        // Extract meaningful text — title, meta, h1-h3, first 3000 chars of body text
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
        const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
        const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
        const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].slice(0, 5)
        const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
        const schemaMatch = html.includes('application/ld+json')
        const wordCount = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length

        pageContent = `
URL: ${url}
Title: ${titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() || 'NOT FOUND'}
Meta Description: ${metaDescMatch?.[1] || 'MISSING'}
H1: ${h1Match?.[1]?.replace(/<[^>]+>/g, '').trim() || 'MISSING'}
H2s: ${h2Matches.map(m => m[1].replace(/<[^>]+>/g, '').trim()).join(' | ') || 'None found'}
Canonical: ${canonicalMatch?.[1] || 'MISSING'}
Schema Markup: ${schemaMatch ? 'Present' : 'Missing'}
Approx Word Count: ${wordCount}
        `.trim()
      }
    } catch {
      pageContent = `URL: ${url}\nNote: Could not fetch page content — analyzing based on URL structure only`
    }

    const prompt = `You are an expert SEO consultant for ${site || 'rabtnaturals.com'} — an Indian natural skincare & haircare brand targeting Indian consumers.

Analyze this page and give a detailed SEO audit:

${pageContent}

Provide your audit in this exact format:

**SEO Score: [X/100]**

**✅ What's Working:**
- [list good things]

**❌ Critical Issues:**
- [list problems with specific fixes]

**⚡ Quick Wins (do today):**
1. [specific actionable fix]
2. [specific actionable fix]
3. [specific actionable fix]

**🎯 Target Keywords:**
- Primary: [best keyword for this page]
- Secondary: [2-3 more keywords]

**📝 Suggested Meta Title (60 chars):**
[optimized title]

**📝 Suggested Meta Description (155 chars):**
[optimized description]

**📈 Expected Impact if Fixed:**
[what will improve — rankings, CTR, traffic estimate]

Be specific, actionable, and focus on Indian market skincare/haircare SEO.`

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const audit = msg.content[0].type === 'text' ? msg.content[0].text : 'Audit failed'
    return NextResponse.json({ audit })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
