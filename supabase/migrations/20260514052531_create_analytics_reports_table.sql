-- Create analytics_reports table for caching generated reports
create table analytics_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  report_text text not null,
  generated_at timestamptz not null default now(),
  expires_at   timestamptz not null
);

-- Only ever need one row per user
create unique index analytics_reports_user_id_idx on analytics_reports(user_id);

-- Enable RLS
alter table analytics_reports enable row level security;

-- Users can only see their own reports
create policy "Users can view their own reports"
  on analytics_reports for select
  using (auth.uid() = user_id);

-- Users can insert/update their own reports
create policy "Users can upsert their own reports"
  on analytics_reports for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reports"
  on analytics_reports for update
  using (auth.uid() = user_id);
