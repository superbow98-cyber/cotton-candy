# 🍭 Cotton Candy

> Your lectures, written for you — live.

Cotton Candy listens to your class through your phone mic and writes a clean markdown note in real time — then exports it as a printable PDF notebook when the lecture ends.

---

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** — Postgres + Auth (magic link) + Realtime + RLS
- **Stripe** — hybrid one-time + subscription billing
- **Web Speech API** — live on-device transcription (Chrome / Edge / Android)
- **jsPDF** — PDF notebook generation
- **Tailwind CSS** + design tokens + bilingual EN/BM

## Plans

| Plan    | Price    | Lectures | Min / lecture | Notebooks | AI summary |
|---------|----------|----------|---------------|-----------|------------|
| Free    | RM0      | 3        | 30            | 1         | ✗          |
| Day     | RM5      | 10       | 180           | 3         | ✓          |
| Monthly | RM19/mo  | 100      | 240           | 20        | ✓          |
| Yearly  | RM149/yr | ∞        | 480           | ∞         | ✓          |

## Core features

- 🎙️ Big pink record button — one tap to start
- 📝 Live markdown transcript — every sentence becomes a bullet as it's spoken
- 🌟 Star, 📌 topic, 🔢 formula, ❓ question — tag moments while listening
- 📘 Auto-timeline & keyword extraction
- ⬇️ Export as `.md` or printable A4 `.pdf`
- 📚 Group lectures into notebooks
- 🌐 Bilingual: English + Bahasa Malaysia
- 📱 Mobile-first: sidebar on desktop, bottom nav + drawer on phone

## Getting started

See [`SETUP.md`](./SETUP.md) for the full walkthrough.

Quick start:

```cmd
npm install
npm run dev
```

## Folder structure

```
cotton-candy/
├── supabase/schema.sql          Database schema + RLS + realtime
├── src/
│   ├── middleware.ts            Protects /dashboard routes
│   ├── app/
│   │   ├── page.tsx             Landing (hero, how, features, pricing)
│   │   ├── login/               Magic-link auth
│   │   ├── auth/callback/       Session exchange
│   │   ├── pricing/             Plan grid
│   │   ├── checkout/            Stripe redirect + promo code
│   │   ├── dashboard/
│   │   │   ├── layout.tsx       DashboardShell wrapper
│   │   │   ├── page.tsx         Home (stats + recent)
│   │   │   ├── lectures/        List + new + [id] recorder
│   │   │   ├── notebooks/       Group + multi-PDF export
│   │   │   └── settings/        Plan, language, sign out
│   │   └── api/
│   │       ├── checkout/        Stripe session + promo redeem
│   │       └── webhooks/stripe/ Plan granting
│   ├── components/
│   │   ├── dashboard/DashboardShell.tsx
│   │   ├── lecture/LectureRecorder.tsx    ← the core feature
│   │   └── ui/{Button,Logo,LangToggle}
│   ├── lib/
│   │   ├── supabase/{client,server}.ts
│   │   ├── i18n/{translations,LangProvider}.ts(x)
│   │   └── export.ts            md + PDF + keywords + clock helper
│   └── types/index.ts           Profile, Lecture, Notebook, PLANS, design tokens
```

## License

MIT

— built with the `universal-saas` skill, following the Memoir / Karaoku blueprint 🌸
