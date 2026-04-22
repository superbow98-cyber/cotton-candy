'use client'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LangProvider'

export default function TermsPage() {
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
          {isBM ? 'Terma Perkhidmatan' : 'Terms of Service'}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.5)', marginBottom: 32 }}>
          {isBM ? 'Terakhir dikemaskini: 22 April 2026' : 'Last updated: April 22, 2026'}
        </p>

        <div style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(29,29,31,0.85)' }}>
          <Section title={isBM ? '1. Penerimaan terma' : '1. Acceptance of terms'}>
            {isBM
              ? 'Dengan menggunakan Cotton Candy, anda bersetuju dengan terma ini. Jika tidak bersetuju, sila jangan gunakan perkhidmatan kami.'
              : 'By using Cotton Candy, you agree to these terms. If you do not agree, please do not use our services.'}
          </Section>

          <Section title={isBM ? '2. Perkhidmatan' : '2. Our service'}>
            {isBM
              ? 'Cotton Candy menyediakan rakaman kuliah dengan transkripsi AI, penjanaan nota, dan ciri eksport. Perkhidmatan ini adalah AS-IS tanpa jaminan.'
              : 'Cotton Candy provides lecture recording with AI transcription, note generation, and export features. The service is provided AS-IS without warranty.'}
          </Section>

          <Section title={isBM ? '3. Akaun pengguna' : '3. User accounts'}>
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>{isBM ? 'Anda mesti berumur 13 tahun ke atas untuk menggunakan Cotton Candy.' : 'You must be 13 or older to use Cotton Candy.'}</li>
              <li>{isBM ? 'Anda bertanggungjawab atas keselamatan akaun anda.' : 'You are responsible for your account security.'}</li>
              <li>{isBM ? 'Jangan kongsi akaun anda dengan orang lain.' : 'Do not share your account with others.'}</li>
            </ul>
          </Section>

          <Section title={isBM ? '4. Penggunaan boleh terima' : '4. Acceptable use'}>
            {isBM ? 'Anda TIDAK boleh:' : 'You may NOT:'}
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>{isBM ? 'Merakam tanpa kebenaran orang yang dirakam (ikut undang-undang tempatan).' : 'Record people without consent (follow local laws).'}</li>
              <li>{isBM ? 'Merakam kandungan hak cipta tanpa kebenaran.' : 'Record copyrighted content without permission.'}</li>
              <li>{isBM ? 'Menggunakan perkhidmatan untuk tujuan menyalahi undang-undang.' : 'Use the service for illegal purposes.'}</li>
              <li>{isBM ? 'Cuba untuk akses data pengguna lain atau memintas had pelan.' : "Attempt to access other users' data or bypass plan limits."}</li>
              <li>{isBM ? 'Menjual semula atau memindahkan perkhidmatan.' : 'Resell or redistribute the service.'}</li>
            </ul>
          </Section>

          <Section title={isBM ? '5. Pelan dan pembayaran' : '5. Plans and payments'}>
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>{isBM ? 'Semua bayaran adalah SEKALI sahaja (bukan langganan).' : 'All payments are ONE-TIME (not subscriptions).'}</li>
              <li>{isBM ? 'Pelan: Percuma, Day Pass (RM 8), Bulanan (RM 25), Tahunan (RM 100).' : 'Plans: Free, Day Pass (RM 8), Monthly (RM 25), Yearly (RM 100).'}</li>
              <li>{isBM ? 'Pelan bermula serta-merta selepas pembayaran disahkan.' : 'Plans start immediately upon payment confirmation.'}</li>
              <li>{isBM ? 'Pembayaran adalah muktamad kecuali bagi masalah teknikal ketara.' : 'Payments are final except for material technical issues.'}</li>
              <li>{isBM ? 'Harga tertakluk kepada perubahan. Pengguna semasa akan diberi notis.' : 'Prices subject to change. Existing users will be notified.'}</li>
            </ul>
          </Section>

          <Section title={isBM ? '6. Bayaran balik' : '6. Refunds'}>
            {isBM
              ? 'Bayaran balik dipertimbangkan kes demi kes untuk masalah teknikal ketara dalam tempoh 7 hari selepas pembelian. Hubungi kami dengan butiran.'
              : 'Refunds are considered on a case-by-case basis for material technical issues within 7 days of purchase. Contact us with details.'}
          </Section>

          <Section title={isBM ? '7. Had pelan' : '7. Plan limits'}>
            {isBM
              ? 'Setiap pelan mempunyai had bilangan kuliah dan jam audio. Had ini dikuatkuasakan secara automatik. Kami berhak untuk menggantung akaun yang cuba memintas had.'
              : 'Each plan has limits on number of recordings and audio hours. These limits are automatically enforced. We reserve the right to suspend accounts attempting to bypass limits.'}
          </Section>

          <Section title={isBM ? '8. Kandungan pengguna' : '8. User content'}>
            {isBM
              ? 'Anda kekal pemilik kandungan yang anda rakam dan hasilkan di Cotton Candy. Kami hanya memproses data untuk menyediakan perkhidmatan kepada anda.'
              : 'You retain ownership of content you record and generate in Cotton Candy. We only process data to provide the service to you.'}
          </Section>

          <Section title={isBM ? '9. Ketersediaan perkhidmatan' : '9. Service availability'}>
            {isBM
              ? 'Kami berusaha untuk uptime tinggi tetapi tidak menjamin perkhidmatan tanpa gangguan. Kemas kini, penyelenggaraan, atau isu pihak ketiga (Groq, Gemini) boleh menyebabkan gangguan sementara.'
              : 'We strive for high uptime but do not guarantee uninterrupted service. Updates, maintenance, or third-party issues (Groq, Gemini) may cause temporary disruptions.'}
          </Section>

          <Section title={isBM ? '10. Penamatan' : '10. Termination'}>
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>{isBM ? 'Anda boleh memadam akaun pada bila-bila masa.' : 'You can delete your account at any time.'}</li>
              <li>{isBM ? 'Kami boleh menamatkan akaun yang melanggar terma ini.' : 'We may terminate accounts that violate these terms.'}</li>
              <li>{isBM ? 'Selepas penamatan, data anda akan dipadam dalam masa 30 hari.' : 'After termination, your data will be deleted within 30 days.'}</li>
            </ul>
          </Section>

          <Section title={isBM ? '11. Had liabiliti' : '11. Limitation of liability'}>
            {isBM
              ? 'Cotton Candy tidak bertanggungjawab atas sebarang kerugian tidak langsung, termasuk kehilangan data, kehilangan keuntungan, atau gangguan perniagaan. Liabiliti maksimum kami adalah terhad kepada jumlah yang anda bayar dalam tempoh 12 bulan lalu.'
              : 'Cotton Candy is not liable for any indirect damages, including data loss, lost profits, or business disruption. Our maximum liability is limited to the amount you paid in the last 12 months.'}
          </Section>

          <Section title={isBM ? '12. Undang-undang terpakai' : '12. Governing law'}>
            {isBM
              ? 'Terma ini dikuatkuasakan di bawah undang-undang Malaysia. Sebarang pertikaian akan diselesaikan di mahkamah Malaysia.'
              : 'These terms are governed by the laws of Malaysia. Any disputes will be resolved in Malaysian courts.'}
          </Section>

          <Section title={isBM ? '13. Hubungi' : '13. Contact'}>
            <p>{isBM ? 'Untuk soalan tentang terma:' : 'For questions about these terms:'}</p>
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
          © 2026 Cotton Candy · <Link href="/privacy" style={{ color: 'rgba(29,29,31,0.6)', textDecoration: 'none' }}>
            {isBM ? 'Dasar Privasi' : 'Privacy Policy'}
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
