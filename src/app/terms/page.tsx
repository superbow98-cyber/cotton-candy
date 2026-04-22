export default function TermsPage() {
  return (
    <main style={{ background: '#fff', minHeight: '100vh', color: '#1d1d1f', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <a href="/" style={{ color: '#FF6B9D', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>← Back to Cotton Candy</a>
        <h1 style={{ fontSize: 36, fontWeight: 700, marginTop: 32, marginBottom: 8, letterSpacing: '-0.03em' }}>Terms of Service</h1>
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
    title: '1. Acceptance of Terms',
    content: 'By accessing or using Cotton Candy ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service. These terms apply to all users including free and paid subscribers.',
  },
  {
    title: '2. Description of Service',
    content: 'Cotton Candy is a web-based AI lecture recorder and note organizer that allows students to record lectures, generate structured study notes, and manage notebooks. The Service is provided on a freemium basis with optional paid plans.',
  },
  {
    title: '3. User Accounts',
    content: 'You must sign in with a valid Google account to use Cotton Candy. You are responsible for maintaining the security of your account and all activities that occur under it. You must not share your account credentials with others.',
  },
  {
    title: '4. Acceptable Use',
    content: 'You agree not to use Cotton Candy for any unlawful purpose, to record others without consent, to upload harmful content, or to attempt to reverse-engineer or disrupt the platform. We reserve the right to suspend or terminate accounts that violate these terms.',
  },
  {
    title: '5. Payments and Refunds',
    content: 'Paid plans (Day Pass, Monthly, Yearly) are processed via Stripe. All purchases are final and non-refundable unless required by Malaysian consumer law. Plans are one-time payments and do not auto-renew.',
  },
  {
    title: '6. Plan Limits',
    content: 'Free accounts are limited to 3 lectures total and 60 minutes per lecture. Paid plans unlock higher limits as described on the pricing page. Limits are enforced automatically by the platform.',
  },
  {
    title: '7. Audio Recording Consent',
    content: 'By using the recording feature, you confirm that you have obtained all necessary consents from any individuals being recorded. Cotton Candy is not responsible for any recording made without proper consent.',
  },
  {
    title: '8. Intellectual Property',
    content: 'Cotton Candy and its original content, features, and functionality are owned by the Cotton Candy team and are protected by applicable intellectual property laws. Users retain ownership of any notes and content they generate.',
  },
  {
    title: '9. Disclaimer of Warranties',
    content: 'Cotton Candy is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service, nor the accuracy of AI-generated transcriptions or notes. We are not liable for any loss of data, revenue, or academic outcomes.',
  },
  {
    title: '10. Changes to Terms',
    content: 'We reserve the right to modify these Terms at any time. We will notify users of material changes via email or in-app notification. Continued use of Cotton Candy after changes constitutes your acceptance.',
  },
  {
    title: '11. Governing Law',
    content: 'These Terms shall be governed by and construed in accordance with the laws of Malaysia. Any disputes shall be resolved in the courts of Malaysia.',
  },
  {
    title: '12. Contact',
    content: 'For questions about these Terms, contact us at parcellomalaysia@gmail.com.',
  },
]
