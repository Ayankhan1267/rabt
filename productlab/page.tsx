'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

const PRODUCTS = [
  {
    name: 'Moong Magic Gentle Cleanser',
    range: 'Moong Magic',
    phase: 'Production',
    phaseColor: 'var(--green)',
    version: 'v2.1',
    category: 'cleanser',
    skinType: ['Oily', 'Combination', 'Acne-Prone'],
    mrp: 449,
    discounted: 349,
    cost: 120,
    margin: 66,
    keyIngredients: [
      { name: 'Moong (Green Gram) Extract', conc: '10%', role: 'Cleanses pores, balances oil' },
      { name: 'Glycerin', conc: '12%', role: 'Hydration, prevents dryness' },
      { name: 'Mild Cleansing Agents', conc: '8%', role: 'Removes dirt without irritation' },
    ],
    attributes: { paraben_free: true, sulfate_free: true, cruelty_free: true, vegan: true },
    badges: ['Customer Favorite', 'New Arrival'],
  },
  {
    name: 'Moong Magic Clarifying Serum',
    range: 'Moong Magic',
    phase: 'Production',
    phaseColor: 'var(--green)',
    version: 'v3.1',
    category: 'serum',
    skinType: ['Oily', 'Acne-Prone', 'Combination'],
    mrp: 699,
    discounted: 549,
    cost: 180,
    margin: 67,
    keyIngredients: [
      { name: 'Niacinamide', conc: '5%', role: 'Brightening, pore reduction' },
      { name: 'Alpha Arbutin', conc: '2%', role: 'Pigmentation reduction' },
      { name: 'Salicylic Acid', conc: '0.3%', role: 'Acne fighting, exfoliation' },
      { name: 'Centella Asiatica', conc: '1%', role: 'Soothing, anti-inflammatory' },
      { name: 'Sodium Hyaluronate', conc: '1.5%', role: 'Deep hydration' },
      { name: 'Moong Dal Extract', conc: '0.5%', role: 'Brightening, antioxidant' },
    ],
    attributes: { paraben_free: true, sulfate_free: true, cruelty_free: true, vegan: true },
    badges: ['Best Seller'],
  },
  {
    name: 'Masoor Glow Brightening Serum',
    range: 'Masoor Glow',
    phase: 'Production',
    phaseColor: 'var(--green)',
    version: 'v2.0',
    category: 'serum',
    skinType: ['Dull', 'Pigmented', 'Normal'],
    mrp: 699,
    discounted: 499,
    cost: 165,
    margin: 67,
    keyIngredients: [
      { name: 'Masoor (Red Lentil) Extract', conc: '8%', role: 'Anti-pigmentation, brightening' },
      { name: 'Vitamin C (Ascorbic Acid)', conc: '5%', role: 'Brightening, antioxidant' },
      { name: 'Alpha Arbutin', conc: '2%', role: 'Melanin inhibition' },
      { name: 'Niacinamide', conc: '3%', role: 'Even skin tone' },
    ],
    attributes: { paraben_free: true, sulfate_free: true, cruelty_free: true, vegan: true },
    badges: [],
  },
  {
    name: 'Oats Care Soothing Moisturizer',
    range: 'Oats Care',
    phase: 'Production',
    phaseColor: 'var(--green)',
    version: 'v1.5',
    category: 'moisturizer',
    skinType: ['Dry', 'Sensitive', 'Normal'],
    mrp: 649,
    discounted: 499,
    cost: 150,
    margin: 70,
    keyIngredients: [
      { name: 'Colloidal Oat Extract', conc: '5%', role: 'Soothing, barrier repair' },
      { name: 'Shea Butter', conc: '3%', role: 'Deep moisturization' },
      { name: 'Ceramide NP', conc: '0.5%', role: 'Skin barrier strengthening' },
      { name: 'Sodium Hyaluronate', conc: '2%', role: 'Hydration' },
    ],
    attributes: { paraben_free: true, sulfate_free: true, cruelty_free: true, vegan: false },
    badges: [],
  },
  {
    name: 'Eye Pulse Under-Eye Cream',
    range: 'Standalone',
    phase: 'Production',
    phaseColor: 'var(--green)',
    version: 'v1.2',
    category: 'eye cream',
    skinType: ['All Skin Types'],
    mrp: 799,
    discounted: 599,
    cost: 200,
    margin: 67,
    keyIngredients: [
      { name: 'Caffeine', conc: '1%', role: 'Reduces puffiness, dark circles' },
      { name: 'Peptide Complex', conc: '2%', role: 'Anti-aging, firmness' },
      { name: 'Vitamin K', conc: '0.1%', role: 'Dark circle reduction' },
      { name: 'Shea Butter', conc: '5%', role: 'Moisturization' },
    ],
    attributes: { paraben_free: true, sulfate_free: true, cruelty_free: true, vegan: false },
    badges: ['New'],
  },
  {
    name: 'Ratiol Anti-Acne Facewash',
    range: 'Ratiol',
    phase: 'Batch Testing',
    phaseColor: 'var(--orange)',
    version: 'v1.0',
    category: 'facewash',
    skinType: ['Oily', 'Acne-Prone'],
    mrp: 499,
    discounted: 399,
    cost: 110,
    margin: 72,
    keyIngredients: [
      { name: 'Salicylic Acid', conc: '2%', role: 'Deep pore cleansing, acne' },
      { name: 'Tea Tree Oil', conc: '0.5%', role: 'Antibacterial, anti-acne' },
      { name: 'Zinc PCA', conc: '1%', role: 'Oil control' },
    ],
    attributes: { paraben_free: true, sulfate_free: false, cruelty_free: true, vegan: true },
    badges: [],
  },
]

const RANGES = ['All', 'Moong Magic', 'Masoor Glow', 'Oats Care', 'Ratiol', 'Standalone']
const RANGE_COLORS: Record<string, string> = {
  'Moong Magic': 'var(--green)', 'Masoor Glow': 'var(--orange)',
  'Oats Care': 'var(--teal)', 'Ratiol': 'var(--blue)', 'Standalone': 'var(--purple)'
}

export default function ProductLabPage() {
  const [selected, setSelected] = useState<any>(null)
  const [rangeFilter, setRangeFilter] = useState('All')
  const [view, setView] = useState<'grid' | 'table'>('grid')

  const filtered = PRODUCTS.filter(p => rangeFilter === 'All' || p.range === rangeFilter)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>Product <span style={{ color: 'var(--gold)' }}>Lab</span></h1>
          <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>
            {PRODUCTS.length} products · Formulations, ingredients, margins
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['grid', 'table'].map(v => (
            <button key={v} onClick={() => setView(v as any)} style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit',
              background: view === v ? 'var(--gL)' : 'rgba(255,255,255,0.05)',
              color: view === v ? 'var(--gold)' : 'var(--mu2)',
              border: `1px solid ${view === v ? 'rgba(212,168,83,0.3)' : 'var(--b1)'}`,
            }}>{v === 'grid' ? '⬛ Grid' : '📋 Table'}</button>
          ))}
        </div>
      </div>

      {/* Range Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {RANGES.map(r => (
          <button key={r} onClick={() => setRangeFilter(r)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit',
            background: rangeFilter === r ? (RANGE_COLORS[r] || 'var(--gold)') + '22' : 'rgba(255,255,255,0.05)',
            color: rangeFilter === r ? (RANGE_COLORS[r] || 'var(--gold)') : 'var(--mu2)',
            border: `1px solid ${rangeFilter === r ? (RANGE_COLORS[r] || 'var(--gold)') + '44' : 'var(--b1)'}`,
          }}>{r}</button>
        ))}
      </div>

      {view === 'table' ? (
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Product', 'Range', 'Phase', 'MRP', 'Price', 'Cost', 'Margin', 'Key Ingredients'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--b1)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={i} onClick={() => setSelected(p)} style={{ cursor: 'pointer' }} onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '11px 12px', fontWeight: 500, fontSize: 12.5 }}>{p.name}</td>
                  <td style={{ padding: '11px 12px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: (RANGE_COLORS[p.range] || 'var(--mu)') + '22', color: RANGE_COLORS[p.range] || 'var(--mu)', fontWeight: 700 }}>{p.range}</span></td>
                  <td style={{ padding: '11px 12px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: p.phaseColor + '22', color: p.phaseColor, fontWeight: 700 }}>{p.phase}</span></td>
                  <td style={{ padding: '11px 12px', fontFamily: 'DM Mono', fontSize: 12, textDecoration: 'line-through', color: 'var(--mu)' }}>₹{p.mrp}</td>
                  <td style={{ padding: '11px 12px', fontFamily: 'DM Mono', fontSize: 13, fontWeight: 700 }}>₹{p.discounted}</td>
                  <td style={{ padding: '11px 12px', fontFamily: 'DM Mono', fontSize: 12, color: 'var(--orange)' }}>₹{p.cost}</td>
                  <td style={{ padding: '11px 12px', fontFamily: 'DM Mono', fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>{p.margin}%</td>
                  <td style={{ padding: '11px 12px', fontSize: 11.5, color: 'var(--mu2)' }}>{p.keyIngredients.slice(0, 2).map(i => i.name).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr' : 'repeat(3, 1fr)', gap: 12, gridColumn: selected ? '1' : '1/-1' }}>
            {filtered.map((p, i) => (
              <div key={i} onClick={() => setSelected(selected?.name === p.name ? null : p)} style={{
                background: 'var(--s1)', border: `1px solid ${selected?.name === p.name ? 'var(--gold)' : 'var(--b1)'}`,
                borderRadius: 14, padding: '18px', cursor: 'pointer', transition: 'all 0.13s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: (RANGE_COLORS[p.range] || 'var(--mu)') + '22', color: RANGE_COLORS[p.range] || 'var(--mu)', fontWeight: 700 }}>{p.range}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: p.phaseColor + '22', color: p.phaseColor, fontWeight: 700 }}>{p.phase}</span>
                </div>
                <div style={{ fontFamily: 'Syne', fontSize: 13.5, fontWeight: 800, marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 12 }}>{p.version} · {p.category}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 14, fontWeight: 800 }}>₹{p.discounted}</div>
                    <div style={{ fontSize: 9, color: 'var(--mu)', textTransform: 'uppercase', marginTop: 2 }}>Price</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 14, fontWeight: 800, color: 'var(--orange)' }}>₹{p.cost}</div>
                    <div style={{ fontSize: 9, color: 'var(--mu)', textTransform: 'uppercase', marginTop: 2 }}>Cost</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>{p.margin}%</div>
                    <div style={{ fontSize: 9, color: 'var(--mu)', textTransform: 'uppercase', marginTop: 2 }}>Margin</div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--mu2)' }}>
                  {p.keyIngredients.slice(0, 2).map(ing => (
                    <span key={ing.name} style={{ marginRight: 6 }}>• {ing.name.split(' ').slice(0, 2).join(' ')}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="card" style={{ height: 'fit-content', position: 'sticky', top: 80 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800 }}>{selected.name}</div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: (RANGE_COLORS[selected.range] || 'var(--mu)') + '22', color: RANGE_COLORS[selected.range] || 'var(--mu)', fontWeight: 700 }}>{selected.range}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: selected.phaseColor + '22', color: selected.phaseColor, fontWeight: 700 }}>{selected.phase}</span>
                {selected.badges.map((b: string, i: number) => <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--gL)', color: 'var(--gold)', fontWeight: 700 }}>{b}</span>)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'MRP', value: `₹${selected.mrp}`, color: 'var(--mu)', strike: true },
                  { label: 'Selling Price', value: `₹${selected.discounted}`, color: 'var(--tx)' },
                  { label: 'Product Cost', value: `₹${selected.cost}`, color: 'var(--orange)' },
                  { label: 'Gross Margin', value: `${selected.margin}%`, color: 'var(--green)' },
                  { label: 'Profit/Unit', value: `₹${selected.discounted - selected.cost}`, color: 'var(--green)' },
                  { label: 'Category', value: selected.category, color: 'var(--blue)' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'var(--s2)', borderRadius: 8, padding: '9px' }}>
                    <div style={{ fontSize: 9.5, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 13, fontWeight: 700, color: s.color, textDecoration: (s as any).strike ? 'line-through' : 'none' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Key Ingredients</div>
              {selected.keyIngredients.map((ing: any, i: number) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--b1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{ing.name}</span>
                    <span style={{ fontFamily: 'DM Mono', fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>{ing.conc}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mu)' }}>{ing.role}</div>
                </div>
              ))}

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Attributes</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(selected.attributes).map(([key, val]) => (
                    <span key={key} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: val ? 'var(--grL)' : 'var(--rdL)', color: val ? 'var(--green)' : 'var(--red)' }}>
                      {val ? '✓' : '✗'} {key.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Suitable For</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selected.skinType.map((st: string, i: number) => (
                    <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--blL)', color: 'var(--blue)', fontWeight: 600 }}>{st}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
