import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getMongoDb } from '@/lib/mongodb'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const db = await getMongoDb()

    // Get all specialists from MongoDB
    const mongoSpecialists = await db.collection('specialists').find({}).toArray()
    const mongoConsultations = await db.collection('consultations').find({ status: 'completed' }).toArray()
    const mongoOrders = await db.collection('orders').find({ status: { $ne: 'cancelled' } }).toArray()
    const mongoSessions = await db.collection('sessions').find({ status: 'completed' }).toArray()

    // Get all HQ specialist profiles
    const { data: hqSpecialists } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'specialist')

    if (!hqSpecialists || hqSpecialists.length === 0) {
      return NextResponse.json({ message: 'No HQ specialists found', synced: 0 })
    }

    let totalSynced = 0
    const results = []

    for (const hqSpec of hqSpecialists) {
      // Find matching MongoDB specialist
      const mongoSpec = mongoSpecialists.find(ms =>
        ms.email === hqSpec.email ||
        ms._id?.toString() === hqSpec.specialist_id
      )

      if (!mongoSpec) continue

      const specId = mongoSpec._id?.toString()

      // Get existing earnings to avoid duplicates
      const { data: existingEarnings } = await supabase
        .from('specialist_earnings')
        .select('consultation_id, order_id')
        .eq('specialist_id', hqSpec.id)

      const existingConsultationIds = new Set(existingEarnings?.map(e => e.consultation_id).filter(Boolean))
      const existingOrderIds = new Set(existingEarnings?.map(e => e.order_id).filter(Boolean))

      // 1. CONSULTATION EARNINGS — ₹30 per completed consultation
      const myConsultations = mongoConsultations.filter(c =>
        c.assignedSpecialist?.toString() === specId && c.status === 'completed'
      )

      for (const consultation of myConsultations) {
        const consultId = consultation._id?.toString()
        if (existingConsultationIds.has(consultId)) continue

        await supabase.from('specialist_earnings').insert({
          specialist_id: hqSpec.id,
          type: 'consultation',
          amount: 30,
          description: `Consultation completed - ${consultation.fullName || consultation.name || 'Patient'}`,
          consultation_id: consultId,
          status: 'pending',
        })
        totalSynced++
      }

      // 2. ORDER COMMISSION — 12% when specialist's patient orders
      // Match patients via consultations assigned to this specialist
      const myPatientUserIds = myConsultations
        .map(c => c.user?.toString())
        .filter(Boolean)

      const myPatientOrders = mongoOrders.filter(o =>
        myPatientUserIds.includes(o.user?.toString() || o.userId?.toString())
      )

      for (const order of myPatientOrders) {
        const orderId = order._id?.toString()
        if (existingOrderIds.has(orderId)) continue

        const orderAmount = order.pricing?.total || order.amount || 0
        const commission = Math.round(orderAmount * 0.12)
        if (commission <= 0) continue

        const patientConsultation = myConsultations.find(c =>
          c.user?.toString() === (order.user?.toString() || order.userId?.toString())
        )

        await supabase.from('specialist_earnings').insert({
          specialist_id: hqSpec.id,
          type: 'order_commission',
          amount: commission,
          description: `12% commission on ₹${orderAmount} order by ${order.shippingAddress?.contactName || 'Patient'}`,
          order_id: orderId,
          consultation_id: patientConsultation?._id?.toString() || null,
          status: 'pending',
        })
        totalSynced++
      }

      // Calculate totals for this specialist
      const { data: allEarnings } = await supabase
        .from('specialist_earnings')
        .select('amount, status')
        .eq('specialist_id', hqSpec.id)

      const totalEarnings = allEarnings?.reduce((s, e) => s + (e.amount || 0), 0) || 0
      const pendingEarnings = allEarnings?.filter(e => e.status === 'pending').reduce((s, e) => s + (e.amount || 0), 0) || 0

      results.push({
        specialist: hqSpec.name,
        consultations: myConsultations.length,
        orders: myPatientOrders.length,
        totalEarnings,
        pendingEarnings,
        newEntriesAdded: totalSynced,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${totalSynced} new earnings entries`,
      results,
      totalSynced,
    })
  } catch (err: any) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const url = new URL(req.url)
    const specialistId = url.searchParams.get('specialist_id')

    if (!specialistId) {
      return NextResponse.json({ error: 'specialist_id required' }, { status: 400 })
    }

    const { data: earnings } = await supabase
      .from('specialist_earnings')
      .select('*')
      .eq('specialist_id', specialistId)
      .order('created_at', { ascending: false })

    const total = earnings?.reduce((s, e) => s + (e.amount || 0), 0) || 0
    const pending = earnings?.filter(e => e.status === 'pending').reduce((s, e) => s + (e.amount || 0), 0) || 0
    const paid = earnings?.filter(e => e.status === 'paid').reduce((s, e) => s + (e.amount || 0), 0) || 0
    const consultationTotal = earnings?.filter(e => e.type === 'consultation').reduce((s, e) => s + (e.amount || 0), 0) || 0
    const commissionTotal = earnings?.filter(e => e.type === 'order_commission').reduce((s, e) => s + (e.amount || 0), 0) || 0

    return NextResponse.json({
      earnings,
      summary: { total, pending, paid, consultationTotal, commissionTotal }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
