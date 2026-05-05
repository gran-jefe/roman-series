// Shared types for Roman Series monorepo
// Database types and API interfaces

// ============================================================================
// DATABASE MODELS
// ============================================================================

/**
 * University model
 * Represents a Nigerian university participating in Post-UTME
 */
export interface University {
  id: string;
  name: string;
  short_code: string;
  colour_token: string;
  is_available?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Subject model
 * Represents an examination subject
 */
export interface Subject {
  id: string;
  name: string;
  colour_token: string;
  created_at: string;
  updated_at: string;
}

/**
 * Topic model
 * Represents a topic within a subject for a specific university
 */
export interface Topic {
  id: string;
  name: string;
  subject_id: string;
  university_id: string;
  question_count: number;
  created_at: string;
}

/**
 * Question model
 * Represents an exam question
 */
export interface Question {
  id: string;
  subject_id: string;
  university_id: string;
  year?: number;
  body: string;
  explanation?: string;
  topic_id?: string;
  topic_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Option model
 * Represents a multiple choice option for a question
 */
export interface Option {
  id: string;
  question_id: string;
  label: string;
  body: string;
  is_correct: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Profile model
 * Extends Supabase auth.users with additional user data
 */
export interface Profile {
  id: string;
  full_name?: string;
  target_university_id: string;
  target_course: string;
  subject_combination: string[] | null;
  utme_score?: number | null;
  role: "student" | "admin";
  subscription_status: "free" | "active" | "expired";
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Session model
 * Represents a practice exam session
 */
export interface Session {
  id: string;
  user_id: string;
  subject_id?: string;
  university_id?: string;
  topic_id?: string;
  total_questions: number;
  score: number;
  time_taken_seconds?: number;
  completed: boolean;
  started_at: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * SessionAnswer model
 * Represents a user's answer to a question in a session
 */
export interface SessionAnswer {
  id: string;
  session_id: string;
  question_id: string;
  selected_option_id?: string;
  is_correct: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Subscription model
 * Represents a user's subscription plan
 */
export interface Subscription {
  id: string;
  user_id: string;
  plan: "monthly" | "per_university" | "bundle";
  status: "pending" | "active" | "expired" | "failed";
  paystack_reference?: string;
  amount: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// COMPOSITE TYPES
// ============================================================================

/**
 * Question with all its options
 * Used when fetching a question with its answer choices
 */
export interface QuestionWithOptions extends Question {
  options: Option[];
}

/**
 * Session with all its answers
 * Used when fetching a completed session with answer history
 */
export interface SessionWithAnswers extends Session {
  answers: SessionAnswer[];
}

/**
 * Session with full details including answer details
 */
export interface SessionWithFullDetails extends Session {
  answers: Array<
    SessionAnswer & {
      question: Question;
      selected_option?: Option;
    }
  >;
}

/**
 * Profile with target university details
 */
export interface ProfileWithUniversity extends Profile {
  target_university?: University;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard API response envelope
 */
export interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  message?: string;
  timestamp: string;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Auth response with user and profile
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  profile: Profile;
  token: string;
}

// ============================================================================
// REQUEST/BODY TYPES
// ============================================================================

/**
 * Request body for creating/updating a session
 */
export interface CreateSessionRequest {
  subject_id: string;
  university_id: string;
  topic_id?: string;
  total_questions: number | string; // 10, 20, 30, 40, 50, or 'all'
}

/**
 * Request body for submitting an answer
 */
export interface SubmitAnswerRequest {
  session_id: string;
  question_id: string;
  selected_option_id?: string;
}

/**
 * Request body for completing a session
 */
export interface CompleteSessionRequest {
  session_id: string;
  time_taken_seconds: number;
}

/**
 * Request body for creating a subscription
 */
export interface CreateSubscriptionRequest {
  plan: "monthly" | "per_university" | "bundle";
  amount: number;
}

// ============================================================================
// PRACTICE MODE TYPES
// ============================================================================

/**
 * Subject with question count for dashboard display
 */
export interface SubjectWithCount extends Subject {
  question_count: number;
}

/**
 * Session history item with enriched subject/university/topic names
 */
export interface SessionHistoryItem extends Session {
  subject_name: string | null;
  subject_colour_token?: string;
  university_name: string | null;
  university_short_code?: string;
  topic_name?: string;
  percentage: number;
}

/**
 * User statistics for dashboard
 */
export interface UserStats {
  total_sessions: number;
  total_questions_answered: number;
  best_score_percentage: number;
  avg_score_by_subject: Array<{
    subject_id: string;
    subject_name: string;
    avg_percentage: number;
    sessions_count: number;
  }>;
}

/**
 * Student-facing option (is_correct stripped for security)
 */
export interface StudentOption {
  id: string;
  question_id: string;
  label: string;
  body: string;
}

/**
 * Student-facing question without is_correct or explanation
 */
export interface StudentQuestion {
  id: string;
  subject_id: string;
  university_id: string;
  topic_id?: string;
  topic_name?: string;
  body: string;
  options: StudentOption[];
}

/**
 * Error bank question with metadata about wrong attempts
 */
export interface ErrorBankQuestion extends StudentQuestion {
  times_wrong: number;
  last_seen_at: string;
  subject_name: string;
  subject_colour_token: string;
}

/**
 * Response from POST /api/sessions/start
 */
export interface StartSessionResponse {
  session_id: string;
  questions: StudentQuestion[];
  subject: Subject;
  university: University;
  topic?: Topic;
  total_questions: number;
}

/**
 * Answer submission item
 */
export interface SubmitAnswer {
  question_id: string;
  selected_option_id: string | null;
}

/**
 * Answer review item in results
 */
export interface AnswerReview {
  question_id: string;
  question_body: string;
  selected_option_id: string | null;
  is_correct: boolean;
  correct_option_id: string | null;
  explanation: string | null;
  options: Option[];
}

/**
 * Response from POST /api/sessions/:id/submit
 */
export interface SessionResult {
  score: number;
  total: number;
  percentage: number;
  answers: AnswerReview[];
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Topic-level performance analytics
 */
export interface TopicPerformance {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  subject_colour_token: string;
  total_answered: number;
  correct: number;
  avg_percentage: number;
  sessions_count: number;
}

/**
 * Response from GET /api/analytics/overview
 */
export interface AnalyticsOverview {
  total_sessions: number;
  total_questions_answered: number;
  best_score_percentage: number;
  avg_score_overall: number;
  current_streak_days: number;
  longest_streak_days: number;
  total_time_practiced_seconds: number;
  avg_time_per_question_seconds: number;
  avg_score_by_subject: Array<{
    subject_id: string;
    subject_name: string;
    avg_percentage: number;
    sessions_count: number;
  }>;
}

/**
 * Peer ranking item in leaderboard
 */
export interface PeerRankingItem {
  rank: number;
  name_initial: string;
  avg_score: number;
  is_me: boolean;
  sessions_count: number;
}

/**
 * Response from GET /api/analytics/peers
 */
export interface PeerRanking {
  rank: number;
  total_peers: number;
  my_avg: number;
  peers: PeerRankingItem[];
}

/**
 * Cutoff mark for a course at a university
 */
export interface CutoffMark {
  id: string;
  university_id: string;
  course: string;
  year: number;
  utme_cutoff: number;
  putme_weight: number;
  utme_weight: number;
  combined_cutoff: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Response from GET /api/analytics/prediction
 * Shows student's UTME qualification status and predicted Post-UTME target
 */
export interface PredictionResult {
  utme_score: number | null;
  cutoff: {
    course: string;
    year: number;
    utme_cutoff: number;
    combined_cutoff: number;
    utme_weight: number;
    putme_weight: number;
  } | null;
  utme_qualifies: boolean;
  utme_contribution: number;
  current_practice_avg: number;
  predicted_total: number;
  required_putme_score: number;
  status: "on_track" | "at_risk" | "no_data";
}
