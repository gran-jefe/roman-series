# Roman Series Database Setup

This directory contains SQL scripts for setting up the Supabase database for the Roman Series Post-UTME exam prep platform.

## Files Overview

- **schema.sql** — Database table definitions and indexes
- **seed.sql** — Initial data (universities and subjects)
- **rls.sql** — Row Level Security (RLS) policies

## Prerequisites

- Supabase project created at [supabase.com](https://supabase.com)
- Access to your project's SQL Editor or Supabase CLI installed

## Setup Instructions

### Step 1: Run the Schema

This creates all necessary tables and indexes.

#### Option A: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `schema.sql`
5. Paste into the editor
6. Click **Run**

#### Option B: Using Supabase CLI

```bash
supabase db push
# or
supabase db execute < apps/api/src/db/schema.sql
```

### Step 2: Run the Seed Data

This inserts all 9 universities and 8 subjects.

#### Option A: Using Supabase Dashboard

1. In **SQL Editor**, click **New Query**
2. Copy the entire contents of `seed.sql`
3. Paste into the editor
4. Click **Run**

#### Option B: Using Supabase CLI

```bash
supabase db execute < apps/api/src/db/seed.sql
```

### Step 3: Apply Row Level Security (RLS) Policies

This sets up access control for all tables.

#### Option A: Using Supabase Dashboard

1. In **SQL Editor**, click **New Query**
2. Copy the entire contents of `rls.sql`
3. Paste into the editor
4. Click **Run**

#### Option B: Using Supabase CLI

```bash
supabase db execute < apps/api/src/db/rls.sql
```

## Verification

After running all three scripts, verify the setup:

```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check universities
SELECT * FROM universities;

-- Check subjects
SELECT * FROM subjects;

-- Check RLS is enabled on tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

## Database Architecture

### Core Tables

- **universities** — 9 Nigerian universities (UI, OAU, UNILAG, ABU, FUTA, UNN, UNIBEN, FUHSI, LAUTECH)
- **subjects** — 8 exam subjects (English, Biology, Chemistry, Physics, Government, Literature, C.R.S., I.R.S.)
- **questions** — Exam questions linked to subjects and universities
- **options** — Multiple choice answers for questions

### User Tables

- **profiles** — Extended user data (extends auth.users)
- **sessions** — Practice exam sessions taken by users
- **session_answers** — User's answers during a session
- **subscriptions** — User subscription plans

### Relationships

```
universities (1) ← (N) questions → (N) subjects
          ↓
       profiles
          ↓
       sessions ← session_answers → questions → options
          ↓
    subscriptions
```

## Row Level Security (RLS)

RLS policies enforce access control at the database level:

### Public Read Access
- Universities, subjects, questions, options — All authenticated users can read
- Admin-only writes — Only users with `role = 'admin'` can create/update/delete

### Private Data
- **Profiles** — Users can only read/update their own profile
- **Sessions** — Users can only read/update their own sessions
- **SessionAnswers** — Users can only read/update their own answers
- **Subscriptions** — Users can only read their own subscriptions

### Service Role Bypass
- The service role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses all RLS policies
- Use for server-side operations that need full database access

## Environment Variables Required

Set these in your `.env.local`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get these from your Supabase project's **Settings → API** page.

## Connecting from the API

The API initializes Supabase clients in `src/lib/supabase.ts`:

```typescript
import { supabaseAdmin, supabaseClient } from "@/lib/supabase";

// Admin client (server-side, bypasses RLS)
const allQuestions = await supabaseAdmin
  .from("questions")
  .select("*");

// Anon client (respects RLS policies)
const userSessions = await supabaseClient
  .from("sessions")
  .select("*");
```

## Common Queries

### Get all universities
```sql
SELECT * FROM universities ORDER BY name;
```

### Get subjects with color tokens
```sql
SELECT id, name, colour_token FROM subjects ORDER BY name;
```

### Get questions for a specific subject and university
```sql
SELECT q.* FROM questions q
WHERE q.subject_id = '...' AND q.university_id = '...'
ORDER BY q.year DESC;
```

### Get a question with all its options
```sql
SELECT 
  q.*,
  json_agg(o.*) as options
FROM questions q
LEFT JOIN options o ON q.id = o.question_id
WHERE q.id = '...'
GROUP BY q.id;
```

### Get user session history
```sql
SELECT * FROM sessions
WHERE user_id = '...'
ORDER BY started_at DESC;
```

## Troubleshooting

### "relation does not exist"
- Ensure schema.sql has been run successfully
- Check the SQL Editor for any error messages

### "permission denied for schema public"
- Verify your Supabase API key has the correct permissions
- Use the service role key for administrative operations

### RLS policies blocking queries
- Check that authenticated users are querying the correct fields
- Admin operations may need the service role key
- Verify the user's role in the profiles table

## Resetting the Database

To reset and start fresh:

```sql
-- Drop all tables (WARNING: This deletes all data)
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS session_answers CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS options CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS universities CASCADE;
```

Then run schema.sql, seed.sql, and rls.sql again.

## Further Reading

- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
