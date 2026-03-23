import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAnthropicClient } from '@/lib/anthropic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)



// Vapi sends webhooks for: call-started, call-ended, transcript, hang, speech-update
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      message: {
        type: string
        call?: {
          id: string
          status?: string
          endedReason?: string
          duration?: number
          transcript?: string
          recordingUrl?: string
        }
        transcript?: string
        artifact?: { transcript?: string; recordingUrl?: string }
      }
    }

    const { message } = body
    if (!message) return NextResponse.json({ ok: true })

    const callId = message.call?.id
    if (!callId) return NextResponse.json({ ok: true })

    // Find log row by vapi_call_id
    const { data: logRow } = await supabase
      .from('rabt_call_logs')
      .select('*')
      .eq('vapi_call_id', callId)
      .single()

    if (!logRow) return NextResponse.json({ ok: true })

    if (message.type === 'call-started') {
      await supabase.from('rabt_call_logs').update({ status: 'in_progress' }).eq('id', logRow.id)
    }

    if (message.type === 'call-ended') {
      const transcript = message.artifact?.transcript || message.call?.transcript || null
      const durationSeconds = message.call?.duration ? Math.round(message.call.duration) : null
      const recordingUrl = message.artifact?.recordingUrl || null

      // Generate AI summary of the call
      let summary: string | null = null
      if (transcript) {
        try {
          const summaryMsg = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            messages: [{
              role: 'user',
              content: `Yeh ek Rabt Naturals AI calling agent ki call ka transcript hai. 2-3 sentences mein summarize karo: kya discuss hua, kya customer/specialist ne respond kiya, aur koi important details (address, reschedule request, confirmation, etc.). Hinglish mein likh sakte ho.\n\nTranscript:\n${transcript.slice(0, 2000)}`,
            }],
          })
          summary = summaryMsg.content[0].type === 'text' ? summaryMsg.content[0].text : null
        } catch { /* skip summary */ }
      }

      const endedReason = message.call?.endedReason
      const status = endedReason === 'customer-did-not-answer' || endedReason === 'no-answer'
        ? 'no_answer'
        : endedReason === 'error' || endedReason === 'failed'
        ? 'failed'
        : 'completed'

      await supabase.from('rabt_call_logs').update({
        status,
        duration_seconds: durationSeconds,
        transcript,
        summary,
        recording_url: recordingUrl,
        ended_at: new Date().toISOString(),
      }).eq('id', logRow.id)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Calling webhook error:', e)
    return NextResponse.json({ ok: true })
  }
}
