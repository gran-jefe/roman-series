# Recalled UI-POSTUTME Questions Implementation

Complete implementation of the Recalled UI-POSTUTME Questions feature - an Elite-only section showcasing questions confirmed to have appeared in past Post-UTME exams.

## Overview

This feature allows Elite members to access a curated database of questions that are confirmed to have appeared in past Post-UTME exams from Nigerian universities. Non-Elite users see this as a locked feature with a call-to-action to upgrade.

## Architecture

### Database Schema

#### `recalled_questions` Table
- `id` (UUID, PK): Unique question identifier
- `subject_id` (FK): Links to subjects table
- `university_id` (FK): Links to universities table
- `body` (TEXT): The question text
- `explanation` (TEXT): Answer explanation
- `year` (INT): Year question appeared in exam
- `exam_type` (TEXT): Type of exam (post_utme, post_utme_mock)
- `difficulty_level` (TEXT): easy, medium, or hard
- `created_by` (FK): References admin who uploaded
- `created_at`, `updated_at`: Timestamps

#### `recalled_question_options` Table
- `id` (UUID, PK): Option identifier
- `recalled_question_id` (FK): Links to recalled question
- `label` (TEXT): A, B, C, D, or E
- `body` (TEXT): Option text
- `is_correct` (BOOLEAN): Marks correct answer
- `created_at`: Timestamp

#### `plan_limits` Updates
- Added `has_recalled_questions` (BOOLEAN) column
  - Explorer: false
  - Scholar: false
  - Elite: true

### Row-Level Security (RLS)

**Read Access:** Anyone can view recalled questions and options
**Write Access:** Only admin users (role = 'admin') can insert/update/delete

## Frontend Implementation

### Components

#### `LockedFeature` Component
A reusable component showing locked feature state:
- Feature name and description
- Current user's plan
- Benefits of upgrading
- Call-to-action to upgrade
- Used by non-Elite users

**Location:** `apps/web/app/components/LockedFeature.tsx`

### Pages

#### 1. **User View** - `/practice/recalled-questions`
**Access:** Elite users only (others see LockedFeature)

Features:
- Filter by subject, university, and year
- Display question with all options
- Highlight correct answer
- Show explanations
- Display difficulty levels and year
- Responsive design with loading states

**Location:** `apps/web/app/practice/recalled-questions/page.tsx`

#### 2. **Admin Upload** - `/admin/recalled-questions`
**Access:** Admin users only

Features:
- Create new recalled questions
- Add question text and explanation
- Add multiple choice options (A-D)
- Mark one option as correct
- Set difficulty level and year
- List all uploaded questions in table format
- Filter by subject and university

**Location:** `apps/web/app/admin/recalled-questions/page.tsx`

## Backend Implementation

### Routes

#### User Routes

**GET `/api/recalled-questions`**
- **Auth Required:** Yes (Bearer token)
- **Access Control:** Elite users only
- **Query Parameters:**
  - `subject_id` (optional): Filter by subject UUID
  - `university_id` (optional): Filter by university UUID
  - `year` (optional): Filter by exam year
- **Response:**
  ```json
  {
    "status": "success",
    "data": {
      "questions": [...],
      "total": 25
    }
  }
  ```
- **Error (Non-Elite):**
  ```json
  {
    "status": "error",
    "message": "Recalled questions are available for Elite members only..."
  }
  ```

#### Admin Routes

**POST `/api/admin/recalled-questions`**
- **Auth Required:** Yes (Bearer token)
- **Access Control:** Admin only
- **Request Body:**
  ```json
  {
    "subject_id": "uuid",
    "university_id": "uuid",
    "body": "Question text...",
    "explanation": "Why this answer is correct...",
    "year": 2023,
    "difficulty_level": "medium",
    "options": [
      {"label": "A", "body": "Option A text", "is_correct": false},
      {"label": "B", "body": "Option B text", "is_correct": true},
      ...
    ]
  }
  ```
- **Validations:**
  - Exactly one option must be marked correct
  - All required fields must be provided
  - Options must have A-D labels
- **Response:** Returns created question ID

**GET `/api/admin/recalled-questions`**
- **Auth Required:** Yes
- **Access Control:** Admin only
- **Query Parameters:**
  - `subject_id` (optional)
  - `university_id` (optional)
  - `limit` (default: 50)
  - `offset` (default: 0)
- **Response:** Paginated list of all recalled questions

**PATCH `/api/admin/recalled-questions/:id`**
- **Auth Required:** Yes
- **Access Control:** Admin only
- **Request Body:** Any updatable fields (body, explanation, year, difficulty_level)
- **Response:** Updated question object

**DELETE `/api/admin/recalled-questions/:id`**
- **Auth Required:** Yes
- **Access Control:** Admin only
- **Response:** Success message

### File Location

**Route Definition:** `apps/api/src/routes/recalled-questions.routes.ts`

**Main API File Update:** `apps/api/src/index.ts`
- Added import for `registerRecalledQuestionsRoutes`
- Registered routes with dependencies

## Database Migration

**Migration File:** `supabase/migrations/20260529000001_add_recalled_questions.sql`

Includes:
- Create `recalled_questions` table with constraints
- Create `recalled_question_options` table
- Add `has_recalled_questions` column to `plan_limits`
- Create indexes for performance
- Set up RLS policies
- Update `sessions` table with `is_recalled_questions_session` flag

## Plan Differences

### Feature Matrix

| Feature | Explorer | Scholar | Elite |
|---------|----------|---------|-------|
| Recalled UI-POSTUTME Questions | ✗ Locked | ✗ Locked | ✓ Available |

### User Experience

**Non-Elite Users:**
- See locked state with attractive design
- Understand what they're missing
- See upgrade benefits
- Click to pricing page
- Feature is discoverable but not accessible

**Elite Users:**
- Full access to all recalled questions
- Advanced filtering options
- Can view explanations and difficulty levels
- Practice with proven exam questions

## UI/UX Design

### Locked Feature Screen
- Large lock icon
- Clear explanation of what Elite offers
- Benefits list
- Pricing information
- Prominent upgrade CTA
- Back button to dashboard

### Elite User Interface
- Three-column filter (Subject, University, Year)
- Question display with all details
- Options clearly marked with correct answer highlighted
- Explanation box with blue background
- Difficulty indicator (Easy/Medium/Hard)
- Responsive grid layout
- Loading states

### Admin Interface
- Toggle form visibility
- Step-by-step form with clear labels
- Option selection with radio buttons
- Question list table with sortable columns
- Year and difficulty indicators
- Pagination support

## Security Considerations

1. **Authentication:** All routes require valid Supabase JWT token
2. **Plan-Based Gating:** Non-Elite users get 403 Forbidden with helpful message
3. **Admin-Only Write:** Only admin role can create/update/delete questions
4. **RLS Policies:** Database enforces permissions at row level
5. **Validation:** Backend validates all inputs (required fields, options)
6. **Rate Limiting:** Uses existing `authLimiter` for POST requests

## Testing Checklist

### User Access Control
- [ ] Non-Elite users see locked feature with upgrade CTA
- [ ] Elite users can access recalled questions
- [ ] Invalid tokens get 401 Unauthorized
- [ ] Non-admin users cannot upload questions

### Feature Functionality
- [ ] Filter by subject works
- [ ] Filter by university works
- [ ] Filter by year works
- [ ] Correct answer is highlighted
- [ ] Explanations display correctly
- [ ] Difficulty levels show proper colors

### Admin Upload
- [ ] Form validates required fields
- [ ] Ensures one correct answer
- [ ] Successfully uploads question
- [ ] Question appears in list
- [ ] Can edit uploaded questions
- [ ] Can delete uploaded questions

### Data Integrity
- [ ] Options display with correct labels (A, B, C, D)
- [ ] Relationships to subjects and universities maintained
- [ ] Year filter accurate
- [ ] Difficulty levels correct

## Future Enhancements

1. **Bulk Upload:** CSV import for multiple questions
2. **Analytics:** Track Elite users' performance on recalled questions
3. **Difficulty Ratings:** Let Elite users rate question difficulty
4. **Discussion:** Comments/discussion threads on questions
5. **Timed Practice:** Create timed sessions with recalled questions
6. **Reports:** Admin dashboard showing upload statistics
7. **Versioning:** Track question edits and history
8. **Soft Delete:** Archive instead of permanently deleting
9. **Image Support:** Allow question diagrams/images
10. **Audio Questions:** Support for hearing-based questions

## Files Modified/Created

### Created
- `supabase/migrations/20260529000001_add_recalled_questions.sql`
- `apps/api/src/routes/recalled-questions.routes.ts`
- `apps/web/app/practice/recalled-questions/page.tsx`
- `apps/web/app/admin/recalled-questions/page.tsx`
- `apps/web/app/components/LockedFeature.tsx`
- `RECALLED_QUESTIONS_IMPLEMENTATION.md`

### Modified
- `apps/api/src/index.ts` (added route import and registration)
- `CLAUDE.md` (updated subscription tier information)

## Environment Configuration

No additional environment variables required. Uses existing:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`

## Performance Optimization

1. **Indexes:** Created on subject_id, university_id, year, created_by
2. **Pagination:** Admin list supports limit/offset
3. **RLS:** Efficient database-level filtering
4. **Caching:** Frontend can implement client-side caching
5. **Lazy Loading:** Questions load on filter change

## Deployment Notes

1. Run migration: `supabase migrations up`
2. Verify RLS policies are active
3. Ensure admin users have `role = 'admin'` in profiles
4. Test with multiple user accounts before production
5. Monitor database query performance with large datasets
6. Set up admin access controls in frontend routing

## Support & Maintenance

- Monitor question upload activity
- Review user feedback on questions
- Update explanations if needed
- Archive outdated questions
- Regular backups of question database
