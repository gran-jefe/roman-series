-- Add columns to support multiple report types (report, study_plan)
alter table analytics_reports
  add column if not exists report_type text,
  add column if not exists cached_data jsonb;

-- Set report_type for existing rows (those with report_text)
update analytics_reports
  set report_type = 'report'
  where report_type is null and report_text is not null;

-- Make report_type NOT NULL with default for future inserts
alter table analytics_reports
  alter column report_type set not null,
  alter column report_type set default 'report';

-- Drop old unique constraint on just user_id
drop index if exists analytics_reports_user_id_idx;

-- Create new unique constraint on (user_id, report_type)
create unique index if not exists analytics_reports_user_report_type_idx
  on analytics_reports(user_id, report_type);
