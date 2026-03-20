import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function createServerClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  )
}

export type UserRole = 'founder' | 'admin' | 'manager' | 'specialist_manager' | 'specialist' | 'support' | 'ops' | 'partner' | 'finance' | 'hr' | 'content_creator' | 'marketing'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: UserRole
  avatar_url?: string
  phone?: string
  is_active: boolean
  created_at: string
}

export const ROLE_CONFIG: Record<UserRole, {
  label: string
  color: string
  bg: string
  permissions: string[]
}> = {
  founder: {
    label: '⚡ Founder',
    color: '#D4A853',
    bg: 'linear-gradient(135deg,#1A3D20,#2D6A35)',
    permissions: ['*'],
  },
  manager: {
    label: '📊 Manager',
    color: '#3B82F6',
    bg: 'linear-gradient(135deg,#1565C0,#0D47A1)',
    permissions: ['dashboard','orders','crm','marketing','content','ads','goals','team','finance'],
  },
  specialist_manager: {
    label: '🌿 Specialist Manager',
    color: '#14B8A6',
    bg: 'linear-gradient(135deg,#0D6A5E,#0A4A42)',
    permissions: ['specialist_dashboard','consultations','specialists','crm','knowledge'],
  },
  specialist: {
    label: '🧴 Specialist',
    color: '#EC4899',
    bg: 'linear-gradient(135deg,#880E4F,#C2185B)',
    permissions: ['consultations','my_leads','tasks','knowledge','earnings'],
  },
  support: {
    label: '🎧 Support',
    color: '#A855F7',
    bg: 'linear-gradient(135deg,#6B21A8,#7C3AED)',
    permissions: ['support','orders','crm','tasks'],
  },
  ops: {
    label: '📦 Operations',
    color: '#F97316',
    bg: 'linear-gradient(135deg,#BF360C,#E64A19)',
    permissions: ['orders','inventory','tasks','support'],
  },  partner: {
    label: '🤝 Partner',
    color: '#0097A7',
    bg: 'linear-gradient(135deg,#005F6A,#0097A7)',
    permissions: ['partner'],
  },
  admin: {
    label: '🛡️ Admin',
    color: '#7C3AED',
    bg: 'linear-gradient(135deg,#4C1D95,#6D28D9)',
    permissions: ['*'],
  },
  finance: {
    label: '💰 Finance',
    color: '#22C55E',
    bg: 'linear-gradient(135deg,#14532D,#166534)',
    permissions: ['finance','orders','reports','dashboard','goals'],
  },
  hr: {
    label: '👥 HR',
    color: '#F59E0B',
    bg: 'linear-gradient(135deg,#78350F,#92400E)',
    permissions: ['hr','team','team-hub','calendar','dashboard'],
  },
  content_creator: {
    label: '🎬 Content',
    color: '#06B6D4',
    bg: 'linear-gradient(135deg,#164E63,#155E75)',
    permissions: ['content','marketing','ads','calendar','knowledge'],
  },
  marketing: {
    label: '📢 Marketing',
    color: '#F43F5E',
    bg: 'linear-gradient(135deg,#881337,#9F1239)',
    permissions: ['marketing','ads','crm','content','calendar','reports'],
  },
}