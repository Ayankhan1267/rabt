import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Rabt product catalog with prices
const CATALOG: Record<string, { price: number; concern: string[] }> = {
  'Glow Serum 30ml':         { price: 899, concern: ['Dark Spots', 'Dullness', 'Pigmentation'] },
  'Vitamin C Serum':         { price: 799, concern: ['Dark Spots', 'Dullness', 'Pigmentation', 'Fine Lines'] },
  'Niacinamide Toner':       { price: 499, concern: ['Acne', 'Oily T-zone', 'Large Pores'] },
  'Salicylic Acid Serum':    { price: 649, concern: ['Acne', 'Blackheads'] },
  'Clay Mask':               { price: 449, concern: ['Acne', 'Oily T-zone'] },
  'Hydrating Cream':         { price: 699, concern: ['Dryness', 'Fine Lines'] },
  'Hyaluronic Acid Serum':   { price: 749, concern: ['Dryness', 'Fine Lines', 'Dullness'] },
  'Retinol Night Cream':     { price: 999, concern: ['Fine Lines', 'Pigmentation', 'Dullness'] },
  'Collagen Booster':        { price: 1299, concern: ['Fine Lines', 'Dryness'] },
  'Calming Serum':           { price: 849, concern: ['Redness', 'Irritation', 'Sensitive'] },
  'Centella Cream':          { price: 599, concern: ['Redness', 'Irritation'] },
  'Gentle Cleanser':         { price: 349, concern: ['Redness', 'Sensitive', 'Dry'] },
  'Keratin Hair Mask':       { price: 899, concern: ['Hairfall', 'Damage', 'Frizz'] },
  'Scalp Serum 50ml':        { price: 899, concern: ['Hairfall', 'Dandruff', 'Scalp'] },
  'Hair Growth Oil':         { price: 699, concern: ['Hairfall', 'Thinning'] },
  'Kojic Acid Cream':        { price: 749, concern: ['Pigmentation', 'Dark Spots'] },
  'SPF 50 Sunscreen':        { price: 549, concern: ['All', 'Sun Protection'] },
  'Exfoliating Scrub':       { price: 449, concern: ['Dullness', 'Rough Texture'] },
}

export async function POST(req: NextRequest) {
  try {
    const { name, skinType, concerns, source, specialistRoutine } = await req.json()

    // Build product recommendations from catalog based on concerns
    const matchedProducts = Object.entries(CATALOG)
      .filter(([, v]) => v.concern.some(c => (concerns || []).includes(c) || c === 'All'))
      .sort((a, b) => {
        const aMatch = a[1].concern.filter(c => (concerns || []).includes(c)).length
        const bMatch = b[1].concern.filter(c => (concerns || []).includes(c)).length
        return bMatch - aMatch
      })
      .slice(0, 4)
      .map(([name, v]) => ({ name, price: v.price }))

    // If specialist added products to routine, prioritize those
    const routineProducts = specialistRoutine || []
    const allProducts = [...routineProducts.map((p: string) => ({ name: p, price: CATALOG[p]?.price || 799 })), ...matchedProducts.filter(p => !routineProducts.includes(p.name))].slice(0, 4)

    const totalValue = allProducts.reduce((s, p) => s + p.price, 0)

    // Generate AI pitch
    const prompt = `You are Riya, an expert sales agent for Rabt Naturals — Indian skincare/haircare brand.

Customer Details:
- Name: ${name}
- Skin Type: ${skinType || 'Normal'}
- Main Concerns: ${(concerns || []).join(', ') || 'General skincare'}
- Source: ${source === 'skin_profile' ? 'Completed skin profile on website' : source === 'specialist_routine' ? 'Specialist created their skincare routine' : 'Direct inquiry'}
${routineProducts.length > 0 ? `- Specialist-recommended products in routine: ${routineProducts.join(', ')}` : ''}

Recommended Products:
${allProducts.map((p, i) => `${i + 1}. ${p.name} — ₹${p.price}`).join('\n')}

Write a SHORT, personalized WhatsApp-style sales pitch (3-4 sentences max) in Hinglish:
1. Address them by name warmly
2. Mention their specific concern
3. Recommend the TOP product with ONE key benefit
4. Soft CTA (not pushy)

Keep it conversational, warm, like a friend recommending — not a salesperson.`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const pitch = msg.content[0].type === 'text' ? msg.content[0].text : ''

    return NextResponse.json({
      pitch,
      products: allProducts.map(p => p.name),
      productDetails: allProducts,
      totalValue,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
