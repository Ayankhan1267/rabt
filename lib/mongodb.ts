import { MongoClient, Db } from 'mongodb'

const MONGO_URI = process.env.MONGO_URI!
const DB_NAME = 'rabt'

let client: MongoClient | null = null
let db: Db | null = null

export async function getMongoDb(): Promise<Db> {
  if (db) return db
  if (!client) {
    client = new MongoClient(MONGO_URI)
    await client.connect()
  }
  db = client.db(DB_NAME)
  return db
}

// Order field mappings
export function mapOrder(o: any) {
  return {
    _id: o._id?.toString(),
    orderNumber: o.orderNumber || o._id?.toString(),
    customerName: o.shippingAddress?.contactName || 'Customer',
    customerPhone: o.shippingAddress?.contactPhone || '',
    customerEmail: o.pendingShiprocketData?.billing_email || '',
    city: o.shippingAddress?.city || '',
    state: o.shippingAddress?.state || '',
    pincode: o.shippingAddress?.pincode || '',
    products: (o.items || []).map((i: any) => i.productSnapshot?.name || '').filter(Boolean).join(', '),
    items: (o.items || []).map((i: any) => ({
      name: i.productSnapshot?.name || '',
      category: i.productSnapshot?.category || '',
      size: i.variant?.size || '',
      sku: i.variant?.sku || '',
      quantity: i.quantity || 1,
      price: i.price?.final || 0,
      originalPrice: i.price?.original || 0,
      image: i.productSnapshot?.image || '',
    })),
    itemCount: (o.items || []).length,
    amount: o.pricing?.total || 0,
    subtotal: o.pricing?.subtotal || 0,
    couponDiscount: o.pricing?.couponDiscount || 0,
    couponCode: o.couponUsed?.code || '',
    shippingCharges: o.pricing?.shippingCharges || 0,
    trackingStatus: o.trackingDetails?.status || 'NEW',
    status: o.status || 'pending',
    paymentMethod: o.payment?.method || '',
    paymentStatus: o.payment?.status || '',
    isPrepaid: o.payment?.method === 'razorpay' || o.pendingShiprocketData?.payment_method === 'Prepaid',
    isCOD: o.payment?.method === 'cod',
    type: o.type || 'one_time',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

// User field mappings
export function mapUser(u: any) {
  return {
    _id: u._id?.toString(),
    name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Customer',
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    phone: u.phoneNumber || '',
    email: u.email || '',
    role: u.role || 'user',
    isPhoneVerified: u.isPhoneVerified || false,
    isActive: u.isActive !== false,
    createdAt: u.createdAt,
  }
}

// Product field mappings
export function mapProduct(p: any) {
  return {
    _id: p._id?.toString(),
    name: p.name || 'Product',
    slug: p.slug || '',
    category: p.category || '',
    subcategory: p.subcategory || '',
    description: p.description?.short || p.description || '',
    skinType: p.skinType || [],
    skinConcerns: p.skinConcerns || [],
    image: p.images?.find((i: any) => i.isPrimary)?.url || p.images?.[0]?.url || '',
    images: (p.images || []).map((i: any) => i.url),
    basePrice: p.basePrice || 0,
    price: p.variants?.[0]?.price?.discounted || p.basePrice || 0,
    originalPrice: p.variants?.[0]?.price?.original || 0,
    stock: p.variants?.reduce((s: number, v: any) => s + (v.stock || 0), 0) || 0,
    sku: p.variants?.[0]?.sku || '',
    status: p.status || 'active',
    lowStockThreshold: p.inventory?.lowStockThreshold || 10,
    variants: (p.variants || []).map((v: any) => ({
      size: v.size,
      sku: v.sku,
      price: v.price?.discounted || 0,
      originalPrice: v.price?.original || 0,
      stock: v.stock || 0,
      isDefault: v.isDefault || false,
    })),
    ingredients: (p.ingredients || []).map((i: any) => ({
      name: i.name,
      purpose: i.purpose,
      concentration: i.concentration,
      featured: i.featured,
    })),
    keyIngredients: p.keyIngredients || [],
    attributes: p.attributes || {},
    badges: p.badges || [],
    createdAt: p.createdAt,
  }
}

// Consultation field mappings
export function mapConsultation(c: any) {
  return {
    _id: c._id?.toString(),
    consultationNumber: c.consultationNumber || c._id?.toString(),
    name: c.fullName || 'Customer',
    age: c.age || '',
    concern: c.description || '',
    scheduledDate: c.scheduledDate || null,
    scheduledTime: c.scheduledTime || '',
    status: c.status || 'pending',
    assignedSpecialist: c.assignedSpecialist?.toString() || null,
    images: c.images || [],
    acceptedAt: c.acceptedAt || null,
    completedAt: c.completedAt || null,
    userId: c.user?.toString() || null,
    createdAt: c.createdAt,
  }
}
