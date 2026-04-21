# Cotton Candy — One-Time Setup

Follow these steps **once** to get Cotton Candy running on your machine and deployed live. Each section is a copy-paste block.

---

## 1. Download and unzip the project

Put the whole `cotton-candy` folder at this exact path:

```
C:\Users\admin\Desktop\cotton-candy
```

---

## 2. Install dependencies (one-time)

Open **Command Prompt** (not PowerShell) and paste:

```cmd
cd C:\Users\admin\Desktop\cotton-candy && npm install
```

Wait ~2 min. When done you'll see `added XXX packages`.

---

## 3. Create Supabase project

1. Go to https://supabase.com/dashboard → **New project**
2. Name: `cotton-candy` · Region: **Southeast Asia (Singapore)** · set a strong DB password
3. Wait ~2 min for project to provision
4. Go to **SQL Editor** → **New query** → paste the ENTIRE contents of `supabase/schema.sql` → **Run**
5. You should see `Success. No rows returned.`

Then get your keys:
- **Project Settings → API**
- Copy **Project URL**, **anon public** key, and **service_role** key

---

## 4. Create Stripe account

1. https://dashboard.stripe.com/register
2. **Developers → API keys** → copy your **secret key** (starts with `sk_test_` or `sk_live_`)
3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://YOUR-VERCEL-DOMAIN.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
   - Copy the **Signing secret** (starts with `whsec_`)

---

## 5. Fill `.env.local`

Create a file named `.env.local` in `C:\Users\admin\Desktop\cotton-candy` with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 6. Run locally

```cmd
cd C:\Users\admin\Desktop\cotton-candy && npm run dev
```

Open http://localhost:3000 — you should see the pink Cotton Candy landing page.

---

## 7. First GitHub push

Create a new empty repo on GitHub (name it `cotton-candy`). Then:

```cmd
cd C:\Users\admin\Desktop\cotton-candy && git init && git add . && git commit -m "feat: cotton candy initial build" && git branch -M main && git remote add origin https://github.com/YOUR-USERNAME/cotton-candy.git && git push -u origin main
```

Replace `YOUR-USERNAME` before running.

---

## 8. Deploy to Vercel

1. https://vercel.com/new → import your `cotton-candy` repo
2. Framework: **Next.js** (auto-detected)
3. **Environment variables** → paste the same 6 vars from `.env.local`
   - Change `NEXT_PUBLIC_SITE_URL` to your real Vercel URL (e.g. `https://cotton-candy.vercel.app`)
4. **Deploy**
5. After it goes live, go back to **Stripe → Webhooks** and edit the endpoint URL to use your real Vercel domain.

---

## 9. Test the full flow

1. Visit `https://cotton-candy.vercel.app`
2. Click **Start free** → enter your email → click the magic link
3. Click **Start new lecture** → fill in title → press the pink record button
4. Allow microphone access → speak for 30 seconds
5. Press **Finish lecture** → download as `.md` or `.pdf`
6. You should see a beautiful pink-headed PDF notebook ✨

---

## Every future update — the repeating workflow

This is the **ONE command pattern** for every code change, per your preferences:

```cmd
cd C:\Users\admin\Desktop\cotton-candy && copy /Y C:\Users\admin\Downloads\<file>.tsx src\<path>\<file>.tsx && git add . && git commit -m "type: description" && git push
```

Vercel auto-deploys in ~2 min. That's it.

---

## Free promo code for launch

A promo code `COTTONLAUNCH` was auto-seeded by `schema.sql` — it grants **1 month free** to the first 100 users. Share it with friends!
