import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { message, history, customerName } = await req.json()

    const systemPrompt = `You are Riya, Rabt Naturals ki friendly WhatsApp AI sales assistant. Rabt Naturals ek Indian clean beauty brand hai (rabtnaturals.com) jo skincare aur haircare products sell karta hai.

Customer ka naam: ${customerName || 'Customer'}

Tumhara kaam:
1. Customer ki skin/hair concern samjho
2. Unhe appropriate products recommend karo (Rabt Naturals catalog se)
3. Orders lene mein help karo
4. Payment links bhejo (format: rabtnaturals.com/buy/[product])
5. Free consultation offer karo

Product Catalog:
- Glow Serum 30ml — ₹899 (dark spots, dullness)
- Vitamin C Serum — ₹799 (pigmentation, glow)
- Niacinamide Toner — ₹499 (acne, oily skin)
- Salicylic Acid Serum — ₹649 (acne, blackheads)
- Clay Mask — ₹449 (acne, oily T-zone)
- Hydrating Cream — ₹699 (dryness)
- Hyaluronic Acid Serum — ₹749 (dryness, fine lines)
- Retinol Night Cream — ₹999 (anti-aging)
- Calming Serum — ₹849 (redness, sensitive)
- SPF 50 Sunscreen — ₹549 (all skin types)
- Keratin Hair Mask — ₹899 (hairfall, damage)
- Scalp Serum — ₹899 (dandruff, hairfall)

Rules:
- Hinglish mein baat karo (natural Hindi-English mix)
- Friendly raho — dost ki tarah, salesperson ki tarah nahi
- Agar interested hain toh order link do
- Agar questions hain toh honestly jawab do
- 2-3 sentences mein raho mostly, concise rehna
- Emojis use karo naturally 🌿`

    const messages = [
      ...(history || []).map((m: any) => ({
        role: m.role === 'ai' ? 'assistant' : 'user' as 'assistant' | 'user',
        content: m.text,
      })),
      { role: 'user' as const, content: message },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages,
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : 'Main samajh nahi payi — please dobara batayein 😊'
    return NextResponse.json({ reply })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
