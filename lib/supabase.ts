import { createClient } from '@supabase/supabase-js'

function getSupabaseUrl() {
  const url = process.env.SUPABASE_URL
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SUPABASE_URL is required')
    }
    return 'https://placeholder.supabase.co'
  }
  return url
}

function getAnonKey() {
  return process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key'
}

function getServiceKey() {
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SUPABASE_SERVICE_KEY is required')
    }
    return 'placeholder-service-key'
  }
  return key
}

// Public client — for read-only operations
export const supabase = createClient(getSupabaseUrl(), getAnonKey())

// Service client — for writes, bypasses RLS
export const supabaseAdmin = createClient(getSupabaseUrl(), getServiceKey(), {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ────────────────────────────────────────────────────────────────────────────
// Types — mirror the Supabase schema
// ────────────────────────────────────────────────────────────────────────────

export type Agent = {
  id: string
  address: string
  description: string | null
  tags: string[] | null
  available_for_hire: boolean
  endpoint_url: string | null
  created_at: string
}

export type GauntletQueueEntry = {
  id: string
  agent_address: string
  status: 'pending' | 'running' | 'complete'
  score_delta: number | null
  submitted_at: string
  completed_at: string | null
}

export type TaskLogEntry = {
  id: string
  agent_address: string
  passed: boolean
  source: string | null
  recorded_at: string
}
