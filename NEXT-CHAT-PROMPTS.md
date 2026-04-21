# Next-Chat Prompts — 5 More SaaS Products

> Copy-paste one of these into a brand-new chat to start the next SaaS. Claude will pick up from the `universal-saas` skill and build it in the same Memoir/Karaoku workflow.

---

## SaaS #2 — Sell Alive

**Paste this into a new chat:**

```
Use the universal-saas skill. Start SaaS #2: Sell Alive.

Concept: A widget that you add to your phone home screen. It only glows / lights up when a message from someone you marked as "love" or "important" comes through. All spam, shop ads, group chats stay silent.

Stack: Next.js 14 PWA (installable), Supabase (profiles + contacts_priority + messages_log), Stripe, Vercel. Bilingual EN + BM. Mobile-first. Palette: neon green glow #00FF88, dark #0A0E0A.

Core pages:
- Landing (hero: "Only the people who matter light up your phone")
- Login (magic link, same as Memoir)
- Pricing (Free = 5 contacts, Day RM3, Month RM12, Year RM89)
- Checkout (promo code)
- Dashboard
  - Home (glowing sticker preview + today's light-ups count)
  - Contacts (add from phone, tag as love/family/important/mute)
  - Keywords (words that trigger urgent glow even from strangers — e.g. "refund", "hospital")
  - History (log of every glow, filterable)
  - Settings (glow color, sound on/off, language)
- API route for the widget itself to poll: /api/widget/check

Build Phase 1: configs, schema.sql, types + PLANS + design tokens, supabase clients, middleware, i18n with ~150 bilingual strings, UI primitives (Button, Logo, LangToggle), landing page, login, auth callback, SETUP.md.

Local path: C:\Users\admin\Desktop\sell-alive
```

---

## SaaS #3 — Web Photobooth

**Paste this into a new chat:**

```
Use the universal-saas skill. Start SaaS #3: Web Photobooth.

Concept: Anyone can start a photo-booth business with just an iPad or laptop + any USB / network printer. Customer walks up → picks a frame → takes 4 photos → prints on the spot. Operator earns money per event.

Stack: Next.js 14, Supabase, Stripe (operator subscriptions), WebUSB + Web Print API, Vercel. Bilingual EN + BM. Palette: retro yellow #FFD93D, carnival red #FF4D4D, cream #FFF8E7.

Core pages:
- Landing (hero: "Turn your iPad into a photobooth business")
- Login, Pricing (Free = 10 prints/month, Day RM25, Month RM99, Year RM799 unlimited), Checkout
- Dashboard
  - Home (today's prints, revenue estimate)
  - Events (create event → get unique /booth/:slug URL)
  - Frames (upload PNG overlays, arrange 4 slots)
  - Printer (connect via WebUSB, test print, queue)
  - Gallery (all photos taken, export as ZIP)
  - Settings (business name, price per strip, payment QR)
- Public booth page /booth/[slug] — tablet-friendly, captures 4 photos with countdown, composites onto frame, shows QR to pay, sends to printer

Build Phase 1: configs, schema.sql (events + photos + frames + printer_jobs + revenue_log), types, supabase clients, middleware, i18n, UI primitives, landing, login, auth callback, SETUP.md.

Local path: C:\Users\admin\Desktop\web-photobooth
```

---

## SaaS #4 — Booking (Wedding Hall / Catering / Vendor)

**Paste this into a new chat:**

```
Use the universal-saas skill. Start SaaS #4: Booking.

Concept: A directory + booking system for wedding halls, catering vendors, and food vendors. Couples browse → check date availability → either fill a quick booking form OR hit a "WhatsApp direct" button that deep-links to the vendor with a pre-filled message.

Stack: Next.js 14, Supabase (listings + bookings + availability_blocks), Stripe (vendor subscriptions to get listed), Vercel. Bilingual EN + BM. Palette: rose gold #E8B4B8, champagne #F5E6D3, deep burgundy #6B2C3E.

Core pages:
- Landing (hero image: bridal lantern, search: date / location / type)
- Listing grid /browse?type=hall|catering|vendor
- Listing detail /listing/[slug] — photos, services, price range, availability calendar, booking form, big green WhatsApp button
- Vendor dashboard
  - Home (upcoming bookings, revenue estimate)
  - My listing (edit photos, services, prices, description)
  - Availability (block dates on a calendar)
  - Bookings (inbox of customer form submissions)
  - Settings
- Couple dashboard (just shows their sent bookings + saved listings)
- Pricing (vendors: Free = 1 listing + 3 bookings/mo, Month RM29, Year RM290; couples: always free)

Build Phase 1: configs, schema.sql, types, supabase clients, middleware, i18n (~200 strings for wedding vocab), UI primitives, landing, login, auth callback, SETUP.md.

Local path: C:\Users\admin\Desktop\booking
```

---

## SaaS #5 — Event Poster + Live Chat + Bus Tracker + Organisation Departments

**Paste this into a new chat:**

```
Use the universal-saas skill. Start SaaS #5: Event Hub.

Concept: Universities and societies create an event "poster page" with live chat. Attendees scan a QR → see the poster → chat with organizers in real-time → optionally track the event bus live (if transport is provided). Every past event auto-archives into the society's "Organisation Departments" module so records never get lost.

Stack: Next.js 14, Supabase Realtime, Geolocation API, Stripe (org subscriptions), Vercel. Bilingual EN + BM. Palette: university navy #1B3A6B, gold accent #E8B84C, cream #F7F4EE.

Core pages:
- Landing (hero: "One QR. All your event questions answered live")
- Login, Pricing (Free = 3 events, Month RM19 / org, Year RM149 / org)
- Dashboard (org-scoped)
  - Home (upcoming events, total attendees)
  - Events list + create event (poster image, date, location, has_bus toggle)
  - Event detail → tabs: Poster, Live Chat (realtime), Bus Tracker, Attendees, Form Submissions
  - Organisation Departments module — tree of Committees/Years/Roles, every past event auto-filed here
  - Members (invite via email, assign roles)
  - Settings (org branding, logo, colors)
- Public event page /e/[slug]
  - Big poster image
  - "Join chat" button (realtime via Supabase channels)
  - If has_bus: "Track bus" tab showing live dot on map (bus driver opens /bus/[event-slug] on their phone, it broadcasts GPS every 10s)
  - Form (custom fields set by organizer)
  - WhatsApp CTA

Build Phase 1: configs, schema.sql (organisations + departments + members + events + chat_messages + bus_pings + form_submissions + realtime), types, supabase clients, middleware, i18n, UI primitives, landing, login, auth callback, SETUP.md.

Local path: C:\Users\admin\Desktop\event-hub
```

---

## SaaS #6 — Lab Report Maker

**Paste this into a new chat:**

```
Use the universal-saas skill. Start SaaS #6: Lab Report Maker.

Concept: University / matriculation / foundation / pre-university students fill a guided wizard (title → aim → apparatus → procedure → data table → graph → discussion → conclusion → references) and get a perfectly formatted PDF lab report matching their institution's rubric.

Stack: Next.js 14, Supabase, Stripe, Vercel, jsPDF (with LaTeX-style numbering), Chart.js for auto graphs from data tables. Bilingual EN + BM. Palette: lab blue #2E7DAF, white #FFFFFF, beaker green #7AB883.

Core pages:
- Landing (hero: "From experiment to A+ report in 15 minutes")
- Login, Pricing (Free = 2 reports/month + watermark, Day RM6, Month RM15, Year RM119 unlimited no watermark)
- Checkout (promo code)
- Dashboard
  - Home (recent reports, reports-this-month counter)
  - New report → 9-step wizard, auto-save each step
  - Reports list (search, filter by subject)
  - Report detail [id] → edit any section, live PDF preview, export
  - Templates gallery (Physics MUET-style, Chemistry matric-style, Biology foundation-style, Engineering final year, etc. — institution presets)
  - Settings (default institution, matric number, lecturer name)
- Data-table editor with auto-graph: user pastes CSV or types rows → picks x/y column → auto Chart.js line/scatter/bar, embedded as PNG in PDF

Build Phase 1: configs, schema.sql (reports + report_sections + templates + data_tables), types with full rubric definitions, supabase clients, middleware, i18n (science vocab in EN + BM), UI primitives, landing, login, auth callback, SETUP.md.

Local path: C:\Users\admin\Desktop\lab-report-maker
```

---

## When any of these Phase 1 builds is done, paste this to continue:

```
Continue [PROJECT NAME] Phase 2. You already built Phase 1. Now build pricing page, checkout page + CheckoutClient.tsx, Stripe checkout API route + webhook, DashboardShell, dashboard home, and all feature pages. Use the Memoir-style file-download + one-terminal-command workflow. Same local path as before.
```

---

🍭 **Have fun building. You are shipping 6 products.**
