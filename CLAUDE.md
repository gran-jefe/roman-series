# Roman Series — Post-UTME Exam Prep Platform

## Project overview
A web platform for Nigerian students preparing for Post-UTME exams.
Students pick their target university, select a subject, and practice
timed past questions with scoring and performance tracking.

## Monorepo structure
- apps/web — Next.js 14 App Router + Tailwind CSS + TypeScript (port 3000)
- apps/api — Node.js + Express + TypeScript (port 4000)
- packages/types — Shared TypeScript interfaces used by both apps

## Tech stack
- Frontend: Next.js 14, Tailwind CSS, TypeScript
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL via Supabase
- Auth: Supabase Auth (email/password + Google OAuth)
- Payments: Paystack
- Deployment: Vercel (web), Railway (api)

## Colour palette
- Navy: #0D1B2A — navbar, sidebar, hero
- Forest green: #1A7A4A — brand accent, buttons, CTAs
- Ember: #C4522A — errors, wrong answers, warnings
- Off-white: #F7F9FC — page background
- Subject colours: biology #1A7A4A, government #1E3A5F,
  chemistry #8B2252, literature #C4522A, crs #D97B20,
  irs #B0287A, english #2166B2, physics #7B4F1A

## Database (Supabase)
Tables: universities, subjects, questions, options, profiles,
sessions, session_answers, subscriptions, plan_limits, analytics_reports, cutoff_marks
Shared types live in packages/types/src/index.ts

## Subscription Tiers
- **Explorer (Free)**: 1–2 subjects, 20 questions/day, 1 mock exam (lifetime), basic analytics
- **Scholar (₦3,500/6 months)**: All subjects, unlimited practice, 3 mock exams/week, full error bank, detailed analytics — expires after 6 months
- **Elite (₦5,000/6 months)**: Everything in Scholar + advanced scoring, admission probability, percentile ranking, cohort insights — expires after 6 months

## API base URL
- Dev: http://localhost:4000
- Env var: NEXT_PUBLIC_API_URL

## Coding conventions
- Use named exports only, no default exports for utilities
- All components must be functional (no class components)
- Use async/await, never raw .then() chains
- interfaces over types for object shapes
- Tailwind for all styling — no inline styles, no CSS modules
- Import shared types from packages/types not locally defined

## Current build stage
Week 4 of 6 — Three-tier subscriptions (Explorer/Scholar/Elite), leaderboard with toggles, plan-based gating, Google OAuth, AI analytics reports with PDF export, persistent navbar

## Environment variables
See .env.example at root for all required variables.
Both apps/web and apps/api have their own .env files.

## Commands
- Run everything: turbo dev (from root)
- Web only: cd apps/web && npm run dev
- API only: cd apps/api && npm run dev