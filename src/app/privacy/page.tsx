export default function PrivacyPage() {
  return (
    <main style={{ background: '#fff', minHeight: '100vh', color: '#1d1d1f', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <a href="/" style={{ color: '#FF6B9D', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>← Back to Cotton Candy</a>
        <h1 style={{ fontSize: 36, fontWeight: 700, marginTop: 32, marginBottom: 8, letterSpacing: '-0.03em' }}>Privacy Policy</h1>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 48 }}>Last updated: June 2025</p>

        {sections.map((s) => (
          <section key={s.title} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1d1d1f', marginBottom: 12, letterSpacing: '-0.02em' }}>{s.title}</h2>
            <p style={{ color: 'rgba(29,29,31,0.72)', lineHeight: 1.8, fontSize: 15 }}>{s.content}</p>
          </section>
        ))}

        <p style={{ color: 'rgba(29,29,31,0.4)', fontSize: 13, marginTop: 60, borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: 24 }}>
          © {new Date().getFullYear()} Cotton Candy. All rights reserved. Contact:{' '}
          <a href="mailto:parcellomalaysia@gmail.com" style={{ color: '#FF6B9D' }}>parcellomalaysia@gmail.com</a>
        </p>
      </div>
    </main>
  )
}

const sections = [
  {
    title: '1. Information We Collect',
    content: 'We collect information you provide when you create an account, including your name and email address via Google Sign-In. We also collect usage data such as lectures recorded, notes generated, and subscription history to provide and improve our service.',
  },
  {
    title: '2. How We Use Your Information',
    content: 'Your information is used to operate Cotton Candy, process payments via Stripe, send important account notifications, and improve the platform. We do not sell your personal data to third parties.',
  },
  {
    title: '3. Google Sign-In',
    content: 'Cotton Candy uses Google OAuth for authentication. We only request your basic profile information (name, email, profile picture). We do not access your Google Drive, Gmail, or any other Google services.',
  },
  {
    title: '4. Audio & Transcription Data',
    content: 'When you record a lecture, audio is processed in real-time for transcription purposes. Audio files are not permanently stored after transcription is complete. Generated notes and transcripts are stored securely and are only accessible by you.',
  },
  {
    title: '5. Payments',
    content: "All payments are processed securely by Stripe. Cotton Candy does not store your credit card details. For FPX and GrabPay transactions, payment is handled entirely by Stripe's certified payment infrastructure.",
  },
  {
    title: '6. Data Storage',
    content: 'Your data is stored securely on Supabase (PostgreSQL), hosted on servers compliant with industry security standards. We retain your data for as long as your account is active or as required by law.',
  },
  {
    title: '7. Cookies',
    content: 'Cotton Candy uses session cookies to keep you logged in. We do not use third-party advertising cookies. You can disable cookies in your browser settings, but this may affect app functionality.',
  },
  {
    title: '8. Your Rights',
    content: 'You may request to access, correct, or delete your personal data at any time by emailing us at parcellomalaysia@gmail.com. We will respond within 14 business days.',
  },
  {
    title: '9. Changes to This Policy',
    content: 'We may update this Privacy Policy from time to time. We will notify you of significant changes via email or an in-app notice. Continued use of Cotton Candy after changes constitutes acceptance of the updated policy.',
  },
  {
    title: '10. Contact Us',
    content: 'If you have any questions about this Privacy Policy, please contact us at parcellomalaysia@gmail.com.',
  },
]
