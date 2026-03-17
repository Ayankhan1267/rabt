import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role
export function createServerClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  )
}

export type UserRole = 'founder' | 'manager' | 'specialist_manager' | 'specialist' | 'support' | 'ops'

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
    permissions: ['*'], // All access
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
  },
}
