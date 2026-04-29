// src/lib/admin-server.ts
// SERVER-ONLY admin check — uses Supabase server client (next/headers)
// Do NOT import this from client components.

import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export async function isAdminUser(): Promise<{ isAdmin: boolean; user: any | null }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { isAdmin: false, user: null }

  // Email check (fast path)
  if (isAdminEmail(user.email)) return { isAdmin: true, user }

  // DB check (fallback)
  const { data: profile } = await sb
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  return { isAdmin: !!profile?.is_admin, user }
}
