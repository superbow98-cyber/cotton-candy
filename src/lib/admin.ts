// src/lib/admin.ts
// Admin email allowlist helper

export const ADMIN_EMAILS = [
  'parcellomalaysia@gmail.com',
  'superbow98@gmail.com',
] as const

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase() as any)
}
