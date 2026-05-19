import { Suspense } from 'react'
import LectureRecorder from '@/components/lecture/LectureRecorder'

export default function LecturePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={null}>
      <LectureRecorder id={params.id} />
    </Suspense>
  )
}
