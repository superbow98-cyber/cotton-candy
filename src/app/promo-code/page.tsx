import { Suspense } from 'react'
import PromoCodeClient from './PromoCodeClient'

export default function PromoCodePage() {
  return (
    <Suspense fallback={null}>
      <PromoCodeClient />
    </Suspense>
  )
}
