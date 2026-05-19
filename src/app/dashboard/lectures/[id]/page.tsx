import { Suspense } from 'react'
import LectureDocument from '@/components/lecture/LectureDocument'

export default function LectureDocumentPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={null}>
      <LectureDocument id={params.id} />
    </Suspense>
  )
}
