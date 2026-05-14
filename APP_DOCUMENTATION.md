# Roman Series — Complete App Documentation

## Overview
Roman Series is a web platform for Nigerian students preparing for Post-UTME (Post-Unified Tertiary Matriculation Examination) exams. Students select their target university, choose subjects, practice with past exam questions, track performance, and receive AI-generated study reports.

**Current Stage**: Week 4 of 6-week development plan  
**Status**: Three-tier subscriptions, plan-based gating, leaderboard toggles, Google OAuth, AI reports implemented — ready for beta testing

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **State Management**: React Context (AuthContext)
- **HTTP Client**: Axios (custom API wrapper)
- **Toast Notifications**: react-hot-toast
- **Port**: 3000 (dev)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Port**: 4000 (dev)
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (email/password + Google OAuth)
- **AI Model**: Groq API (free tier) for report generation
- **PDF Generation**: PDFKit
- **File Uploads**: Multer (memory storage, 10MB limit)

### Database
- **Provider**: Supabase (PostgreSQL)
- **ORM**: Direct client queries (no ORM)
- **Auth Provider**: Supabase Auth

### Deployment
- **Frontend**: Vercel (planned)
- **Backend**: Railway (planned)
- **Database**: Supabase Cloud

---

## Database Schema

### Tables

#### `profiles`
User profile information.
```
- id (UUID, PK) — Supabase auth user ID
- email (text)
- full_name (text)
- target_university_id (UUID, FK → universities)
- target_course (text)
- subject_combination (text[]) — array of subject IDs
- utme_score (integer) — Post-UTME score (0-400)
- subscription_status (text) — 'explorer', 'scholar', or 'elite'
- last_login (timestamp)
- session_expires_at (timestamp) — 24-hour inactivity timeout
- created_at, updated_at (timestamps)
```

#### `universities`
Nigerian universities offering Post-UTME exams.
```
- id (UUID, PK)
- name (text) — e.g., "University of Ibadan"
- short_code (text) — e.g., "UI"
- colour_token (text) — hex color for UI
- is_available (boolean)
- created_at, updated_at (timestamps)
```

**Current universities**: UI, OAU, UNILAG, ABU, FUTA, UNIBEN, LAUTECH, UNN, FUHSI (9 total)

#### `subjects`
Exam subjects available for practice.
```
- id (UUID, PK)
- name (text) — e.g., "Biology"
- colour_token (text) — hex color
- created_at, updated_at (timestamps)
```

**Current subjects**: Biology, Chemistry, Physics, English, Government, Literature, CRS, IRS (8 total)

#### `topics`
Topics within subjects for a specific university.
```
- id (UUID, PK)
- name (text) — e.g., "Cell Biology"
- subject_id (UUID, FK → subjects)
- university_id (UUID, FK → universities)
- question_count (integer)
- created_at (timestamp)
```

#### `questions`
Past exam questions.
```
- id (UUID, PK)
- subject_id (UUID, FK → subjects)
- university_id (UUID, FK → universities)
- topic_id (UUID, FK → topics)
- body (text) — the question text
- explanation (text) — answer explanation
- created_at, updated_at (timestamps)
```

#### `options`
Answer options for questions (4-5 per question).
```
- id (UUID, PK)
- question_id (UUID, FK → questions)
- label (text) — 'A', 'B', 'C', 'D', 'E'
- body (text) — option text
- is_correct (boolean)
- created_at (timestamp)
```

#### `sessions`
Practice exam sessions taken by users.
```
- id (UUID, PK)
- user_id (UUID, FK → profiles)
- subject_id (UUID, FK → subjects) — nullable for mock exams
- university_id (UUID, FK → universities)
- topic_id (UUID, FK → topics) — nullable
- total_questions (integer)
- score (integer)
- time_taken_seconds (integer) — nullable
- completed (boolean)
- is_mock (boolean) — true for full mock exams
- started_at, ended_at, created_at (timestamps)
```

#### `session_answers`
Answers submitted by users during sessions.
```
- id (UUID, PK)
- session_id (UUID, FK → sessions)
- question_id (UUID, FK → questions)
- selected_option_id (UUID, FK → options) — nullable if skipped
- is_correct (boolean)
- created_at (timestamp)
```

#### `subscriptions`
User subscription records.
```
- id (UUID, PK)
- user_id (UUID, FK → profiles)
- subscription_status (text) — 'explorer', 'scholar', 'elite', 'cancelled'
- plan_id (text) — 'explorer', 'scholar', or 'elite'
- upgraded_from (text) — previous plan if upgraded (e.g., 'scholar' when upgrading to 'elite')
- transaction_reference (text) — Paystack reference
- amount (integer) — in kobo
- started_at, expires_at, created_at (timestamps)
```

#### `cutoff_marks`
Admission cutoff marks by university and course.
```
- id (UUID, PK)
- university_id (UUID, FK → universities)
- course (text)
- year (integer)
- utme_cutoff (integer) — minimum UTME score
- combined_cutoff (float) — weighted combined score
- utme_weight (float) — weight of UTME in calculation
- putme_weight (float) — weight of Post-UTME in calculation
- created_at (timestamp)
```

#### `analytics_reports`
Cached AI-generated study reports (24-hour TTL).
```
- id (UUID, PK)
- user_id (UUID, FK → profiles)
- report_text (text) — the generated report
- generated_at (timestamp)
- expires_at (timestamp) — expires after 24 hours
```

#### `plan_limits`
Feature limits and constraints by subscription tier.
```
- id (UUID, PK)
- plan (text) — 'explorer', 'scholar', or 'elite'
- max_subjects (integer) — max subjects user can select
- questions_per_day (integer) — daily question limit
- mock_exams_per_week (integer) — weekly mock exam limit
- error_bank_history (integer) — number of past errors retained
- leaderboard_scope (text) — 'top20', 'global', or 'cohort'
- advanced_analytics (boolean) — access to percentile, trend forecasting
- created_at (timestamp)
```

---

## API Endpoints

### Authentication (`/api/auth/*`)
- `POST /api/auth/register` — Register new user
  - Body: `{ email, password, full_name, target_university_id, target_course }`
  - Returns: `{ access_token, refresh_token, user }`

- `POST /api/auth/login` — Login with email/password
  - Body: `{ email, password }`
  - Returns: `{ access_token, refresh_token, user }`

- `POST /api/auth/refresh` — Refresh access token
  - Body: `{ refresh_token }`
  - Returns: `{ access_token }`

- `POST /api/auth/logout` — Logout (clears tokens client-side)

- `GET /api/auth/me` — Get current user profile
  - Returns: `{ user, profile }`

- `POST /api/auth/google` — OAuth login callback (Google)

### Subscription Plans
- `GET /api/plans/all` — Get all available plans with feature details
  - Returns: `[ { id, name, price, currency, features: [], limits: {} } ]`

- `POST /api/plans/limits?plan=explorer|scholar|elite` — Get feature limits for a plan
  - Returns: `{ plan, max_subjects, questions_per_day, mock_exams_per_week, error_bank_history, leaderboard_scope, advanced_analytics }`

### Data (`/api/*`)
- `GET /api/universities` — Get all universities
  - Returns: `[ { id, name, short_code, colour_token } ]`

- `GET /api/subjects?universityId=<uuid>` — Get subjects for a university
  - Returns: `[ { id, name, colour_token } ]`

- `GET /api/topics?subjectId=<uuid>&universityId=<uuid>` — Get topics
  - Returns: `[ { id, name, question_count } ]`

- `GET /api/questions?topicId=<uuid>&limit=20` — Get questions with options
  - Returns: `[ { id, body, options: [ { id, label, body } ] } ]`

- `GET /api/cutoff-marks?universityId=<uuid>` — Get cutoff marks for university
  - Returns: `[ { course, year, utme_cutoff, combined_cutoff } ]`

### Sessions & Practice
- `POST /api/sessions/start` — Start a practice session
  - Body: `{ subject_id, university_id, topic_id?, total_questions? }`
  - Returns: `{ session_id, questions: [], subject, university, total_questions }`
  - **Rate limit**: Free users limited to 10 questions; 3 sessions total before upgrade

- `POST /api/sessions/:id/submit` — Submit completed session
  - Body: `{ answers: [ { question_id, selected_option_id } ], time_taken_seconds }`
  - Returns: `{ score, total, percentage, answers: [ { ...detailed answers } ] }`

- `GET /api/sessions/history` — Get user's session history
  - Returns: `[ { id, subject_name, score, percentage, started_at } ]`

- `GET /api/sessions/:id` — Get session details
  - Returns: `{ ...session, session_answers: [ ...answers ] }`

- `GET /api/sessions/wrong-questions` — Get all questions user got wrong
  - Returns: `{ questions: [ { id, body, times_wrong, subject_name, options } ] }`

### Mock Exams
- `POST /api/sessions/mock/start` — Start a full mock exam (4 subjects, 100 questions, 90 minutes)
  - Returns: `{ session_id, questions: [], subjects, total_questions, time_limit_minutes }`
  - **Restriction**: Pro subscribers only

- `POST /api/sessions/error-bank/start` — Start error bank practice (retry wrong questions)
  - Body: `{ question_ids: [] }`
  - Returns: `{ session_id, questions: [], total_questions }`

### Analytics
- `GET /api/analytics/overview` — Overall stats (streak, time, avg score, per-subject breakdown)
  - Returns: `{ total_sessions, avg_score_overall, best_score, total_time_practiced, avg_score_by_subject }`

- `GET /api/analytics/topics` — Performance by topic
  - Returns: `[ { topic_name, subject_name, total_answered, correct, avg_percentage } ]`

- `GET /api/analytics/peers` — Peer ranking (anonymized)
  - Returns: `{ rank, total_peers, my_avg, peers: [ { rank, name_initial, avg_score } ] }`

- `GET /api/analytics/prediction` — Admission prediction based on UTME + practice scores
  - **Plan-gated**: Explorer locked (preview only), Scholar shows base, Elite shows percentile
  - Returns: `{ utme_score, predicted_total, required_putme_score, post_utme_target, gap_percentage, percentile?, status: 'on_track' | 'at_risk' }`
  - For Explorer: `{ locked: true, preview_message: "Unlock with Scholar..." }`

- `GET /api/analytics/report` — Get AI-generated study report (cached 24 hours)
  - Returns: `{ report, from_cache, generated_at, expires_at }`

- `GET /api/analytics/report/download` — Download report as PDF
  - Query param: `?token=<access_token>`
  - Returns: PDF file

### Payments (Paystack)
- `POST /api/payments/initiate` — Initiate payment for new subscription (6-month term)
  - Body: `{ plan: 'scholar'|'elite' }`
  - Returns: `{ authorization_url }` (redirects to Paystack)
  - **Rate limit**: Explorer only; users with active Scholar/Elite cannot purchase again (must wait for expiry)

- `POST /api/payments/upgrade` — Upgrade from Scholar to Elite (adds 6 months to current subscription)
  - Body: `{ target_plan: 'elite' }`
  - Returns: `{ authorization_url }` (pro-rated: ₦1,500 for remaining Scholar term)
  - Only available when current plan is 'scholar'

- `GET /api/payments/status` — Get payment/subscription status
  - Returns: `{ subscription_status, plan_id, expires_at, renewed_count }`
  - `expires_at` is Date + 6 months from purchase/renewal

- `POST /api/payments/webhook` — Paystack callback (internal)
  - Verifies payment and updates subscription status in profiles + subscriptions tables
  - Sets `expires_at = now + 6 months` on successful payment
  - Updates `subscriptions.upgraded_from` when upgrading (e.g., 'scholar' when Scholar→Elite)

### Leaderboard
- `GET /api/leaderboard/top-students` — Get top performing students
  - Query params: `window=weekly|overall`, `scope=global|cohort`
  - **Access Control**:
    - Explorer: top 20 only, global scope only, `is_truncated: true`
    - Scholar: full leaderboard, global scope only, respects window param
    - Elite: full leaderboard, both window and scope, can filter by target_course + subject_combination (cohort)
  - Returns: `{ rankings: [ { rank, name, avg_score } ], window, scope, is_truncated, current_user_rank, total_participants, percentile?, resets_at }`

---

## Frontend Pages & Features

### Public Pages
- **`/`** — Landing page with features, pricing, testimonials
- **`/register`** — Sign up with email/password or Google OAuth
  - Collects: email, password, full name, target university, target course
  - Redirects to `/onboarding` on success

- **`/login`** — Login page
  - Email/password or Google OAuth
  - Redirects to `/dashboard` on success

- **`/pricing`** — Subscription pricing plans
  - **Explorer**: Free (1–2 subjects, 20 Q/day, 1 mock exam lifetime)
  - **Scholar**: ₦3,500 for 6 months (all subjects, unlimited practice, 3 mocks/week) — Most Popular
  - **Elite**: ₦5,000 for 6 months (Scholar + advanced analytics, percentile ranking, cohort insights) — Best Value
  - Scholar→Elite upgrade: Shows "Upgrade for ₦1,500" button if user already on Scholar (extends subscription to Elite tier)
  - **Note**: Subscriptions expire after 6 months; users return to Explorer unless renewed

### Navigation
- **Persistent Navbar** — Visible on all protected pages
  - Links: Dashboard, Mock Exam, Subjects, Error Bank, Analytics, Profile, Logout
  - Icons from lucide-react
  - For Explorer users: tooltip warning "Upgrade to Scholar for unlimited access"
  - Mobile: hamburger menu with same links

### Protected Pages (Logged-in users)
- **`/dashboard`** — Main hub after login
  - Shows: stats cards, mock exam card, subject buttons, session history, error bank, prediction card
  - Quick access to all features

- **`/onboarding`** — Complete profile setup
  - Select target university
  - Select subject combination (required)
  - Redirects to `/dashboard` on completion
  - Shows completion modal if course/UTME score missing

- **`/practice/topics`** — Topic selection for a subject
  - Shows: list of topics with question counts
  - Can filter by subject
  - Buttons to start topic practice or see error bank

- **`/practice/session`** — Active practice exam interface
  - Displays: question, 4-5 options (A-E, shuffled), timer, progress bar
  - Features: previous/next question navigation, skip, submit
  - Shows score and detailed answers on completion

- **`/practice/mock/session`** — Mock full UTME exam
  - 4 subjects × 25 questions = 100 total
  - 90 minutes (proportional if fewer subjects)
  - Same UI as regular practice but continuous across subjects
  - **Results Page** (`/practice/results`):
    - For Explorer users: Shows score/percentage, but "How You Compare" and "Answer Review" sections are blurred
    - Auto-triggers UpgradePrompt modal after 1.5s with message "Your full results are ready. Upgrade to unlock full analytics, performance trends, and your admission probability."
    - "Maybe Later" closes modal (but blur persists), "Upgrade Now" goes to /pricing
    - For Scholar/Elite: Full results visible, no gating

- **`/error-bank`** — Review all wrong answers
  - Shows: questions sorted by times wrong, topic, subject
  - Can filter by subject
  - "Retry" button starts error bank practice session

- **`/analytics`** — Detailed performance analytics
  - Stats cards: streak, practice time, avg score, best score, questions answered
  - **Admission Prediction Card**:
    - Shows: Post-UTME target, current avg, gap percentage (in red)
    - For Explorer: entire card blurred with upgrade overlay
    - For Scholar: shows base prediction without percentile
    - For Elite: shows prediction + percentile ranking message
  - Topic performance: table of all topics with percentages
  - **Leaderboard / Peer Ranking**:
    - Toggle buttons: "This Week" / "All Time" (window: weekly|overall)
    - For Elite users: additional toggle "All Aspirants" / "My Course" (scope: global|cohort)
    - Shows: top 10 rankings, current user highlighted in blue, optional percentile message
    - Explorer: blurred with overlay, shows only "Top 20" truncated
  - **Generate Report button**: Creates AI study report (cached 24h, rate-limited daily)
    - Shows "Fresh ✨" or "From Cache 📦" badge
    - Can download as PDF
    - Button disabled during 24h cooldown with countdown "Next report available in Xh Ym"

- **`/profile`** — User profile settings
  - Edit: full name, target course, UTME score
  - Shows: current subscription status

---

## Current Features

### ✅ Implemented
1. **User Authentication** — Email/password registration, Google OAuth, token refresh, logout
2. **Profile Management** — University/course selection, subject combination, UTME score tracking
3. **Question Bank** — 1000+ questions across 8 subjects, 9 universities, organized by topics
4. **Practice Sessions** — Timed practice with instant scoring, detailed answer review
5. **Mock Exams** — Full 4-subject × 100-question mock exams (90 min) with Scholar+ access
6. **Error Bank** — Retry wrong questions from past sessions
7. **Performance Analytics** — Streak, time tracking, per-subject averages, topic breakdown
8. **Leaderboard System** — Plan-gated leaderboard with window (weekly/overall) and scope (global/cohort for Elite) toggles
9. **Admission Prediction** — UTME-to-Post-UTME score calculation, gap percentage, percentile ranking (Elite only)
10. **AI Study Reports** — Claude/Groq-powered elaborate personalized reports (cached 24h, rate-limited)
11. **PDF Export** — Download reports as formatted PDF
12. **Paystack Integration** — Payment processing with Scholar→Elite upgrade flow
13. **Three-Tier Subscriptions** — Explorer (free), Scholar (₦3,500 for 6 months), Elite (₦5,000 for 6 months) with plan-based feature gating and 6-month expiry
14. **Plan-Based Gating** — Blur overlays on locked features with upsell modals (e.g., Explorer users see blurred results after mock)
15. **Google OAuth** — Google sign-in on login/register with auth callback handler
16. **Persistent Navbar** — Navigation across all protected pages with plan-aware tooltips
17. **Option Shuffling** — Questions display options in random order (fixed labels after shuffle)

### 🟡 In Progress
1. **Email Notifications** — Planned for session results, weekly summaries, subscription confirmations
2. **Admin Dashboard** — Question management, user analytics, payment reconciliation
3. **Session Persistence** — Save progress between app sessions for long mock exams

### ⚫ Not Yet Started
1. **Mobile App** — Native iOS/Android (post-launch)
2. **Study Groups** — Social features (group sessions, shared error banks)
3. **AI Tutoring** — Real-time homework help (separate from automated reports)
4. **Integration with Universities** — Official past question feeds
5. **Performance Predictions** — ML-based score forecasting
6. **Adaptive Difficulty** — Auto-adjust question difficulty based on performance

---

## Deployment & Environment

### Environment Variables
**Frontend** (`apps/web/.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=<key>
NEXT_PUBLIC_WEB_URL=http://localhost:3000
```

**Backend** (`apps/api/.env`):
```
SUPABASE_URL=<url>
SUPABASE_ANON_KEY=<key>
SUPABASE_SERVICE_ROLE_KEY=<key>
DATABASE_URL=postgresql://...
JWT_SECRET=<secret>
PAYSTACK_SECRET_KEY=<key>
PAYSTACK_PUBLIC_KEY=<key>
GROQ_API_KEY=<key>
PORT=4000
WEB_URL=http://localhost:3000
```

### Commands
```bash
# Development
npm run dev              # Run both frontend and API with turbo

# Build
npm run build            # Build all packages

# Database
supabase db push         # Push migrations to Supabase
supabase db pull         # Pull schema from Supabase

# API only
cd apps/api && npm run dev

# Web only
cd apps/web && npm run dev
```

---

## Limitations & Known Issues

1. **Groq API Rate Limiting** — 30 req/min free tier; with daily caching per user, safe for 200+ concurrent users
2. **Paystack Integration** — Webhook validated; Scholar→Elite upgrade pro-rating done server-side; auto-renewal not implemented
3. **No Email System** — Notifications are UI-only (toast messages); password reset emails not yet wired up
4. **Mock Exams** — Restricted to Scholar+; no inactivity timeout (relies on browser session)
5. **Leaderboard Cohort Filtering** — Elite users filtered by target_course + exact subject_combination match (no partial matches)
6. **Analytics Cache** — 24-hour report cache; manual refresh not exposed (user must wait or clear local cache)
7. **Question Bank** — Static; no admin UI for adding questions (SQL-based import only)
8. **Google OAuth** — Requires NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY; Google provider must be configured in Supabase console

---

## Code Organization

```
roman-series/
├── apps/
│   ├── api/                       # Express backend
│   │   ├── src/
│   │   │   ├── routes/           # API route handlers
│   │   │   ├── utils/            # Helpers (shuffleArray, etc.)
│   │   │   ├── lib/              # Database utilities
│   │   │   └── index.ts          # Server entry point
│   │   └── tsconfig.json
│   │
│   └── web/                       # Next.js frontend
│       ├── app/
│       │   ├── (public)/         # Public pages (landing, auth)
│       │   ├── dashboard/        # Protected dashboard
│       │   ├── practice/         # Practice pages
│       │   ├── analytics/        # Analytics pages
│       │   ├── error-bank/       # Error bank pages
│       │   ├── context/          # React contexts (AuthContext)
│       │   └── layout.tsx        # Root layout
│       ├── components/           # Reusable components
│       ├── lib/                  # Utilities (API client, etc.)
│       └── public/               # Static assets
│
├── packages/
│   └── types/                     # Shared TypeScript interfaces
│       └── src/index.ts          # All types exported here
│
├── supabase/
│   └── migrations/               # SQL migrations (version-controlled)
│
└── .env.example                  # Environment variable template
```

---

## Testing Checklist

### Core Features
- [ ] Register → Login → Navigate to dashboard
- [ ] Select subject → Start practice → Answer questions → Submit → See results
- [ ] Mock exam flow (4 subjects, 100 questions, 90 min timer)
- [ ] Error bank: answer wrong → appears in error bank → can retry
- [ ] Analytics: check streak, time, scores, peer rank, prediction
- [ ] Generate report (first time) → see "Fresh ✨" badge
- [ ] Generate report again (within 24h) → see "From Cache 📦" badge
- [ ] Download report as PDF → file saves correctly

### Three-Tier Subscriptions
- [ ] Explorer user: Free plan applied at registration, no payment required
- [ ] Scholar user: Can purchase Scholar from /pricing, payment redirects to Paystack
- [ ] Elite user: Can purchase Elite from /pricing, or upgrade Scholar→Elite for ₦1,500
- [ ] Paystack webhook updates profiles.subscription_status correctly
- [ ] Scholar→Elite upgrade: shows "Upgrade for ₦1,500" button on pricing page

### Plan-Based Gating
- [ ] Explorer: Navbar shows "Limited Access" tooltip
- [ ] Explorer: Analytics prediction card is blurred with "Upgrade to Scholar" overlay
- [ ] Explorer: Analytics leaderboard is blurred (only shows "Top 20" truncated)
- [ ] Explorer: After mock exam, "How You Compare" and "Answer Review" sections are blurred
- [ ] Explorer: Auto-triggers UpgradePrompt modal 1.5s after mock completion
- [ ] Scholar/Elite: All sections visible, no blur, no modals
- [ ] Blur persists even if user closes UpgradePrompt modal (must upgrade)

### Leaderboard Toggles
- [ ] Scholar user: Can toggle "This Week" / "All Time" (window param)
- [ ] Scholar user: Scope is locked to "All Aspirants" (global only)
- [ ] Elite user: Can toggle both window AND scope
- [ ] Elite user: "My Course" scope filters by target_course + subject_combination
- [ ] Elite user: Can see percentile message (e.g., "You're ahead of 75% of students")
- [ ] Current user highlighted in blue in leaderboard

### Predicted Score & Gap
- [ ] Prediction card shows Post-UTME target
- [ ] Gap percentage displayed in red (e.g., "15% gap")
- [ ] Explorer: entire card blurred
- [ ] Scholar: shows gap_percentage, no percentile
- [ ] Elite: shows percentile ranking (e.g., "Top 10%")

### Google OAuth
- [ ] Google button visible on login and register pages
- [ ] Google button positioned below form with divider (— or —)
- [ ] Clicking Google button redirects to Supabase OAuth flow
- [ ] After authorization, callback handler stores tokens and creates profile
- [ ] User redirected to /onboarding if no subjects selected, else /dashboard

### Edge Cases
- [ ] No completed sessions → analytics shows "No data"
- [ ] UTME score not set → prediction says "no_data"
- [ ] All questions answered correct → error bank is empty
- [ ] Question options are randomly shuffled → labels always A-E
- [ ] Timer runs out → session auto-submits
- [ ] User on Scholar tries accessing Elite-only features → sees blur + tooltip

---

## Contact & Notes

**Project Lead**: Adeleke Sherifdeen Adeboye  
**Repository**: `/Users/granjefe/GRAN_JEFE_PROJECTS/roman-series`  
**Development Stage**: Week 4 of 6  
**Next Milestone**: Beta user testing with three-tier tiers; admin dashboard for payments & users

**Key Decisions**:
- Three-tier subscription model (Explorer free, Scholar ₦3,500, Elite ₦5,000) replaces previous free/pro
- Plan-based feature gating via blur overlays + upsell modals (not page redirects)
- Leaderboard window/scope toggles only for Scholar+ (gated by plan, not hidden)
- Using Claude/Groq free API for report generation; rate-limited with 24h caching per user
- Supabase Auth for Google OAuth; redirect callback flow for session exchange
