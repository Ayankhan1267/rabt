import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { customers, messages } = await req.json()
    const results = []

    for (const customer of customers) {
      let msg = messages[customer.id]

      // Generate message if not pre-generated
      if (!msg) {
        const discountCode = customer.riskLevel === 'critical' ? 'COME15' : 'BACK10'
        const discountPct = customer.riskLevel === 'critical' ? '15%' : '10%'

        const res = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 180,
          messages: [{
            role: 'user',
            content: `Write a short WhatsApp win-back message in Hinglish for ${customer.name} who hasn't bought in ${customer.daysSince} days. Their fav product: ${customer.topProducts?.[0]}. Offer ${discountPct} off code ${discountCode}. 3 sentences max. Warm, friendly.`,
          }],
        })
        msg = res.content[0].type === 'text' ? res.content[0].text : ''
      }

      // Send via WhatsApp
      try {
        const waRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://rabt-hq.onrender.com'}/api/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: customer.phone, message: msg }),
        })
        results.push({ id: customer.id, sent: waRes.ok })
      } catch {
        results.push({ id: customer.id, sent: false })
      }

      // Log to Supabase
      await supabase.from('rabt_retention_logs').insert({
        customer_phone: customer.phone,
        customer_name: customer.name,
        message: msg,
        risk_level: customer.riskLevel,
        days_since_purchase: customer.daysSince,
      }).catch(() => { /* table may not exist yet */ })
    }

    return NextResponse.json({ success: true, sent: results.filter(r => r.sent).length, total: customers.length })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
