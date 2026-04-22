'use client'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LangProvider'

export default function PrivacyPage() {
  const { lang } = useLang()
  const isBM = lang === 'bm'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafafb',
      padding: '48px 24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      color: '#1d1d1f',
      letterSpacing: '-0.01em',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: 'rgba(29,29,31,0.55)',
          textDecoration: 'none', marginBottom: 32,
        }}>
          ← {isBM ? 'Balik ke Cotton Candy' : 'Back to Cotton Candy'}
        </Link>

        <h1 style={{
          fontSize: 36, fontWeight: 600,
          letterSpacing: '-0.035em', marginBottom: 8,
          lineHeight: 1.1,
        }}>
          {isBM ? 'Dasar Privasi' : 'Privacy Policy'}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.5)', marginBottom: 32 }}>
          {isBM ? 'Terakhir dikemaskini: 22 April 2026' : 'Last updated: April 22, 2026'}
        </p>

        <div style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(29,29,31,0.85)' }}>
          <Section title={isBM ? '1. Pengenalan' : '1. Introduction'}>
            {isBM
              ? 'Cotton Candy ("kami") menyediakan perkhidmatan rakaman kuliah dan nota berkuasa AI. Dasar ini menjelaskan bagaimana kami mengumpul, menggunakan, dan melindungi maklumat anda.'
              : 'Cotton Candy ("we") provides AI-powered lecture recording and note-taking services. This policy explains how we collect, use, and protect your information.'}
          </Section>

          <Section title={isBM ? '2. Maklumat yang dikumpul' : '2. Information we collect'}>
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li><strong>{isBM ? 'Maklumat akaun' : 'Account info'}:</strong> {isBM
                ? 'Nama, alamat e-mel melalui Google Sign-In.'
                : 'Name, email address via Google Sign-In.'}</li>
              <li><strong>{isBM ? 'Kandungan kuliah' : 'Lecture content'}:</strong> {isBM
                ? 'Transkrip teks (disimpan), nota AI (disimpan). Audio TIDAK disimpan — hanya diproses buat sementara untuk transkripsi.'
                : 'Text transcripts (stored), AI-generated notes (stored). Audio is NOT stored — only processed transiently for transcription.'}</li>
              <li><strong>{isBM ? 'Data penggunaan' : 'Usage data'}:</strong> {isBM
                ? 'Jumlah audio diproses, bilangan kuliah dicipta.'
                : 'Amount of audio processed, number of recordings created.'}</li>
              <li><strong>{isBM ? 'Pembayaran' : 'Payments'}:</strong> {isBM
                ? 'Diproses oleh Stripe. Kami tidak menyimpan nombor kad.'
                : 'Processed by Stripe. We do not store card numbers.'}</li>
            </ul>
          </Section>

          <Section title={isBM ? '3. Bagaimana kami gunakan maklumat' : '3. How we use your information'}>
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>{isBM ? 'Menyediakan perkhidmatan Cotton Candy.' : 'To provide Cotton Candy services.'}</li>
              <li>{isBM ? 'Memproses transkripsi audio melalui Groq Whisper.' : 'To process audio transcription via Groq Whisper.'}</li>
              <li>{isBM ? 'Mengorganisasi nota melalui Google Gemini atau Groq Llama.' : 'To organize notes via Google Gemini or Groq Llama.'}</li>
              <li>{isBM ? 'Mengurus langganan dan bayaran anda.' : 'To manage your subscriptions and payments.'}</li>
              <li>{isBM ? 'Menghantar notifikasi penting sahaja (bukan pemasaran).' : 'To send critical notifications only (not marketing).'}</li>
            </ul>
          </Section>

          <Section title={isBM ? '4. Perkhidmatan pihak ketiga' : '4. Third-party services'}>
            {isBM ? 'Kami guna perkhidmatan berikut:' : 'We use the following services:'}
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li><strong>Supabase</strong> — {isBM ? 'pangkalan data dan pengesahan.' : 'database and authentication.'}</li>
              <li><strong>Google OAuth</strong> — {isBM ? 'untuk sign-in sahaja.' : 'for sign-in only.'}</li>
              <li><strong>Groq</strong> — {isBM ? 'untuk transkripsi Whisper dan penjanaan nota Llama.' : 'for Whisper transcription and Llama note generation.'}</li>
              <li><strong>Google Gemini</strong> — {isBM ? 'untuk penjanaan nota AI.' : 'for AI note generation.'}</li>
              <li><strong>Stripe</strong> — {isBM ? 'untuk pemprosesan pembayaran.' : 'for payment processing.'}</li>
              <li><strong>Vercel</strong> — {isBM ? 'untuk hosting aplikasi.' : 'for application hosting.'}</li>
            </ul>
          </Section>

          <Section title={isBM ? '5. Data audio' : '5. Audio data'}>
            <p>{isBM
              ? 'Audio anda TIDAK disimpan dalam pangkalan data kami. Ia dihantar terus kepada Groq Whisper untuk transkripsi dan dibuang segera selepas pemprosesan.'
              : 'Your audio is NOT stored in our database. It is sent directly to Groq Whisper for transcription and discarded immediately after processing.'}</p>
          </Section>

          <Section title={isBM ? '6. Hak anda' : '6. Your rights'}>
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>{isBM ? 'Akses kepada data peribadi anda.' : 'Access to your personal data.'}</li>
              <li>{isBM ? 'Memadam akaun dan semua data yang berkaitan.' : 'Delete your account and all associated data.'}</li>
              <li>{isBM ? 'Eksport data anda dalam format .md atau .pdf.' : 'Export your data in .md or .pdf format.'}</li>
              <li>{isBM ? 'Menghubungi kami tentang sebarang kebimbangan.' : 'Contact us about any concerns.'}</li>
            </ul>
          </Section>

          <Section title={isBM ? '7. Kuki' : '7. Cookies'}>
            {isBM
              ? 'Kami guna kuki penting untuk fungsi sign-in dan session. Kami tidak gunakan kuki pengiklanan atau penjejakan pihak ketiga.'
              : 'We use essential cookies for sign-in and session functionality. We do not use advertising or third-party tracking cookies.'}
          </Section>

          <Section title={isBM ? '8. Keselamatan' : '8. Security'}>
            {isBM
              ? 'Data disulitkan dalam transit (HTTPS) dan dalam simpanan. Akses adalah melalui pengesahan Google OAuth sahaja.'
              : 'Data is encrypted in transit (HTTPS) and at rest. Access is via Google OAuth authentication only.'}
          </Section>

          <Section title={isBM ? '9. Perubahan kepada dasar ini' : '9. Changes to this policy'}>
            {isBM
              ? 'Kami akan memaklumkan anda tentang perubahan ketara melalui e-mel atau notifikasi dalam aplikasi.'
              : 'We will notify you of material changes via email or in-app notification.'}
          </Section>

          <Section title={isBM ? '10. Hubungi kami' : '10. Contact us'}>
            <p>{isBM ? 'Untuk sebarang soalan tentang privasi:' : 'For any privacy-related questions:'}</p>
            <p style={{ marginTop: 8 }}>
              <strong>Email:</strong> <a href="mailto:danielnordin53@gmail.com" style={{ color: '#185FA5' }}>danielnordin53@gmail.com</a>
            </p>
          </Section>
        </div>

        <div style={{
          borderTop: '0.5px solid rgba(0,0,0,0.08)',
          marginTop: 48, paddingTop: 24,
          fontSize: 12, color: 'rgba(29,29,31,0.5)',
          textAlign: 'center',
        }}>
          © 2026 Cotton Candy · <Link href="/terms" style={{ color: 'rgba(29,29,31,0.6)', textDecoration: 'none' }}>
            {isBM ? 'Terma Perkhidmatan' : 'Terms of Service'}
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{
        fontSize: 18, fontWeight: 600,
        letterSpacing: '-0.02em', marginBottom: 8,
        color: '#1d1d1f',
      }}>{title}</h2>
      <div>{children}</div>
    </section>
  )
}
