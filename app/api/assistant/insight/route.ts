import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Fetch quick snapshot
    const [{ data: tasks }, { data: calls }] = await Promise.all([
      supabase.from('rabt_tasks').select('status, priority, area, due_date').limit(50),
      supabase.from('rabt_call_logs').select('status, call_type, created_at').limit(20),
    ])

    const taskArr = tasks || []
    const callArr = calls || []

    const urgent = taskArr.filter((t: any) => t.priority === 'urgent' && t.status !== 'done').length
    const blocked = taskArr.filter((t: any) => t.status === 'blocked').length
    const done = taskArr.filter((t: any) => t.status === 'done').length
    const overdue = taskArr.filter((t: any) => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()).length

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

    const prompt = `You are the AI assistant for Rabt Naturals HQ. Give a concise daily insight (3-4 sentences) for the founder/admin.

Data snapshot for ${today}:
- Tasks: ${taskArr.length} total, ${done} done, ${urgent} urgent, ${blocked} blocked, ${overdue} overdue
- Recent calls: ${callArr.length} logged

Write a brief, direct insight like a smart COO would give — what needs attention today, what's going well, and one specific action to take. Keep it under 100 words. No bullet points, just natural paragraphs.`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const insight = msg.content[0].type === 'text' ? msg.content[0].text : ''
    return NextResponse.json({ insight })
  } catch (e) {
    return NextResponse.json({ insight: 'Unable to generate insight at this time.' })
  }
}
