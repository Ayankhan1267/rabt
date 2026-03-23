import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getConfig } from '@/lib/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Build the system prompt per call type ─────────────────────────────────
function buildSystemPrompt(callType: string, params: Record<string, string>, language: string): string {
  const langNote = language === 'hinglish'
    ? 'Hinglish me baat karo — Hindi aur English ka natural mix, jaise Dilli/Mumbai ke log baat karte hain.'
    : language === 'hindi'
    ? 'Pure Hindi me baat karo, Devanagari script nahi, Roman script mein bolte waqt Hindi.'
    : 'Speak in clear, friendly English.'

  const base = `You are Riya, a friendly and professional AI calling agent for Rabt Naturals — an Indian skincare and haircare brand. ${langNote} Be warm, concise, and always end with asking if the person has any questions. Never make up information. If unsure, say you will have a team member follow up.`

  switch (callType) {
    case 'specialist_alert':
      return `${base}

You are calling Dr./Specialist ${params.toName}.
Purpose: Inform them that a NEW CONSULTATION request has come in.
Customer: ${params.customerName || 'Ek naya customer'}
Consultation ID: ${params.consultationId || 'N/A'}

Script:
1. Greet the specialist by name
2. Inform: "Aapke liye ek naya consultation request aaya hai — ${params.customerName || 'ek customer'} ne skin analysis ke baad appointment book kiya hai."
3. Ask if they are available and can accept it
4. If yes → confirm and say the HQ panel pe details mil jayengi
5. If no → ask when they will be available and note it down
6. Thank them and end the call`

    case 'order_confirmation':
      return `${base}

You are calling customer ${params.toName}.
Purpose: Confirm their recent order and collect delivery details.
Order ID: ${params.orderId || 'recent order'}
Product: ${params.productName || 'Rabt Naturals product'}

Script:
1. Greet the customer warmly
2. Confirm: "Aapka order ${params.orderId ? '#' + params.orderId : ''} receive ho gaya hai — ${params.productName || 'aapka product'} ke liye."
3. Confirm delivery address — ask them to confirm or give an updated address
4. Ask payment preference if not already set (UPI / COD)
5. Give estimated delivery timeline (3-5 business days)
6. Ask if they have any questions
7. End warmly: "Rabt Naturals choose karne ke liye shukriya!"`

    case 'appointment_reminder':
      return `${base}

You are calling customer ${params.toName}.
Purpose: Remind them about their upcoming consultation appointment.
Appointment: ${params.appointmentDate || 'kal'} at ${params.appointmentTime || 'scheduled time'}
Specialist: ${params.specialistName || 'Rabt specialist'}

Script:
1. Greet the customer
2. Remind: "Aapka skin consultation appointment ${params.specialistName ? params.specialistName + ' ke saath ' : ''}${params.appointmentDate ? params.appointmentDate + ' ko ' : 'kal '}${params.appointmentTime ? params.appointmentTime + ' baje' : 'scheduled time pe'} hai."
3. Ask: "Kya aap confirm kar sakte hain ki aap available rahenge?"
4. If confirmed → say great, they will receive a WhatsApp reminder too
5. If needs to reschedule → take their preferred time and say team will call back
6. Remind them to be ready with their skin concerns/questions`

    case 'appointment_confirmation':
      return `${base}

You are calling customer ${params.toName}.
Purpose: Final confirmation of appointment happening in ~2 hours.
Appointment: ${params.appointmentDate || 'aaj'} at ${params.appointmentTime || 'scheduled time'}
Specialist: ${params.specialistName || 'Rabt specialist'}

Script:
1. Greet the customer
2. Confirm: "Aapka appointment aaj ${params.appointmentTime ? params.appointmentTime + ' baje' : 'thodi der mein'} hai ${params.specialistName ? params.specialistName + ' ke saath' : ''}."
3. Ask: "Kya aap abhi bhi available hain?"
4. If yes → confirm and say the specialist will call/connect at that time
5. If no or needs to cancel → take details, say team will reschedule
6. End warmly`

    default:
      return base
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      callType, toName, toPhone, toRole,
      consultationId, orderId, appointmentDate, appointmentTime,
      specialistName, productName, customerName,
    } = body

    if (!toPhone || !toName || !callType) {
      return NextResponse.json({ error: 'toPhone, toName, callType required' }, { status: 400 })
    }

    const language = 'hinglish' // could be made configurable

    const systemPrompt = buildSystemPrompt(callType, {
      toName, consultationId, orderId, appointmentDate,
      appointmentTime, specialistName, productName, customerName,
    }, language)

    // ── Create call log in DB first ───────────────────────────────────────
    const { data: logRow } = await supabase
      .from('rabt_call_logs')
      .insert({
        call_type: callType,
        to_name: toName,
        to_phone: toPhone,
        to_role: toRole || 'customer',
        status: 'queued',
        context: { consultationId, orderId, appointmentDate, appointmentTime, specialistName, productName, customerName },
      })
      .select()
      .single()

    // ── Trigger Vapi outbound call ────────────────────────────────────────
    const cfg = await getConfig()
    const vapiKey = cfg.VAPI_API_KEY
    let vapiCallId: string | null = null

    if (vapiKey) {
      try {
        const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${vapiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumberId: cfg.VAPI_PHONE_NUMBER_ID,
            customer: {
              number: toPhone,
              name: toName,
            },
            assistant: {
              name: 'Riya — Rabt Naturals',
              model: {
                provider: 'anthropic',
                model: 'claude-haiku-4-5-20251001',
                systemPrompt,
                maxTokens: 500,
                temperature: 0.7,
              },
              voice: {
                provider: 'elevenlabs',
                voiceId: cfg.ELEVENLABS_VOICE_ID || 'en-IN-NeerjaExpressiveNeural',
              },
              firstMessage: callType === 'specialist_alert'
                ? `Namaste Dr. ${toName.split(' ').pop()}, main Riya bol rahi hoon Rabt Naturals HQ se. Kya aap abhi baat kar sakte hain?`
                : `Namaste ${toName.split(' ')[0]} ji, main Riya bol rahi hoon Rabt Naturals ki taraf se. Kya aap abhi thoda time de sakte hain?`,
              endCallMessage: 'Bahut shukriya aapka samay dene ke liye. Rabt Naturals ki taraf se aapka din achha ho!',
              recordingEnabled: true,
              serverUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://rabt-hq.onrender.com'}/api/calling/webhook`,
            },
          }),
        })

        if (vapiRes.ok) {
          const vapiData = await vapiRes.json() as { id?: string }
          vapiCallId = vapiData.id || null
        }
      } catch (e) {
        console.error('Vapi call failed:', e)
      }
    }

    // Update log with vapi call id and status
    if (logRow) {
      await supabase
        .from('rabt_call_logs')
        .update({
          vapi_call_id: vapiCallId,
          status: vapiCallId ? 'ringing' : (vapiKey ? 'failed' : 'queued'),
        })
        .eq('id', logRow.id)
    }

    return NextResponse.json({
      success: true,
      callId: logRow?.id,
      vapiCallId,
      simulated: !vapiKey,
      message: vapiKey ? 'Call started via Vapi' : 'VAPI_API_KEY not set — call logged only',
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
