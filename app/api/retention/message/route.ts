import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'



export async function POST(req: NextRequest) {
  try {
    const { customer } = await req.json()

    const discountCode = customer.riskLevel === 'critical' ? 'COME15' : customer.riskLevel === 'high' ? 'BACK10' : 'RETURN05'
    const discountPct = customer.riskLevel === 'critical' ? '15%' : customer.riskLevel === 'high' ? '10%' : '5%'

    const prompt = `You are Riya, Rabt Naturals ki friendly sales agent. Write a WhatsApp win-back message for this customer.

Customer Details:
- Name: ${customer.name}
- Last purchase: ${customer.daysSince} days ago (${customer.lastPurchase})
- Previous products: ${customer.topProducts?.join(', ')}
- Total orders: ${customer.totalOrders}
- Total spent: ₹${customer.totalSpent}
- Risk level: ${customer.riskLevel}

Discount to offer: ${discountPct} off (code: ${discountCode})

Write a short, warm WhatsApp message (3-4 sentences) in Hinglish:
1. Address them by first name warmly
2. Mention how long it's been (${customer.daysSince} days) naturally, not accusingly
3. Reference one of their previous products
4. Offer the discount code
5. Soft CTA — link to rabtnaturals.com

Tone: Like a friend checking in, NOT desperate salesperson. Natural, warm, personal.`

    const anthropic = await getAnthropicClient()
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const message = msg.content[0].type === 'text' ? msg.content[0].text : ''
    return NextResponse.json({ message })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
