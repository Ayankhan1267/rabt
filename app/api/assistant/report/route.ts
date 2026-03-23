import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { taskStats, teamStats, callLogs, tasks } = await req.json()

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const overdueTasks = (tasks || []).filter((t: any) => {
      if (!t.due_date || t.status === 'done') return false
      return new Date(t.due_date) < new Date()
    })

    const prompt = `You are the AI Assistant Agent for Rabt Naturals — an Indian skincare/haircare brand's HQ operations platform.

Today: ${today}

TEAM DATA:
${JSON.stringify(teamStats, null, 2)}

TASK SUMMARY:
- Total tasks: ${taskStats?.total || 0}
- Completed: ${taskStats?.done || 0}
- Pending: ${taskStats?.pending || 0}
- Blocked: ${taskStats?.blocked || 0}
- Urgent open: ${taskStats?.urgent || 0}
- Overdue: ${overdueTasks.length}

RECENT CALLS (last 5):
${(callLogs || []).map((c: any) => `- ${c.call_type} to ${c.to_name} (${c.to_role}): ${c.status}`).join('\n') || 'No recent calls'}

BLOCKED TASKS:
${(tasks || []).filter((t: any) => t.status === 'blocked').map((t: any) => `- [${t.area}] ${t.title}`).join('\n') || 'None'}

OVERDUE TASKS:
${overdueTasks.map((t: any) => `- [${t.area}] ${t.title} (due: ${t.due_date})`).join('\n') || 'None'}

Generate a daily leadership report in JSON format with this exact structure:
{
  "date": "${today}",
  "summary": "2-3 sentence executive summary of today's operations status",
  "highlights": ["3-4 positive highlights of what is going well"],
  "concerns": ["2-3 specific concerns that need attention"],
  "recommendations": ["3-4 specific, actionable AI recommendations for the founder/admin"],
  "kpis": [
    {"label": "Task Completion", "value": "XX%", "trend": "+X% vs yesterday"},
    {"label": "Calls Made", "value": "X", "trend": "target: 10/day"},
    {"label": "Urgent Items", "value": "X", "trend": "need resolution"}
  ],
  "teamStats": [
    {"name": "team member name", "done": 0, "pending": 0}
  ]
}

Be specific, data-driven, and write like a smart operations manager. Focus on Rabt Naturals business context (skincare brand, consultations, specialists, orders, sales).`

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    let report = null
    if (jsonMatch) {
      try { report = JSON.parse(jsonMatch[0]) } catch { /* fallback */ }
    }

    if (!report) {
      report = {
        date: today,
        summary: text.slice(0, 300),
        highlights: ['Team operations ongoing'],
        concerns: ['Report parsing issue — check data'],
        recommendations: ['Review task assignments', 'Follow up on blocked tasks'],
        kpis: [
          { label: 'Task Completion', value: `${taskStats?.done || 0}/${taskStats?.total || 0}`, trend: '' },
          { label: 'Calls Made', value: String(callLogs?.length || 0), trend: '' },
          { label: 'Urgent Items', value: String(taskStats?.urgent || 0), trend: '' },
        ],
        teamStats: teamStats || [],
      }
    }

    return NextResponse.json({ report })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
