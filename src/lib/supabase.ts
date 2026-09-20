import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export function hasSupabaseConfig(): boolean {
  return Boolean(url && anonKey)
}

export function getConfigError(): string | null {
  if (!url || !anonKey) {
    return 'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.local y completa los valores.'
  }
  return null
}

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!hasSupabaseConfig()) {
    throw new Error(getConfigError() ?? 'Supabase no configurado')
  }
  if (!client) {
    client = createClient(url!, anonKey!)
  }
  return client
}