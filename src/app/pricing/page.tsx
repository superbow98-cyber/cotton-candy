'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PricingRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/#pricing')
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      color: '#6B6B70',
      fontSize: 14,
    }}>
      Redirecting…
    </div>
  )
}
