'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const COLS = [
  { id: 'todo', label: 'To Do', color: 'var(--blue)', bg: 'var(--blL)' },
  { id: 'progress', label: 'In Progress', color: 'var(--orange)', bg: 'var(--orL)' },
  { id: 'review', label: 'Review', color: 'var(--purple)', bg: 'var(--puL)' },
  { id: 'done', label: 'Done', color: 'var(--green)', bg: 'var(--grL)' },
  { id: 'blocked', label: 'Blocked', color: 'var(--red)', bg: 'var(--rdL)' },
]

const PRIORITIES = ['Urgent', 'High', 'Medium', 'Low']
const PRIORITY_COLORS: Record<string, string> = {
  Urgent: 'var(--red)', High: 'var(--orange)', Medium: 'var(--gold)', Low: 'var(--mu)'
}

export default function KanbanPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addCol, setAddCol] = useState('todo')
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', due_date: '', assigned_to: '', tags: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    const [tasksRes, profilesRes, myProfile] = await Promise.all([
      supabase.from('tasks').select('*, assigned_to(id,name,role)').order('position'),
      supabase.from('profiles').select('*'),
      supabase.from('profiles').select('*').eq('id', user?.id).single(),
    ])
    setProfile(myProfile.data)
    setProfiles(profilesRes.data || [])
    const allTasks = tasksRes.data || []
    const role = myProfile.data?.role
    if (role === 'founder' || role === 'manager') setTasks(allTasks)
    else setTasks(allTasks.filter((t: any) => t.assigned_to?.id === user?.id || t.created_by === user?.id))
  }

  async function addTask() {
    if (!form.title) { toast.error('Enter task title'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').insert({
      title: form.title, description: form.description, priority: form.priority,
      due_date: form.due_date || null, assigned_to: form.assigned_to || null,
      status: addCol, kanban_col: addCol, created_by: user?.id,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      position: tasks.filter(t => t.kanban_col === addCol).length,
    })
    toast.success('Card added!')
    setShowAdd(false)
    setForm({ title: '', description: '', priority: 'Medium', due_date: '', assigned_to: '', tags: '' })
    loadAll()
  }

  async function moveTask(taskId: string, newCol: string) {
    await supabase.from('tasks').update({ kanban_col: newCol, status: newCol, updated_at: new Date().toISOString() }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, kanban_col: newCol, status: newCol } : t))
    toast.success('Card moved!')
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    toast.success('Card deleted')
    loadAll()
  }

  function onDragStart(e: React.DragEvent, taskId: string) {
    setDragging(taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault()
    setDragOver(colId)
  }

  function onDrop(e: React.DragEvent, colId: string) {
    e.preventDefault()
    if (dragging && dragging !== colId) moveTask(dragging, colId)
    setDragging(null)
    setDragOver(null)
  }

  const inputStyle: any = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8,
    padding: '9px 12px', color: 'var(--tx)', fontSize: 13, fontFamily: 'Outfit', outline: 'none', marginBottom: 10
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>Kanban <span style={{ color: 'var(--gold)' }}>Board</span></h1>
          <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>{tasks.length} total cards · Drag to move</p>
        </div>
        <button onClick={() => { setAddCol('todo'); setShowAdd(true) }} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
          + New Card
        </button>
      </div>

      {/* Board */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, minHeight: 500 }}>
        {COLS.map(col => {
          const colTasks = tasks.filter(t => (t.kanban_col || t.status) === col.id)
          return (
            <div key={col.id} style={{ minWidth: 250, flexShrink: 0 }}
              onDragOver={e => onDragOver(e, col.id)}
              onDrop={e => onDrop(e, col.id)}
            >
              {/* Column Header */}
              <div style={{
                padding: '9px 13px', borderRadius: '10px 10px 0 0',
                background: dragOver === col.id ? col.bg : col.bg,
                border: `1px solid ${col.color}33`, borderBottom: 'none',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: dragOver === col.id ? `0 0 0 2px ${col.color}` : 'none',
                transition: 'box-shadow 0.15s'
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <span style={{ fontWeight: 700, fontSize: 12, color: col.color, flex: 1 }}>{col.label}</span>
                <span style={{ fontSize: 10, fontFamily: 'DM Mono', background: 'rgba(255,255,255,0.15)', color: col.color, padding: '1px 7px', borderRadius: 20 }}>{colTasks.length}</span>
                <button onClick={() => { setAddCol(col.id); setShowAdd(true) }}
                  style={{ background: 'none', border: 'none', color: col.color, cursor: 'pointer', fontSize: 16, lineHeight: 1, opacity: 0.7 }}>+</button>
              </div>

              {/* Cards */}
              <div style={{
                background: dragOver === col.id ? col.bg : 'var(--s2)',
                border: `1px solid ${dragOver === col.id ? col.color + '55' : 'var(--b1)'}`,
                borderTop: 'none', borderRadius: '0 0 10px 10px',
                minHeight: 400, padding: 8, transition: 'all 0.15s'
              }}>
                {colTasks.map(task => (
                  <div key={task.id}
                    draggable
                    onDragStart={e => onDragStart(e, task.id)}
                    style={{
                      background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 10,
                      padding: '12px 13px', marginBottom: 8, cursor: 'grab',
                      opacity: dragging === task.id ? 0.5 : 1,
                      transform: dragging === task.id ? 'rotate(2deg)' : 'none',
                      transition: 'all 0.13s', position: 'relative', overflow: 'hidden'
                    }}
                    onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--b2)')}
                    onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--b1)')}
                  >
                    {/* Priority bar */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: PRIORITY_COLORS[task.priority] || 'var(--mu)', borderRadius: '3px 0 0 3px' }} />

                    <div style={{ paddingLeft: 8 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.45, marginBottom: 8 }}>{task.title}</div>

                      {task.description && (
                        <div style={{ fontSize: 11.5, color: 'var(--mu)', marginBottom: 8, lineHeight: 1.4 }}>{task.description}</div>
                      )}

                      {task.tags?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                          {task.tags.map((tag: string, i: number) => (
                            <span key={i} style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', color: 'var(--mu2)', fontWeight: 600 }}>{tag}</span>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: PRIORITY_COLORS[task.priority] + '22', color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
                          {task.due_date && (
                            <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: new Date(task.due_date) < new Date() ? 'var(--red)' : 'var(--mu)' }}>{task.due_date}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {task.assigned_to?.name && (
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#08090C' }}>
                              {task.assigned_to.name.charAt(0)}
                            </div>
                          )}
                          <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer', fontSize: 12, opacity: 0.5, padding: 2 }}>✕</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                 <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--mu)', fontSize: 12, cursor: 'pointer' }} onClick={() => { setAddCol(col.id); setShowAdd(true) }}>
                    + Add card
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Card Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, padding: '26px 30px', width: 460, maxWidth: '94vw' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800, marginBottom: 20 }}>
              ➕ New Card — <span style={{ color: COLS.find(c => c.id === addCol)?.color }}>{COLS.find(c => c.id === addCol)?.label}</span>
            </div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Title*</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Task title" style={inputStyle} autoFocus />

            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional details..." rows={2} style={{ ...inputStyle, resize: 'none' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Priority</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} style={inputStyle}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Due Date</label>
                <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Assign To</label>
                <select value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} style={inputStyle}>
                  <option value="">— Unassigned —</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Tags (comma separated)</label>
                <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="Marketing, Urgent, Content" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Cancel</button>
              <button onClick={addTask} style={{ flex: 1, padding: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Add Card</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
