import { NextResponse } from 'next/server'
import { getMongoDb, mapUser } from '@/lib/mongodb'

export async function GET() {
  try {
    const db = await getMongoDb()

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    // Get all users with at least 1 order
    const ordersCol = db.collection('orders')
    const usersCol = db.collection('users')

    // Aggregate: per user, find their last order date and total spend
    const orderStats = await ordersCol.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $group: {
        _id: '$user',
        lastOrderDate: { $max: '$createdAt' },
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$pricing.total' },
        products: { $push: '$items.productSnapshot.name' },
      }},
      { $match: { lastOrderDate: { $lt: thirtyDaysAgo } } },
      { $sort: { lastOrderDate: 1 } },
      { $limit: 100 },
    ]).toArray()

    if (!orderStats.length) {
      return NextResponse.json({ customers: [], total: 0 })
    }

    // Get user details
    const userIds = orderStats.map(s => s._id).filter(Boolean)
    const users = await usersCol.find({ _id: { $in: userIds } }).toArray()
    const userMap = new Map(users.map(u => [u._id.toString(), u]))

    const customers = orderStats.map(stat => {
      const user = userMap.get(stat._id?.toString() || '')
      const mapped = user ? mapUser(user) : null
      const daysSince = Math.floor((Date.now() - new Date(stat.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))

      // Flatten product names
      const allProducts = (stat.products || []).flat().filter(Boolean)
      const productCounts: Record<string, number> = {}
      allProducts.forEach((p: string) => { productCounts[p] = (productCounts[p] || 0) + 1 })
      const topProducts = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name)

      return {
        id: stat._id?.toString() || '',
        name: mapped?.name || 'Customer',
        phone: mapped?.phone || '',
        email: mapped?.email || '',
        lastPurchase: stat.lastOrderDate?.toISOString?.()?.split('T')[0] || '',
        daysSince,
        totalOrders: stat.totalOrders || 0,
        totalSpent: Math.round(stat.totalSpent || 0),
        riskLevel: daysSince >= 90 ? 'critical' : daysSince >= 60 ? 'high' : 'medium',
        topProducts,
      }
    }).filter(c => c.phone) // only customers with phone numbers

    return NextResponse.json({ customers, total: customers.length })
  } catch (e: any) {
    console.error('Retention customers error:', e.message)
    // Return empty — don't break the page
    return NextResponse.json({ customers: [], total: 0, error: e.message })
  }
}
