// src/lib/admin.ts
// Admin allowlist + DB check helper

import { createClient } from '@/lib/supabase/server'

export const ADMIN_EMAILS = [
  'parcellomalaysia@gmail.com',
  'superbow98@gmail.com',
] as const

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase() as any)
}

// Server-side admin check — uses both email allowlist AND profiles.is_admin flag
// Returns true if either matches. Use this in API routes for protection.
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
