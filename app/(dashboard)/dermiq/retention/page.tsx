'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6',
  orange: '#F97316',
}

const COHORTS = [
  { week: 'Week 1 (Mar 17–23)', users: 284, w2: 68, w4: 45, purchased: 31, retained: 28 },
  { week: 'Week 2 (Mar 10–16)', users: 312, w2: 72, w4: 49, purchased: 38, retained: 35 },
  { week: 'Week 3 (Mar 3–9)', users: 298, w2: 65, w4: 42, purchased: 35, retained: 31 },
  { week: 'Week 4 (Feb 24–Mar 2)', users: 321, w2: 74, w4: 52, purchased: 41, retained: 37 },
  { week: 'Week 5 (Feb 17–23)', users: 267, w2: 61, w4: 38, purchased: 29, retained: 26 },
  { week: 'Week 6 (Feb 10–16)', users: 344, w2: 78, w4: 56, purchased: 46, retained: 42 },
  { week: 'Week 7 (Feb 3–9)', users: 289, w2: 69, w4: 47, purchased: 33, retained: 30 },
]

const TOP_USERS = [
  { rank: 1, medal: '🥇', name: 'Aisha P.', concern: 'Acne', progress: 78, weeks: 6 },
  { rank: 2, medal: '🥈', name: 'Rahul S.', concern: 'Dark spots', progress: 65, weeks: 4 },
  { rank: 3, medal: '🥉', name: 'Priya K.', concern: 'Oily skin', progress: 59, weeks: 5 },
  { rank: 4, medal: '4️⃣', name: 'Neha M.', concern: 'Dryness', progress: 51, weeks: 3 },
  { rank: 5, medal: '5️⃣', name: 'Zara T.', concern: 'Hyperpigmentation', progress: 47, weeks: 4 },
]

const REORDER_USERS = [
  { name: 'Neha G.', product: 'HA Serum 30ml', lastBought: 'Jan 15', finishDate: 'Mar 15', daysLeft: 0 },
  { name: 'Zara K.', product: 'Vitamin C 30ml', lastBought: 'Feb 10', finishDate: 'Apr 10', daysLeft: 18 },
  { name: 'Aryan M.', product: 'Moisturiser 50g', lastBought: 'Feb 20', finishDate: 'Apr 5', daysLeft: 13 },
  { name: 'Priya S.', product: 'SPF 50 30ml', lastBought: 'Feb 1', finishDate: 'Apr 1', daysLeft: 9 },
  { name: 'Dev R.', product: 'Niacinamide 50ml', lastBought: 'Jan 28', finishDate: 'Mar 28', daysLeft: 5 },
]

const WINBACK = [
  { days: '30 days', users: 380, campaign: '"We miss you" campaign', recovery: '12%', color: C.gold, message: 'Hey {name}, we noticed you haven\'t visited in a while. Your skin routine is waiting for you!' },
  { days: '60 days', users: 210, campaign: '"Here\'s 20% off" campaign', recovery: '8%', color: C.orange, message: 'It\'s been 2 months, {name}. Here\'s an exclusive 20% discount just for you. Use code: COMEBACK20' },
  { days: '90+ days', users: 95, campaign: '"Final offer" campaign', recovery: '5%', color: C.red, message: 'We\'ve saved your last routine analysis. This is our best offer — 30% off + free consultation. Don\'t miss out, {name}.' },
]

const Btn = ({ children, color = C.teal, onClick }: any) => (
  <button onClick={onClick} style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, background: color + '15', color, border: `1px solid ${color}30`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
    {children}
  </button>
)

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg }}>
    <span style={{ fontSize: 13 }}>{label}</span>
    <div onClick={onChange} style={{ width: 40, height: 22, borderRadius: 20, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', background: value ? `linear-gradient(90deg,${C.teal},${C.teal2})` : '#E5E7EB' }}>
      <div style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 3, left: value ? 21 : 3, transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  </div>
)

export default function RetentionPage() {
  const [tab, setTab] = useState(0)
  const [progressSettings, setProgressSettings] = useState({ checkins: true, whatsapp: true, email: false })
  const [cadence, setCadence] = useState('Weekly')
  const [sentReminders, setSentReminders] = useState<number[]>([])

  const tabs = ['Weekly Tracking', 'Progress Reports', 'Reorder Reminders', 'Win-Back Campaigns']

  function sendReminder(name: string, idx: number) {
    setSentReminders(s => [...s, idx])
    toast.success(`Reminder sent to ${name}`)
  }

  function sendBulk() {
    toast.success('Bulk reminder sent to 1,248 at-risk users')
  }

  function launchCampaign(days: string) {
    toast.success(`Campaign launched for ${days} inactive users`)
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.dark }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${C.teal},${C.teal2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔁</div>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: C.dark, margin: 0 }}>Retention System</h1>
            <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>Track users, send reminders, drive repurchases</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{ padding: '9px 18px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: tab === i ? 700 : 500, color: tab === i ? C.teal : C.mu, background: 'none', border: 'none', borderBottom: tab === i ? `2px solid ${C.teal}` : '2px solid transparent', cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap' }}>{t}</button>
        ))}
      </div>

      {/* ── Tab 1: Weekly Tracking ── */}
      {tab === 0 && (
        <div>
          {/* Cohort Table */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 22 }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700 }}>User Cohort Retention</div>
              <div style={{ fontSize: 12, color: C.mu, marginTop: 3 }}>7-week rolling cohort analysis</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {['Week', 'New Users', 'Returned W2', 'Returned W4', 'Purchased', 'Retained'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.mu, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COHORTS.map((c, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{c.week}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>{c.users}</td>
                      <td style={{ padding: '12px 16px' }}><PctBar val={c.w2} /></td>
                      <td style={{ padding: '12px 16px' }}><PctBar val={c.w4} /></td>
                      <td style={{ padding: '12px 16px' }}><PctBar val={c.purchased} color={C.teal} /></td>
                      <td style={{ padding: '12px 16px' }}><PctBar val={c.retained} color={C.green} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Retention Trend */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, marginBottom: 22 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Retention Trend</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
              {COHORTS.slice().reverse().map((c, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 10, color: C.teal, fontWeight: 700 }}>{c.retained}%</div>
                  <div style={{ width: '100%', borderRadius: '5px 5px 0 0', background: `linear-gradient(180deg,${C.teal},${C.teal2}88)`, height: `${c.retained * 2.5}px`, minHeight: 6 }} />
                  <div style={{ fontSize: 9, color: C.mu, textAlign: 'center' }}>W{7 - i}</div>
                </div>
              ))}
            </div>
          </div>

          {/* At-risk users */}
          <div style={{ background: C.red + '08', border: `1px solid ${C.red}30`, borderRadius: 16, padding: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>At-Risk Users</div>
              <div style={{ fontSize: 13, color: C.mu }}>Users who completed skin analysis but haven't purchased in <strong>30+ days</strong></div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: C.red, marginTop: 8 }}>1,248 users</div>
            </div>
            <button onClick={sendBulk} style={{ padding: '12px 24px', background: C.red, color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Send Bulk Reminder
            </button>
          </div>
        </div>
      )}

      {/* ── Tab 2: Progress Reports ── */}
      {tab === 1 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 22 }}>
            {/* Settings */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Report Settings</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                <Toggle label="Enable weekly progress check-ins" value={progressSettings.checkins} onChange={() => setProgressSettings(s => ({ ...s, checkins: !s.checkins }))} />
                <Toggle label="Send progress report via WhatsApp" value={progressSettings.whatsapp} onChange={() => setProgressSettings(s => ({ ...s, whatsapp: !s.whatsapp }))} />
                <Toggle label="Send progress report via Email" value={progressSettings.email} onChange={() => setProgressSettings(s => ({ ...s, email: !s.email }))} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>Report Cadence</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Weekly', 'Bi-weekly', 'Monthly'].map(opt => (
                    <button key={opt} onClick={() => setCadence(opt)} style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${cadence === opt ? C.teal : C.border}`, background: cadence === opt ? C.teal + '15' : '#fff', color: cadence === opt ? C.teal : C.mu, fontSize: 13, fontWeight: cadence === opt ? 700 : 400, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>{opt}</button>
                  ))}
                </div>
              </div>
              <button onClick={() => toast.success('Report settings saved')} style={{ padding: '10px 22px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save Settings</button>
            </div>

            {/* Template Preview */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Report Template Preview</div>
              <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.teal},${C.teal2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>🌿</div>
                  <div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 14, fontWeight: 700 }}>Week 3 Update for {'{name}'}</div>
                    <div style={{ fontSize: 11, color: C.mu }}>DermIQ Progress Report · {cadence}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: C.dark }}>
                  Your skin <strong style={{ color: C.green }}>hydration improved 12%</strong> this week. Keep using the Hyaluronic Acid serum.
                </div>
                <div style={{ marginTop: 12, padding: '10px 14px', background: C.teal + '10', borderRadius: 10, border: `1px solid ${C.teal}30` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginBottom: 4 }}>RECOMMENDED NEXT STEP</div>
                  <div style={{ fontSize: 13 }}>Add Vitamin C to your morning routine for enhanced brightening effect.</div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <div style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: C.teal + '15', color: C.teal, fontWeight: 700 }}>Hydration: +12%</div>
                  <div style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: C.green + '15', color: C.green, fontWeight: 700 }}>Texture: +8%</div>
                  <div style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: C.gold + '15', color: C.gold, fontWeight: 700 }}>3 weeks active</div>
                </div>
              </div>
            </div>
          </div>

          {/* Top improving users */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Top Improving Users</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TOP_USERS.map((u, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.border}`, background: i === 0 ? C.gold + '08' : C.bg }}>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>{u.medal}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: C.mu }}>{u.concern} · {u.weeks} weeks active</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: C.green }}>{u.progress}%</div>
                    <div style={{ fontSize: 10, color: C.mu }}>improvement</div>
                  </div>
                  <div style={{ width: 80 }}>
                    <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                      <div style={{ width: `${u.progress}%`, height: '100%', background: `linear-gradient(90deg,${C.teal},${C.green})`, borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Reorder Reminders ── */}
      {tab === 2 && (
        <div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
            {[
              { label: 'Reminders Sent', value: '1,240', color: C.teal },
              { label: 'Open Rate', value: '68%', color: C.blue },
              { label: 'Click Rate', value: '32%', color: C.gold },
              { label: 'Conversion', value: '18%', color: C.green },
            ].map((s, i) => (
              <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.mu, marginTop: 3 }}>{s.label} this month</div>
              </div>
            ))}
          </div>

          {/* Reorder Table */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 22 }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700 }}>Smart Reorder Detection</div>
                <div style={{ fontSize: 12, color: C.mu, marginTop: 2 }}>Based on product size & usage patterns</div>
              </div>
              <button onClick={() => toast.success('Bulk reminders scheduled')} style={{ padding: '9px 18px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Send All Reminders</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {['User', 'Product', 'Last Bought', 'Est. Finish', 'Days Left', 'Action'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.mu, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {REORDER_USERS.map((u, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.mu }}>{u.product}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.mu }}>{u.lastBought}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.mu }}>{u.finishDate}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: u.daysLeft === 0 ? C.red + '15' : u.daysLeft < 10 ? C.orange + '15' : C.gold + '15', color: u.daysLeft === 0 ? C.red : u.daysLeft < 10 ? C.orange : C.gold }}>
                          {u.daysLeft === 0 ? 'OVERDUE' : `${u.daysLeft}d`}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {sentReminders.includes(i) ? (
                          <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>✓ Sent</span>
                        ) : u.daysLeft === 0 ? (
                          <Btn color={C.red} onClick={() => sendReminder(u.name, i)}>Send Reminder</Btn>
                        ) : (
                          <Btn color={C.teal} onClick={() => sendReminder(u.name, i)}>Schedule</Btn>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ padding: '12px 18px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12, color: C.mu }}>
            Last bulk reminder sent: <strong style={{ color: C.dark }}>Today, 10:30 AM</strong> · Next scheduled: <strong style={{ color: C.teal }}>Mar 25, 9:00 AM</strong>
          </div>
        </div>
      )}

      {/* ── Tab 4: Win-Back Campaigns ── */}
      {tab === 3 && (
        <div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Win-Back Segments</div>
            <div style={{ fontSize: 13, color: C.mu }}>Re-engage users who have gone inactive across three time windows</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {WINBACK.map((w, i) => (
              <div key={i} style={{ background: '#fff', border: `1px solid ${w.color}30`, borderRadius: 16, padding: 24, borderLeft: `4px solid ${w.color}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: w.color }}>{w.users}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{w.days} inactive</div>
                        <div style={{ fontSize: 11, color: C.mu }}>{w.campaign}</div>
                      </div>
                    </div>
                    <div style={{ background: C.bg, borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.6, color: C.dark, border: `1px solid ${C.border}`, marginBottom: 12, fontStyle: 'italic' }}>
                      "{w.message}"
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ fontSize: 12, color: C.mu }}>Expected recovery rate:</div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: w.color }}>{w.recovery}</span>
                      <div style={{ fontSize: 12, color: C.mu, marginLeft: 8 }}>Last activity:</div>
                      <span style={{ fontSize: 12, color: C.dark }}>{w.days.replace(' inactive', '')} ago</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => launchCampaign(w.days)} style={{ padding: '11px 22px', background: w.color, color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
                      Launch Campaign
                    </button>
                    <button onClick={() => toast.success('Campaign preview opened')} style={{ padding: '9px 22px', background: '#fff', color: w.color, border: `1px solid ${w.color}40`, borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PctBar({ val, color = '#8B5CF6' }: { val: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ width: 50, height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: `${val}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{val}%</span>
    </div>
  )
}
