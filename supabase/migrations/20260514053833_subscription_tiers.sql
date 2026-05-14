-- Migration: Implement subscription tiers (Explorer, Scholar, Elite)

-- 1. Update profiles table: subscription_status with new tiers
-- Drop the old constraint first
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

-- Migrate existing values
UPDATE profiles SET subscription_status = 'explorer' WHERE subscription_status = 'free';
UPDATE profiles SET subscription_status = 'scholar' WHERE subscription_status = 'active';

-- Add the new constraint with three tiers
ALTER TABLE profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('explorer', 'scholar', 'elite'));

ALTER TABLE profiles
  ALTER COLUMN subscription_status SET DEFAULT 'explorer';

-- 2. Update subscriptions table
-- Add plan_id column if it doesn't exist
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_id text DEFAULT 'scholar';

-- Drop old constraint if exists
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_id_check;

-- Add check constraint for plan_id
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_id_check
  CHECK (plan_id IN ('explorer', 'scholar', 'elite'));

-- Add plan_price column (amount in kobo)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_price integer;

-- Add upgraded_from column to track Scholar -> Elite upgrades
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS upgraded_from text;

-- 3. Update sessions table
-- Add mock_week_start to track 7-day rolling window for Scholar mock limits
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS mock_week_start timestamp with time zone;

-- 4. Create plan_limits table
create table if not exists plan_limits (
  id                uuid primary key default gen_random_uuid(),
  plan_id           text not null unique,
  daily_question_limit integer,
  max_subjects      integer,
  mock_exam_limit   text not null,
  error_bank_limit  integer,
  leaderboard_scope text not null,
  can_see_predicted_score boolean not null default false,
  can_see_percentile boolean not null default false,
  has_hard_mode     boolean not null default false,
  has_course_ranking boolean not null default false,
  created_at        timestamp with time zone default now(),

  constraint plan_limits_plan_id_check check (plan_id IN ('explorer', 'scholar', 'elite')),
  constraint plan_limits_mock_exam_limit_check check (mock_exam_limit IN ('once_ever', 'three_per_week', 'unlimited')),
  constraint plan_limits_leaderboard_scope_check check (leaderboard_scope IN ('top_20_global', 'full_global', 'full_global_and_cohort'))
);

-- Create index on plan_id for fast lookups
create index if not exists plan_limits_plan_id_idx on plan_limits(plan_id);

-- 5. Seed plan_limits with the three subscription tiers (only if not already seeded)
insert into plan_limits (
  plan_id,
  daily_question_limit,
  max_subjects,
  mock_exam_limit,
  error_bank_limit,
  leaderboard_scope,
  can_see_predicted_score,
  can_see_percentile,
  has_hard_mode,
  has_course_ranking
) values
(
  'explorer',
  20,
  2,
  'once_ever',
  10,
  'top_20_global',
  false,
  false,
  false,
  false
),
(
  'scholar',
  null,
  null,
  'three_per_week',
  null,
  'full_global',
  true,
  false,
  false,
  false
),
(
  'elite',
  null,
  null,
  'unlimited',
  null,
  'full_global_and_cohort',
  true,
  true,
  true,
  true
)
on conflict (plan_id) do nothing;

-- Enable RLS on plan_limits (public read-only)
alter table plan_limits enable row level security;

-- Drop policy if it exists and recreate it
drop policy if exists "Anyone can view plan limits" on plan_limits;

create policy "Anyone can view plan limits"
  on plan_limits for select
  using (true);
