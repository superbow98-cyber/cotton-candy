# Repeating Steps — The Cotton Candy Workflow

> Your `.md` preference made concrete. Use this file for every edit.

---

## The Memoir-style update pattern (what we always do)

Every time you want to change something in Cotton Candy:

1. **Tell Claude what to change** — "ubah X" / "fix Y" / "add Z"
2. **Claude creates the new file(s)** in `/mnt/user-data/outputs/`
3. **You download** each file (they go to `C:\Users\admin\Downloads\`)
4. **Paste ONE command block** into Command Prompt
5. **Vercel auto-deploys** in ~2 min

---

## The one-terminal-command pattern

### Single file change

```cmd
cd C:\Users\admin\Desktop\cotton-candy && copy /Y C:\Users\admin\Downloads\FILENAME.tsx src\APP\PATH\FILENAME.tsx && git add . && git commit -m "type: short description" && git push
```

### Multiple file change (chain with `&&`)

```cmd
cd C:\Users\admin\Desktop\cotton-candy && copy /Y C:\Users\admin\Downloads\page.tsx src\app\dashboard\page.tsx && copy /Y C:\Users\admin\Downloads\DashboardShell.tsx src\components\dashboard\DashboardShell.tsx && git add . && git commit -m "ui: redesign dashboard home" && git push
```

---

## Commit message convention

| Prefix      | Use when                         |
|-------------|----------------------------------|
| `feat:`     | New feature or section           |
| `fix:`      | Bug fix                          |
| `ui:`       | Visual / design change only      |
| `refactor:` | Restructure, no behavior change  |
| `content:`  | Copy / text only                 |
| `deploy:`   | Env vars / Vercel config         |

---

## Common file paths (for copy commands)

| What you want to change                   | Path                                               |
|-------------------------------------------|----------------------------------------------------|
| Landing page                              | `src\app\page.tsx`                                 |
| Login page                                | `src\app\login\page.tsx`                           |
| Pricing page                              | `src\app\pricing\page.tsx`                         |
| Checkout client                           | `src\app\checkout\CheckoutClient.tsx`              |
| Dashboard home                            | `src\app\dashboard\page.tsx`                       |
| Lectures list                             | `src\app\dashboard\lectures\page.tsx`              |
| New lecture form                          | `src\app\dashboard\lectures\new\page.tsx`          |
| Recorder page wrapper                     | `src\app\dashboard\lectures\[id]\page.tsx`         |
| **The recorder itself** (core feature)    | `src\components\lecture\LectureRecorder.tsx`       |
| Notebooks page                            | `src\app\dashboard\notebooks\page.tsx`             |
| Settings page                             | `src\app\dashboard\settings\page.tsx`              |
| Sidebar / bottom nav                      | `src\components\dashboard\DashboardShell.tsx`      |
| Button component                          | `src\components\ui\Button.tsx`                     |
| Logo                                      | `src\components\ui\Logo.tsx`                       |
| All translations (EN + BM)                | `src\lib\i18n\translations.ts`                     |
| Design colors / plans / types             | `src\types\index.ts`                               |
| PDF + markdown + keyword export           | `src\lib\export.ts`                                |
| Stripe checkout session                   | `src\app\api\checkout\route.ts`                    |
| Stripe webhook                            | `src\app\api\webhooks\stripe\route.ts`             |
| Database schema                           | `supabase\schema.sql`                              |

---

## Schema changes (SQL)

When Claude gives you new SQL, don't use the copy command. Instead:

1. Open https://supabase.com/dashboard → your `cotton-candy` project → **SQL Editor**
2. **New query** → paste the SQL → **Run**
3. Done.

---

## When Vercel deploy fails

Check the build log at https://vercel.com/dashboard → cotton-candy → Deployments

Common fixes:
- **Missing env var** → Settings → Environment Variables → add it → re-deploy
- **TypeScript / ESLint error** → already bypassed in `next.config.js`, shouldn't happen
- **Module not found** → make sure you pushed all changed files

---

## When speech recognition doesn't work

Web Speech API is Chrome / Edge / Android-Chrome only.

- ❌ Safari / iOS — not supported
- ❌ Firefox — not supported
- ✅ Chrome desktop
- ✅ Edge desktop
- ✅ Chrome Android
- ✅ Samsung Internet Android

If the red mic icon is crossed out, click the 🔒 in the address bar → site settings → Microphone → Allow.

---

## Starting the next SaaS project

When this Cotton Candy project is done, open a new chat and paste:

> Start SaaS #2: **Sell Alive**. Use the `universal-saas` skill. Same Memoir/Karaoku workflow. Green glow palette. Build Phase 1: package.json, schema.sql, types, supabase clients, middleware, i18n, UI primitives, layout, landing, login, auth callback. Local path: `C:\Users\admin\Desktop\sell-alive`.

Same phrase pattern works for:
- SaaS #3 → `web-photobooth` (retro yellow)
- SaaS #4 → `booking` (rose gold)
- SaaS #5 → `event-poster` (navy) — includes Bus Tracker & Organisation Departments module
- SaaS #6 → `lab-report-maker` (lab blue)

---

## Support quick-reference

- **Live site** — https://cotton-candy.vercel.app (once deployed)
- **Supabase dashboard** — https://supabase.com/dashboard
- **Stripe dashboard** — https://dashboard.stripe.com
- **Vercel dashboard** — https://vercel.com/dashboard
- **GitHub repo** — https://github.com/YOUR-USERNAME/cotton-candy

---

_Keep this file open in a second tab every time you iterate._ 🍭
