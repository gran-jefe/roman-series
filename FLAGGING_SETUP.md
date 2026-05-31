# Flagging System Database Setup

The flagging system requires the `flagged_questions` table to be created in your Supabase database.

## Error You're Seeing
When users try to flag questions, they get: `"Failed to flag question"`

This happens because the `flagged_questions` table doesn't exist yet in the database.

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select your project: `roman-series` (mvulfjwkswtewcbpdflt)

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy the Migration SQL**
   - Open the file: `supabase/migrations/20260531000001_flagging_system.sql`
   - Copy ALL the contents (from `CREATE TABLE` through the last `CREATE POLICY`)

4. **Paste and Execute**
   - Paste the SQL into the SQL Editor
   - Click "Run" (or Ctrl+Enter / Cmd+Enter)
   - Wait for it to complete (should show "Success")

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

This will automatically detect and apply the migration.

### Option 3: Manual Table Creation

If you prefer to create the table manually through the dashboard:

```sql
CREATE TABLE IF NOT EXISTS flagged_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS flagged_questions_user_id_idx ON flagged_questions(user_id);
CREATE INDEX IF NOT EXISTS flagged_questions_question_id_idx ON flagged_questions(question_id);
CREATE INDEX IF NOT EXISTS flagged_questions_session_id_idx ON flagged_questions(session_id);
CREATE INDEX IF NOT EXISTS flagged_questions_created_at_idx ON flagged_questions(created_at DESC);

ALTER TABLE flagged_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flagged questions"
  ON flagged_questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can flag questions"
  ON flagged_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flags"
  ON flagged_questions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flags"
  ON flagged_questions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all flagged questions"
  ON flagged_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

## What Gets Created

The migration creates:
- **flagged_questions** table - stores questions flagged by users
- **Indexes** - for fast queries on user_id, question_id, session_id, and created_at
- **Row Level Security (RLS)** - ensures:
  - Users can only see/modify their own flags
  - Admins can see all flags
  - Flags are automatically deleted when questions or users are deleted

## Verifying it Works

After applying the migration:

1. Open the app in your browser
2. Go to `/practice/mock/session` (or any practice session)
3. Click the Flag button on a question
4. The question should be flagged successfully without errors

## API Endpoints

Once the table is set up, these endpoints will work:

- **POST /api/flagging/flag** - Flag a question
- **DELETE /api/flagging/flag/:question_id** - Unflag a question
- **GET /api/flagging/flags** - Get user's flagged questions
- **GET /api/flagging/flags/:question_id** - Check if specific question is flagged
- **GET /api/admin/flagging/all** - Admin: view all flagged questions

## Admin Dashboard

Admins can view all flagged questions at: `/admin/flagged-questions`

This shows:
- All flagged questions across all users
- Filter by user ID
- Pagination (50 items per page)
- Reason/notes for each flag
- Timestamps
