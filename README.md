<div align="center">

<img src="public/logo-no-bg-white.png" alt="Discotive Logo" width="80" />

# DISCOTIVE OS

### The Unified Career Engine for the Next Generation of Operators.

**Stop Guessing. Start Executing. Get Ranked.**

[![Live Platform](https://img.shields.io/badge/LIVE-discotive.in-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://www.discotive.in)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Gen2-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)

</div>

---

## What is Discotive?

The global career development market is broken. Students spend 2–4 years in an information fog — consuming content without a clear execution path, unable to verify their credibility, and competing on job platforms that rank them by keyword density, not real capability.

**Discotive converts a confusing professional future into a deterministic, verifiable, scored system.**

One platform. One score. Your entire career — quantified, verified, and globally ranked.

---

## The Discotive Score — The Number That Tells the Truth

Every action on Discotive feeds into a single, atomic, real-time number: **your Discotive Score.** It's not vanity. It's a precision instrument.

The score tracks:

| Event                         | Points    | Notes                               |
| ----------------------------- | --------- | ----------------------------------- |
| Daily Login                   | +10       | IST timezone, once per calendar day |
| OS Initialization             | +70       | One-time onboarding bonus           |
| Onboarding Complete           | +50       | After profile completion            |
| Task Execution                | +5 to +30 | Per task, based on type             |
| Task Reverted                 | -15       | Penalty for unchecking              |
| Vault Asset Verified (Weak)   | +10       | Admin-assigned                      |
| Vault Asset Verified (Medium) | +20       | Admin-assigned                      |
| Vault Asset Verified (Strong) | +30       | Admin-assigned                      |
| Alliance Forged               | +15       | Mutual connection accepted          |
| Alliance Sent                 | +5        | Rate-limited: 5/day max             |
| Missed Day Penalty            | -15       | Applied by CRON at 23:59 IST        |
| Profile View                  | +1        | Unique per device                   |

### Position Matrix — Know Exactly Where You Stand

For the first time, you don't have to guess whether you're "pretty good." Discotive tells you precisely:

- **Global Rank** — Your exact percentile among all verified operators worldwide
- **Domain Rank** — Where you stand within your specific field (Engineering, Design, Marketing, etc.)
- **Niche Rank** — Rank within your micro-specialization
- **Network Rank** — Your position among the people you're actually competing with

> _"Top 5% globally, Top 12% in Product Management, Top 3% among my network."_ — This is the level of precision Discotive delivers.

---

## Core Modules

### 🏆 Global Arena (Leaderboard)

Cursor-paginated, multi-dimensional leaderboard with filtering by domain, niche, and country. Competitive intelligence through X-Ray competitor analysis (Pro). Track rivals, forge alliances, and climb — with real-time score updates.

### 🔒 Asset Vault

Zero-trust credential storage backed by Firebase Storage and SHA-256 hashing. Every certificate, project, award, and proof of work you upload goes through a human admin verification pipeline — graded as Weak, Medium, or Strong. Verified assets appear on your public profile and score points. This is not a portfolio. This is evidence.

### 📚 Learn Engine

A curated learning database of courses, certificates, and videos tagged by domain. Every item has a unique **Discotive Learn ID** — a permanent, immutable identifier. When you complete a course and upload the certificate, our system cross-references the Learn ID to verify completion. Integrated watch-time tracking for videos awards proportional points (up to +10 pts) based on how much you actually watched.

### 🎯 Opportunities Engine

Real opportunities — jobs, internships, freelance projects, hackathons, college fests, mentorships — across every domain. Admin-curated. Filtered by domain, type, location, and deadline. Selection probability shown for each opportunity based on your current Discotive Score and profile completeness. Not just listings — an intelligent matching layer.

### 🤝 Connective — The Professional Network

A secure, encrypted social feed and networking system built for operators, not influencers. Features:

- **Alliance System** — Mutual connection requests. Accepting a request awards both parties +15 pts. Rate-limited to 5 requests/day (Essential) to enforce intentional networking.
- **Competitor Radar** — Mark anyone as a competitor. Track their score. They get notified (anonymously on Essential, revealed on Pro) — keeping everyone sharp.
- **Execution Feed** — Share achievements, discoveries, and milestones. Like, comment, and mention fellow operators. Posts require sign-in; no anonymous noise.
- **Direct Messages** — Encrypted DMs with real-time typing indicators powered by Firebase RTDB hybrid architecture.

### 📓 Agenda — The In-Built Diary (Pro)

A private, encrypted journal and planning tool. Rich-text editor powered by TipTap. Templates for daily reviews, goal-setting, and progress tracking. 100% private — zero admin access. Your thoughts, your execution log, your accountability system.

### 🔗 App Connectors & Vault

Connect external apps to your Discotive profile — GitHub, LinkedIn, and more. Connector hub with verification workflows. Each verified connector strengthens your public profile credibility and can award score points.

### 📊 Dashboard — Command Center

Real-time telemetry for your career:

- Live score with last mutation reason and amount
- Score trajectory chart (1W / 1M / All-time)
- Consistency Engine heatmap (daily login streaks)
- Percentile positioning across all dimensions
- Vault status summary
- Ally network overview
- Opportunity matches
- Quick actions

---

## Colists — The New Knowledge Format

Blogs are dead. Carousels are forgettable. **Colists are different.**

A Colist is a carousel-format knowledge piece — paginated, immersive, one idea per screen. Think of it as a visual essay designed for how people actually consume information in 2025.

**What makes Colists special:**

- **Resonance Score** — Every Colist has a Colist Score that grows with saves, views, and page applause. Hit milestones (+50, +100, +250, +500, +1000) and both reader and author are rewarded.
- **Verification Tiers** — Discotive Original, Strong, Medium, Weak. Curated and graded by our team.
- **Forking Engine** — Pro users can fork Strong-rated Colists and build on top of them.
- **Page Applause** — Double-tap any page in a Colist to burst gold applause. Your appreciation is tracked per page.
- **Save States** — Your reading progress is saved. Return exactly where you left off.
- **Live Polls** — Interactive polls embedded in Colists for real-time audience opinion.

Colists live at `/colists` — accessible even without an account, so they serve as an acquisition surface.

---

## Grace — The Embedded AI Career Assistant

Grace is Discotive's floating AI assistant, powered by Gemini 2.5 Flash. Accessible from anywhere in the app via a draggable, edge-snapping trigger button.

Grace handles:

- Structured topic flows (Score, Vault, Network, Pro, Support)
- Free-form AI chat with full career context
- Billing and support ticket routing
- Feedback collection

Grace is implemented as a zero-cost-on-idle component — no API calls until a user actively types.

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                 CLIENT — React 19                    │
│                                                      │
│  Dashboard   Leaderboard   Vault   Connective        │
│  Learn       Opportunities  Agenda  Colists          │
│  Grace AI    Notifications  Profile Settings         │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              BACKEND — Firebase                      │
│                                                      │
│  Cloud Functions Gen 2 (Node 22)                     │
│  Firestore (multi-region, composite indexes)         │
│  Firebase Storage (encrypted, SHA-256)               │
│  Firebase Auth (Email + Google OAuth)                │
│  Firebase RTDB (presence, typing, live pings)        │
│  Firebase App Check (reCAPTCHA Enterprise)           │
│  Razorpay (subscription billing)                     │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                AI LAYER — Gemini                     │
│                                                      │
│  Grace Chat (Gemini 2.5 Flash)                       │
│  Asset Verification AI (Gemini Flash)                │
│  Career Calibration Engine                           │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend

- **Framework:** React 19 (Vite 7)
- **Routing:** React Router DOM v7
- **Styling:** Tailwind CSS 3.4 + clsx + tailwind-merge
- **Animation:** Framer Motion 12
- **Charts:** Recharts 3
- **Rich Text:** TipTap 3
- **State:** Zustand 5 + TanStack Query 5
- **Virtualization:** TanStack Virtual 3
- **PWA:** vite-plugin-pwa
- **PDF Export:** @react-pdf/renderer
- **Error Tracking:** Sentry

### Backend

- **Runtime:** Firebase Cloud Functions Gen 2 (Node 22)
- **Database:** Firestore (multi-region, composite indexes)
- **Realtime:** Firebase RTDB (presence, typing indicators, telemetry)
- **Storage:** Firebase Storage
- **Auth:** Firebase Auth (Email + Google OAuth)
- **Security:** Firebase App Check (reCAPTCHA Enterprise)
- **Payments:** Razorpay Subscriptions
- **AI:** Google Gemini 2.5 Flash + 1.5 Flash

### Infrastructure

- **Frontend Hosting:** Vercel (Edge CDN)
- **Functions:** Google Cloud Run (Gen 2)
- **Analytics:** Firebase Analytics + Umami (self-hosted)
- **Monitoring:** Sentry (Performance + Replay)
- **CI/CD:** Vercel Git Integration

---

## Repository Structure

```text
discotive/
├── src/
│   ├── components/
│   │   ├── dashboard/       # Widgets, charts, telemetry
│   │   ├── colists/         # Colist reader, home, creator, profile
│   │   └── ui/              # Base UI primitives (Button, Skeleton, BentoCard)
│   ├── contexts/
│   │   └── AuthContext.jsx  # Firebase Auth state
│   ├── hooks/
│   │   ├── useUserData.js   # Firestore user data with session cache
│   │   ├── useNetwork.js    # Full networking engine (feed, DMs, alliances)
│   │   ├── useDashboardData.js  # Score history, percentiles
│   │   ├── useTelemetryStream.js  # Live RTDB telemetry
│   │   └── useYouTubePlayer.js  # YouTube IFrame API hook
│   ├── lib/
│   │   ├── scoreEngine.js   # Atomic score mutations via transactions
│   │   ├── TierEngine.js    # Monetization limits (ESSENTIAL/PRO/ENTERPRISE)
│   │   ├── discotiveLearn.js  # Learn DB, ID generation, verification
│   │   ├── colistConstants.js  # Colist scoring, milestones, constants
│   │   └── gemini.js        # AI gateway client (all calls via Cloud Functions)
│   ├── pages/
│   │   ├── Dashboard.jsx    # Command Center
│   │   ├── Leaderboard.jsx  # Global Arena
│   │   ├── Vault.jsx        # Asset Vault + App Connectors
│   │   ├── Connective.jsx   # Feed, Network, DMs
│   │   ├── Learn.jsx        # Learning Engine
│   │   ├── Opportunities.jsx  # Opportunities Engine
│   │   ├── Agenda.jsx       # Private Diary (Pro)
│   │   ├── Colists.jsx      # Colist platform
│   │   ├── Landing.jsx      # Public acquisition page
│   │   └── Profile.jsx      # Operator profile
│   ├── stores/
│   │   ├── useAppStore.js   # Global app state (Zustand)
│   │   └── useConnectiveStore.js  # Network state
│   └── layouts/
│       └── MainLayout.jsx   # Dual-paradigm nav (desktop sidebar / mobile bottom)
├── functions/
│   └── index.js             # All Cloud Functions Gen 2
├── api/
│   ├── og/profile.jsx       # OG image generation (Vercel Edge)
│   ├── profile-meta.js      # Public profile SEO injection
│   └── scrape-og.js         # URL metadata scraper
├── firestore.rules          # Security rules
├── firestore.indexes.json   # Composite indexes
└── vite.config.js
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project with Blaze plan (required for Cloud Functions)

### 1. Clone & Install

```bash
git clone https://github.com/discotive/discotive-os.git
cd discotive-os
npm install
cd functions && npm install && cd ..
```

### 2. Environment Variables

Create `.env.local` in the root:

```env
# Firebase Client Config
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Security
VITE_RECAPTCHA_KEY=          # reCAPTCHA Enterprise site key

# Payments
VITE_RAZORPAY_KEY_ID=        # Public key only

# Monitoring
VITE_SENTRY_DSN=
VITE_APPCHECK_DEBUG_TOKEN=   # Dev only
```

Firebase Function secrets (set via CLI):

```bash
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
firebase functions:secrets:set GEMINI_API_KEY
```

### 3. Deploy Backend

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only functions
```

### 4. Run Development Server

```bash
npm run dev
```

### 5. Deploy Frontend

```bash
npm run build
vercel --prod
```

---

## Tier System

| Feature                     | Essential (Free) | Pro               | Enterprise      |
| --------------------------- | ---------------- | ----------------- | --------------- |
| Discotive Score             | ✅               | ✅                | ✅              |
| Global Leaderboard          | ✅               | ✅                | ✅              |
| Asset Vault                 | 5 assets / 15MB  | 50 assets / 100MB | Unlimited / 1GB |
| Connective (Feed + DMs)     | ✅               | ✅                | ✅              |
| Colists                     | Read ✅          | Read + Create ✅  | ✅              |
| Agenda (Diary)              | ❌               | ✅                | ✅              |
| X-Ray Competitor Analysis   | ❌               | ✅                | ✅              |
| Alliance Requests / Day     | 5                | 50                | 200             |
| Daily Comparisons           | 1                | 3                 | 10              |
| Priority Vault Verification | ❌               | ✅                | ✅              |
| ML Data Opt-Out             | ❌               | ✅                | ✅              |

**Pricing:** ₹99/month · $1.99/month (Annual: ₹999/year · $19.99/year)

---

## Security Architecture

- **Firebase App Check** — reCAPTCHA Enterprise blocks unauthorized API access from non-app clients
- **Firestore Security Rules** — Row-level security; score mutations are locked to Cloud Functions and strictly validated pipelines
- **Score Integrity** — All score mutations use atomic Firestore transactions. Direct score writes from the client are blocked at the rules layer
- **Asset Integrity** — SHA-256 hashing on all vault uploads. Admin verification pipeline before any public display
- **Zero-Trust Vault** — Vault assets are private by default; only verified assets appear on public profiles
- **Rate Limiting** — Alliance requests, comparisons, and AI calls all have tier-aware rate limits enforced both client-side and in Cloud Functions

For vulnerability reports: security@discotive.in (24-hour response SLA)

---

## Deployment Checklist

Before every production deployment:

- [ ] `npm run lint` passes with zero errors
- [ ] `npm run build` completes without warnings
- [ ] Firestore security rules deployed
- [ ] All Cloud Function secrets configured
- [ ] Razorpay webhook URL verified
- [ ] App Check enforcement status verified
- [ ] Sentry DSN configured in Vercel environment
- [ ] vercel.json rewrite rules verified for public profile routing (`/@:handle`)

---

## Architecture Decisions

### Why Firebase over Supabase/PlanetScale?

Firebase App Check provides the best client-side abuse prevention for a consumer app. Firestore's real-time listeners are zero-configuration. Firebase Auth + Storage + Functions in a single ecosystem eliminates cross-service CORS complexity.

### Why Gemini over OpenAI?

Google Cloud's shared billing with Firebase Functions keeps cost-per-request lowest for Gen 2 functions. Gemini 1.5 Flash's structured JSON output mode eliminates regex parsing for data generation. Gemini 2.5 Flash powers Grace with lower latency for conversational responses.

### Why Colists instead of a standard blog?

Blogs are consumed passively. Colists are consumed actively — one idea per page, with a resonance score that rewards quality content. The carousel format matches how users already consume information on mobile, but structured for depth instead of dopamine.

### Why a Score over a Profile?

Profiles are static. A score is dynamic — it compresses all your career activity into a single, honest, comparable number. It creates a feedback loop: every action has a measurable consequence, which drives the daily active behavior that makes the platform valuable.

---

## Contributing

This is an internal engineering repository. External contributions are not accepted at this stage.

**Internal Team Protocol:**

1. All features branch from `main` with prefix `feat/`, `fix/`, `hotfix/`
2. No direct pushes to `main` — all changes via Pull Request
3. PRs require one senior engineer review
4. Cloud Functions must pass `firebase deploy --only functions` locally before PR
5. All new Firestore queries must have corresponding composite indexes in `firestore.indexes.json`

**Code Standards:**

- Zero `console.log` in production — use `console.error` with context tags `[ModuleName]`
- All Cloud Functions must be Gen 2 (`firebase-functions/v2/https`)
- React state mutations must be atomic
- Score mutations must go through `scoreEngine.js` — never direct Firestore writes
- All AI calls must go through `discotiveAIGateway` Cloud Function — never direct client-side API key usage

---

## License

Proprietary. All rights reserved. © 2026 Discotive.

---

<div align="center">

**Built by operators. For operators.**

[discotive.in](https://www.discotive.in) · [Instagram](https://instagram.com/discotive) · [LinkedIn](https://linkedin.com/company/discotive)

_Built in Jaipur, India._

</div>
