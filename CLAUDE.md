# Roman Series — Post-UTME Exam Prep Platform

## Project overview
A web platform for Nigerian students preparing for Post-UTME exams.
Students pick their target university, select a subject, and practice
timed past questions with scoring and performance tracking. Live at **romanseries.com.ng**.

## Monorepo structure
- apps/web — Next.js 14 App Router + Tailwind CSS + TypeScript (port 3002 dev, deployed to Vercel)
- apps/api — Node.js + Express + TypeScript (port 4000 dev, deployed to Render)
- packages/types — Legacy shared types (NOT used by apps/api; inlined locally instead)

## Tech stack
- Frontend: Next.js 14.2.35, Tailwind CSS, TypeScript, Supabase Auth
- Backend: Node.js + Express, TypeScript, Supabase PostgreSQL client
- Database: PostgreSQL via Supabase (mvulfjwkswtewcbpdflt)
- Auth: Supabase Auth (email/password + Google OAuth)
- Payments: Paystack (payment processing)
- AI: Anthropic Claude (analytics reports via Groq API)
- Deployment: Vercel (web), Render (api)

## Colour palette
- Navy: #0D1B2A — navbar, sidebar, hero
- Forest green: #1A7A4A — brand accent, buttons, CTAs
- Ember: #C4522A — errors, wrong answers, warnings
- Off-white: #F7F9FC — page background
- Subject colours: biology #1A7A4A, government #1E3A5F,
  chemistry #8B2252, literature #C4522A, crs #D97B20,
  irs #B0287A, english #2166B2, physics #7B4F1A

## Database Schema (Supabase PostgreSQL)
Tables (with RLS policies):
- **universities** — UI, OAU, UNILAG, ABU, FUTA, etc. (UI is active; others locked as "Coming Soon")
- **subjects** — By university (Biology, Chemistry, Government, Literature, English, Physics, CRS, IRS)
- **questions** — Organised by topic (extracted from Word document headings; no year filtering)
- **options** — Multiple choice answers (A, B, C, D)
- **profiles** — User data (full_name, email, phone, university, subject, subscription_status)
- **sessions** — Practice sessions (topic-based, includes is_mock flag for mock exams)
- **session_answers** — User answers during a session (tracks correctness, time taken)
- **subscriptions** — Payment records (Paystack reference, expiry, status)
- **plan_limits** — Feature limits per subscription tier (admin-configured)
- **analytics_reports** — AI-generated PDF reports (Claude via Groq API)
- **recalled_questions** — Elite-only: curated past exam questions with difficulty/year
- **flagged_questions** — Questions flagged by users for review
- **cutoff_marks** — University cutoff scores (admin-maintained)

## Deployment

### Frontend (Vercel)
- **Production**: romanseries.com.ng (custom domain)
- **Fallback**: romanseriess.vercel.app
- Environment variables set in Vercel dashboard
- Auto-deploys on main branch push

### Backend (Render)
- **Production API**: https://roman-series-api.onrender.com
- Environment variables set in Render dashboard
- Node.js/Express server with TypeScript

### Database (Supabase)
- **Project ID**: mvulfjwkswtewcbpdflt
- **Region**: Default (US-based)
- PostgreSQL with RLS policies enabled
- All required tables created via migrations

## Subscription Tiers

### Feature Comparison

| Feature | Explorer | Scholar | Elite |
|---------|----------|---------|-------|
| Subjects | 1–2 | All | All |
| Daily question limit | 20/day | Unlimited | Unlimited |
| Mock exams | 2 (lifetime) | 3/week | Unlimited |
| Error bank | Last 10 | Full | Full |
| Analytics | Basic | Detailed | Advanced |
| Predicted score | ✗ | Basic | Advanced |
| Percentile ranking | ✗ | ✗ | ✓ |
| Cohort insights | ✗ | ✗ | ✓ |
| Course comparison | ✗ | ✗ | ✓ |
| **Recalled Questions** | **✗** | **✗** | **✓** |
| Hard mode exams | ✗ | ✗ | ✓ |

### Pricing
- **Explorer (Free)**: 1–2 subjects, 20 questions/day, 1 mock exam, basic analytics
- **Scholar (₦3,500/6 months)**: All subjects, unlimited practice, 3 mock exams/week, full error bank, detailed analytics, leaderboard ranking
- **Elite (₦5,000/6 months)**: Scholar features + percentile ranking, cohort insights, recalled questions, hard-mode exams, advanced analytics

## API base URL
- Dev: http://localhost:4000
- Env var: NEXT_PUBLIC_API_URL

## What's Working ✅

### Authentication & Core User Flows
- Register (email/password) with university & subject selection
- Login with email/password and Google OAuth
- Logout with session cleanup
- Password reset (forgot-password → reset-password flow)
- Profile completion modal on first login
- User profiles with subscription status

### Dashboard & Navigation
- University + subject selection on dashboard
- Topic-based question discovery (no year-based filtering)
- Subject-specific question filters
- Topic breadcrumb navigation
- Navbar with user profile badge (Explorer/Scholar/Elite indicator with star for Elite)

### Practice Sessions
- Timed practice sessions by topic
- Multiple choice questions with instant feedback
- Session timer and progress tracking
- Immediate results page with score, performance metrics
- Session history saved to database
- Error bank showing failed answers

### Mock Exams
- Mock exam mode with full-length test
- Plan-based access (Explorer: 1 lifetime, Scholar: 3/week, Elite: unlimited)
- Mock exam gating with upgrade prompts
- Hard mode exams (Elite only)

### Scoring & Analytics
- Per-session scoring (correct/incorrect/unanswered tracking)
- Performance analytics dashboard
- AI-generated PDF reports (Claude + Groq)
- Leaderboard with global rankings
- Percentile ranking (Elite)
- Cohort insights (Elite)

### Payments
- Paystack integration for subscriptions
- Subscription status stored in Supabase
- Plan expiry tracking (6-month subscriptions)
- Promo pricing display with countdown timer

### Admin Panel
- User management (view, search, filter by plan)
- Question upload via Word document parser
- Question review and editing
- Flagged questions review interface
- Cutoff marks management
- Recalled questions curation (Elite-only questions)

### Special Features
- Countdown campaign banner (toggled via env var)
- Real student testimonials on landing page
- Landing page with sophisticated, beautiful UX
- Elegant off-white navbar and blush background theme
- LockedFeature component for non-accessible features

### Platform Features
- Full leaderboard with sorting and filters (by subject, timeframe)
- Question flagging for admin review
- Analytics dashboard with charts (if charting lib installed)
- Mobile-responsive design throughout

## Known Issues / Pending ⚠️

### Word Document Parser Issue
- Question upload parser returning 0 questions from Word files
- Topics are auto-extracted from document headings but questions not being parsed
- Needs debugging: likely issue in Word document parsing logic
- Blocks full end-to-end testing with real uploaded questions

### Architecture Notes
- **packages/types NOT used in apps/api** — Types are inlined locally in apps/api/src/types/index.ts
- Questions organised by topic, not year — no year filtering in UI or API
- **Only UI university is active** — OAU, UNILAB, ABU, FUTA locked with "Coming Soon" (design decision to focus on one university first)
- RLS policies in place but worth auditing for security

## Coding Conventions
- Named exports only (no default exports for utilities)
- Functional components only (no class components)
- async/await, never raw .then() chains
- interfaces over types for object shapes
- Tailwind for all styling — no inline styles or CSS modules
- Types defined locally in apps/api/src/types, NOT from packages/types

## Environment Variables

### Frontend (apps/web/.env.local → Vercel dashboard)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
NEXT_PUBLIC_API_URL=http://localhost:4000 (or production API URL)
NEXT_PUBLIC_WEB_URL=http://localhost:3002 (or romanseries.com.ng)
NEXT_PUBLIC_COUNTDOWN_MODE=false
NEXT_PUBLIC_COUNTDOWN_END_DATE=2026-07-15T23:59:59Z
```

### Backend (apps/api/.env → Render dashboard)
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRY=86400
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
NEXT_PUBLIC_API_URL=
GROQ_API_KEY=
COUNTDOWN_MODE=false
COUNTDOWN_END_DATE=
```

## Dev Commands
- Run all (web + api): `turbo dev` (from root)
- Web only: `cd apps/web && npm run dev` (runs on 3002)
- API only: `cd apps/api && npm run dev` (runs on 4000)
- Build web: `cd apps/web && npm run build`
- Build API: `cd apps/api && npm run build`

## Current Build Stage
**Feature-complete MVP** — All core features implemented and deployed:
- Three-tier subscriptions with proper gating
- Authentication (email/Google)
- Practice sessions + mock exams
- Scoring + analytics
- Admin panel with question upload
- Paystack payments
- Leaderboard + cohort insights
- Landing page + branding

**Remaining: Word parser debugging before full launch with real question data.**