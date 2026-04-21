import type { Metadata } from 'next'
import './globals.css'
import { LangProvider } from '@/lib/i18n/LangProvider'
import { ThemeProvider } from '@/lib/theme/ThemeProvider'
import ThemePicker from '@/components/ui/ThemePicker'

export const metadata: Metadata = {
  title: 'Cotton Candy — Your lectures, written for you',
  description: 'Record any class, get a live-written markdown note, and export a printable PDF notebook when it ends.',
  themeColor: '#FFB7C5',
  openGraph: {
    title: 'Cotton Candy',
    description: 'Live lecture-to-markdown notes. Your phone listens, we write.',
    type: 'website',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <LangProvider>
            {children}
            <ThemePicker />
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
