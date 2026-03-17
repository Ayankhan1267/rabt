'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const CATEGORIES = ['Finance', 'Marketing', 'Operations', 'Specialist', 'Content', 'Customer', 'Automation', 'General']

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editGoal, setEditGoal] = useState<any>(null)
  const [form, setForm] = useState({ title: '', description: '', target_value: '', current_value: '0', unit: '', category: 'Finance', owner_id: '', start_date: '', end_date: '', status: 'active' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [goalsRes, profilesRes] = await Promise.all([
      supabase.from('goals').select('*, owner_id(id,name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ])
    setGoals(goalsRes.data || [])
    setProfiles(profilesRes.data || [])
  }

  async function saveGoal() {
    if (!form.title || !form.target_value) { toast.error('Fill required fields'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const data = {
      title: form.title, description: form.description,
      target_value: parseFloat(form.target_value), current_value: parseFloat(form.current_value) || 0,
      unit: form.unit, category: form.category, owner_id: form.owner_id || null,
      start_date: form.start_date || null, end_date: form.end_date || null, status: form.status,
      created_by: user?.id,
    }
    if (editGoal) {
      await supabase.from('goals').update(data).eq('id', editGoal.id)
      toast.success('Goal updated!')
    } else {
      await supabase.from('goals').insert(data)
      toast.success('Goal created!')
    }
    setShowAdd(false); setEditGoal(null)
    setForm({ title: '', description: '', target_value: '', current_value: '0', unit: '', category: 'Finance', owner_id: '', start_date: '', end_date: '', status: 'active' })
    loadAll()
  }

  async function updateProgress(id: string, current: number, target: number) {
    const newVal = prompt('Enter current value:', String(current))
    if (!newVal) return
    await supabase.from('goals').update({ current_value: parseFloat(newVal), updated_at: new Date().toISOString() }).eq('id', id)
    toast.success('Progress updated!')
    loadAll()
  }

  async function deleteGoal(id: string) {
    if (!confirm('Delete this goal?')) return
    await supabase.from('goals').delete().eq('id', id)
    toast.success('Deleted')
    loadAll()
  }

  const CAT_COLORS: Record<string, string> = {
    Finance: 'var(--gold)', Marketing: 'var(--blue)', Operations: 'var(--orange)',
    Specialist: 'var(--pink)', Content: 'var(--purple)', Customer: 'var(--teal)',
    Automation: 'var(--green)', General: 'var(--mu)',
  }

  const totalGoals = goals.length
  const completed = goals.filter(g => g.current_value >= g.target_value || g.status === 'completed').length
  const avgProgress = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + Math.min(100, (g.current_value / g.target_value) * 100), 0) / goals.length)
    : 0

  const inputStyle: any = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8,
    padding: '9px 12px', color: 'var(--tx)', fontSize: 13, fontFamily: 'Outfit', outline: 'none', marginBottom: 10
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>Goals & <span style={{ color: 'var(--gold)' }}>OKR</span></h1>
          <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>{totalGoals} goals · {completed} completed · {avgProgress}% avg progress</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
          + New Goal
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Goals', value: totalGoals, color: 'var(--blue)' },
          { label: 'Completed', value: completed, color: 'var(--green)' },
          { label: 'In Progress', value: totalGoals - completed, color: 'var(--orange)' },
          { label: 'Avg Progress', value: `${avgProgress}%`, color: 'var(--gold)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Goals Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {goals.map(goal => {
          const pct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
          const done = pct >= 100
          const color = CAT_COLORS[goal.category] || 'var(--mu)'
          return (
            <div key={goal.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: color + '18', border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {goal.category === 'Finance' ? '💰' : goal.category === 'Marketing' ? '📢' : goal.category === 'Operations' ? '📦' : goal.category === 'Specialist' ? '🌿' : goal.category === 'Content' ? '🎬' : goal.category === 'Customer' ? '⭐' : goal.category === 'Automation' ? '⚙️' : '🎯'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 2 }}>{goal.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--mu)' }}>
                    {goal.owner_id?.name || 'All'} · {goal.category}
                    {goal.end_date && ` · Due ${new Date(goal.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: done ? 'var(--grL)' : 'rgba(255,255,255,0.06)', color: done ? 'var(--green)' : 'var(--mu2)' }}>
                    {done ? '✓ Done' : goal.status}
                  </span>
                </div>
              </div>

              {goal.description && (
                <div style={{ fontSize: 12, color: 'var(--mu2)', marginBottom: 12, lineHeight: 1.4 }}>{goal.description}</div>
              )}

              {/* Progress */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--mu2)' }}>Progress</span>
                  <span style={{ fontSize: 13, fontFamily: 'DM Mono', fontWeight: 800, color }}>
                    {goal.unit === '₹' ? `₹${Number(goal.current_value).toLocaleString('en-IN')}` : goal.current_value}
                    {' / '}
                    {goal.unit === '₹' ? `₹${Number(goal.target_value).toLocaleString('en-IN')}` : goal.target_value} {goal.unit !== '₹' ? goal.unit : ''}
                  </span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 20, height: 7, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: done ? 'var(--green)' : color, borderRadius: 20, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <span style={{ fontSize: 11, fontFamily: 'DM Mono', fontWeight: 700, color: done ? 'var(--green)' : color }}>{pct}%</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 7 }}>
                <button onClick={() => updateProgress(goal.id, goal.current_value, goal.target_value)} style={{ flex: 1, padding: '6px', background: color + '18', border: `1px solid ${color}33`, borderRadius: 7, color, fontSize: 11.5, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                  Update Progress
                </button>
                <button onClick={() => { setEditGoal(goal); setForm({ title: goal.title, description: goal.description || '', target_value: String(goal.target_value), current_value: String(goal.current_value), unit: goal.unit || '', category: goal.category, owner_id: goal.owner_id?.id || '', start_date: goal.start_date || '', end_date: goal.end_date || '', status: goal.status }); setShowAdd(true) }} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 7, color: 'var(--mu2)', fontSize: 11.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
                  Edit
                </button>
                <button onClick={() => deleteGoal(goal.id)} style={{ padding: '6px 10px', background: 'var(--rdL)', border: 'none', borderRadius: 7, color: 'var(--red)', fontSize: 11.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {goals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mu)' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🎯</div>
          <div style={{ fontSize: 14, marginBottom: 8 }}>No goals yet</div>
          <button onClick={() => setShowAdd(true)} style={{ padding: '8px 20px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>Create First Goal →</button>
        </div>
      )}

      {/* Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, padding: '26px 30px', width: 500, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800, marginBottom: 20 }}>{editGoal ? '✏️ Edit Goal' : '🎯 New Goal'}</div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Title*</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Month Revenue Target" style={inputStyle} />
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Description</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Target*</label>
                <input type="number" value={form.target_value} onChange={e => setForm(p => ({ ...p, target_value: e.target.value }))} placeholder="100000" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Current</label>
                <input type="number" value={form.current_value} onChange={e => setForm(p => ({ ...p, current_value: e.target.value }))} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Unit</label>
                <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="₹ / orders / reels" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Owner</label>
                <select value={form.owner_id} onChange={e => setForm(p => ({ ...p, owner_id: e.target.value }))} style={inputStyle}>
                  <option value="">— All Team —</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Start Date</label>
                <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>End Date</label>
                <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={() => { setShowAdd(false); setEditGoal(null) }} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Cancel</button>
              <button onClick={saveGoal} style={{ flex: 1, padding: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>{editGoal ? 'Update' : 'Create Goal'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
