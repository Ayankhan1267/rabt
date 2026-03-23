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
    const { name, phone, skinType, concerns, recommendedProducts, aiPitch, outreachType, specialistRoutine } = await req.json()

    if (!phone) return NextResponse.json({ error: 'Phone number required' }, { status: 400 })

    const topProduct = recommendedProducts?.[0] || 'Glow Serum'
    const topConcern = concerns?.[0] || 'skin care'
    const hasRoutine = specialistRoutine?.length > 0

    // Build sales call script
    const systemPrompt = `You are Riya, a warm and friendly AI sales agent for Rabt Naturals — India ka best personalized skincare/haircare brand.

Speak in Hinglish (natural Hindi-English mix). Be warm, like a helpful friend — NOT a pushy salesperson.

Customer: ${name}
Skin Type: ${skinType || 'Normal'}
Concerns: ${(concerns || []).join(', ')}
${hasRoutine ? `Specialist already created their routine with: ${specialistRoutine.join(', ')}` : ''}
Recommended Products: ${(recommendedProducts || []).join(', ')}
${aiPitch ? `Personalized pitch to use: ${aiPitch}` : ''}

Your goal for this call:
${hasRoutine
  ? `1. Greet warmly and mention specialist ne unka routine banaya hai
2. Explain the products in their routine — kya karte hain, kaise use karein
3. Offer to help place the order right now
4. Handle any questions or concerns
5. Close with order link: rabtnaturals.com/routine`
  : `1. Greet warmly, mention skin profile/analysis completion
2. Mention their specific concern: ${topConcern}
3. Recommend ${topProduct} with ONE key benefit relevant to their concern
4. Offer special first-time discount or free consultation
5. Close: "Kya main aapka order place kar sakti hoon?" or "Main WhatsApp pe link bhejti hoon?"`
}

Rules:
- Never be pushy or desperate
- If they say no, say "No problem! Main WhatsApp pe info bhejti hoon"
- Always offer free skin consultation as fallback
- Keep call under 3 minutes
- If they have questions about ingredients/safety, answer honestly`

    const firstMessage = hasRoutine
      ? `Namaste ${name.split(' ')[0]} ji! Main Riya bol rahi hoon Rabt Naturals se. Aapke specialist ne aapka personalized skincare routine prepare kar diya hai — kya aap abhi thoda time de sakte hain?`
      : `Namaste ${name.split(' ')[0]} ji! Main Riya hoon Rabt Naturals ki taraf se. Aapne abhi apna skin profile complete kiya — bahut achha kiya! Kya aap 2 minute mein baat kar sakte hain?`

    // Log the call
    const { data: logRow } = await supabase.from('rabt_call_logs').insert({
      call_type: 'order_confirmation',
      to_name: name,
      to_phone: phone,
      to_role: 'customer',
      status: 'queued',
      context: { skinType, concerns, recommendedProducts, specialistRoutine, isSalesCall: true },
    }).select().single()

    // Trigger Vapi call
    const vapiKey = process.env.VAPI_API_KEY
    let vapiCallId: string | null = null

    if (vapiKey) {
      try {
        const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
          method: 'POST',
          headers: { Authorization: `Bearer ${vapiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
            customer: { number: phone, name },
            assistant: {
              name: 'Riya — Rabt Sales Agent',
              model: {
                provider: 'anthropic',
                model: 'claude-haiku-4-5-20251001',
                systemPrompt,
                maxTokens: 500,
                temperature: 0.75,
              },
              voice: {
                provider: 'elevenlabs',
                voiceId: process.env.ELEVENLABS_VOICE_ID || 'en-IN-NeerjaExpressiveNeural',
              },
              firstMessage,
              endCallMessage: 'Bahut shukriya! Rabt Naturals aapki skin ki care ke liye hamesha available hai. Take care!',
              recordingEnabled: true,
              serverUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://rabt-hq.onrender.com'}/api/calling/webhook`,
            },
          }),
        })
        if (vapiRes.ok) {
          const vapiData = await vapiRes.json() as { id?: string }
          vapiCallId = vapiData.id || null
        }
      } catch (e) { console.error('Vapi sales call failed:', e) }
    }

    // Also send WhatsApp if requested
    if ((outreachType === 'whatsapp' || outreachType === 'both') && phone) {
      const waMsg = aiPitch || `Namaste ${name.split(' ')[0]} ji! 🌿\n\nAapki skin analysis ke baad humne aapke liye ${topProduct} recommend kiya hai — especially ${topConcern} ke liye.\n\n✨ 10% off aapke pehle order pe: *RABT10*\n\nOrder karo: rabtnaturals.com\n\nKoi bhi question ho toh reply karo! 😊`
      // WhatsApp sending via existing integration
      try {
        await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message: waMsg }),
        })
      } catch { /* WhatsApp optional */ }
    }

    if (logRow) {
      await supabase.from('rabt_call_logs').update({
        vapi_call_id: vapiCallId,
        status: vapiCallId ? 'ringing' : 'queued',
      }).eq('id', logRow.id)
    }

    return NextResponse.json({
      success: true,
      callId: logRow?.id,
      vapiCallId,
      simulated: !vapiKey,
      whatsappSent: outreachType === 'whatsapp' || outreachType === 'both',
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
