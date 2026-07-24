import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import multer from "multer";
import crypto from "crypto";
import { parseRomanSeriesDocument } from "../lib/questionParser";
import { resolveUserFromToken } from "../middleware/requireAuth";
import { firebaseAdminAuth } from "../lib/firebaseAdmin";
import { batchQuery } from "../lib/supabase";

interface AdminDeps {
  supabaseAdmin: SupabaseClient;
  upload: multer.Multer;
  uploadCache: Map<string, { parsed: any; expiresAt: number }>;
}

export interface ProfileFilters {
  plans: string[];
  courses: string[];
  subjectIds: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

function parseListParam(value: unknown): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.map(String) : String(value).split(",");
  return raw.map((s) => s.trim()).filter(Boolean);
}

// Query filters shared by the users list, the CSV export, and announcement
// recipient resolution, so all three always agree on who matches a given
// plan/course/subject/date-range combination.
export function parseProfileFilters(query: Record<string, unknown>): ProfileFilters {
  let dateTo = (query.date_to as string) || undefined;
  // A date-only value (no time component) needs to be pushed to end-of-day,
  // otherwise `.lte("created_at", ...)` would exclude everything from that day.
  if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    dateTo = `${dateTo}T23:59:59.999Z`;
  }

  return {
    plans: parseListParam(query.plans),
    courses: parseListParam(query.courses),
    subjectIds: parseListParam(query.subjects),
    dateFrom: (query.date_from as string) || undefined,
    dateTo,
    search: (query.search as string) || undefined,
  };
}

export function applyProfileFilters<T extends { in: Function; overlaps: Function; gte: Function; lte: Function; or: Function }>(
  query: T,
  filters: ProfileFilters
): T {
  let q: any = query;
  if (filters.plans.length) q = q.in("subscription_status", filters.plans);
  if (filters.courses.length) q = q.in("target_course", filters.courses);
  if (filters.subjectIds.length) q = q.overlaps("subject_combination", filters.subjectIds);
  if (filters.dateFrom) q = q.gte("created_at", filters.dateFrom);
  if (filters.dateTo) q = q.lte("created_at", filters.dateTo);
  if (filters.search) {
    // PostgREST's .or() syntax gives meaning to "," "(" ")" - strip them so a
    // stray character in an admin's search box can't break the filter string.
    const safeSearch = filters.search.replace(/[,()]/g, "");
    if (safeSearch) {
      q = q.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
    }
  }
  return q;
}

// Helper to check admin auth
export async function checkAdminAuth(
  req: Request,
  res: Response,
  supabaseAdmin: SupabaseClient
): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      status: "error",
      message: "Missing or invalid Authorization header",
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  const token = authHeader.substring(7);
  const resolved = await resolveUserFromToken(token, supabaseAdmin).catch(() => null);

  if (!resolved) {
    res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  if (resolved.userRole !== "admin") {
    res.status(403).json({
      status: "error",
      message: "Admin access required",
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  return resolved.userId;
}


export function registerAdminRoutes(app: Express, deps: AdminDeps) {
  const { supabaseAdmin, upload, uploadCache } = deps;

  console.log('[registerAdminRoutes] Registering admin routes...');
  console.log('[registerAdminRoutes] upload middleware available:', !!upload);
  console.log('[registerAdminRoutes] uploadCache available:', !!uploadCache);

  // GET /api/admin/stats
  app.get("/api/admin/stats", async (req: Request, res: Response) => {
    console.log('[GET /api/admin/stats] Called');
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // `{ count: "exact", head: true }` asks PostgREST for a server-side row
      // count without returning any rows, so these aren't capped at the
      // default 1000-row page size the way `.select("id")` + `.length` was.
      const [usersRes, sessionsRes, questionsRes, newUsersRes, subscribersRes] =
        await Promise.all([
          supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
          supabaseAdmin
            .from("sessions")
            .select("id", { count: "exact", head: true })
            .gte("started_at", today.toISOString()),
          supabaseAdmin.from("questions").select("id", { count: "exact", head: true }),
          supabaseAdmin
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .gte("created_at", sevenDaysAgo),
          supabaseAdmin
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("subscription_status", "active"),
        ]);

      // Revenue needs the actual `amount` values, not just a count, so it
      // can't use head:true — page through in batches of 1000 instead of a
      // single `.select("amount")`, which Supabase silently caps at 1000 rows.
      let totalRevenueKobo = 0;
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabaseAdmin
          .from("subscriptions")
          .select("amount")
          .eq("status", "active")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        totalRevenueKobo += (data || []).reduce((sum, s: any) => sum + (s.amount || 0), 0);
        if (!data || data.length < pageSize) break;
      }

      res.json({
        status: "success",
        data: {
          total_users: usersRes.count || 0,
          sessions_today: sessionsRes.count || 0,
          total_revenue: Math.round(totalRevenueKobo / 100),
          total_questions: questionsRes.count || 0,
          new_users_this_week: newUsersRes.count || 0,
          total_subscribers: subscribersRes.count || 0,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/stats] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/activity - Recent user activity feed, merged from
  // sessions, feedback, flagged questions, signups and subscriptions.
  app.get("/api/admin/activity", async (req: Request, res: Response) => {
    const adminId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!adminId) return;

    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "50"), 200);
      const typesParam = (req.query.types as string) || "";
      const requestedTypes = typesParam
        ? typesParam.split(",").map((t) => t.trim()).filter(Boolean)
        : ["session", "feedback", "flag", "signup", "subscription", "analytics"];
      const search = ((req.query.search as string) || "").trim();

      // Fetch a generous window per source, then merge + sort in memory —
      // simplest way to produce one time-ordered feed across five tables
      // without a dedicated activity_log table.
      const perSourceLimit = Math.max(limit, 100);

      // If searching, resolve matching profile ids first so every source
      // can be filtered by user without a cross-table SQL join.
      let matchingUserIds: Set<string> | null = null;
      if (search) {
        const safeSearch = search.replace(/[,()]/g, "");
        const { data: matches } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`)
          .limit(500);
        matchingUserIds = new Set((matches || []).map((m: any) => m.id));
      }

      interface ActivityEvent {
        id: string;
        type: "session" | "feedback" | "flag" | "signup" | "subscription" | "analytics";
        user_id: string;
        timestamp: string;
        description: string;
        metadata?: Record<string, unknown>;
      }

      const events: ActivityEvent[] = [];
      const userIdsNeeded = new Set<string>();
      const subjectIdsNeeded = new Set<string>();

      if (requestedTypes.includes("session")) {
        const { data: sessions, error: sessionsError } = await supabaseAdmin
          .from("sessions")
          .select(
            "id, user_id, subject_id, is_mock, is_recalled_questions_session, is_error_bank_session, is_biology_focus_session, completed, score, total_questions, started_at, ended_at"
          )
          .order("started_at", { ascending: false })
          .limit(perSourceLimit);

        if (sessionsError) {
          console.error("[admin/activity] Sessions query error:", sessionsError);
        }

        (sessions || []).forEach((s: any) => {
          if (matchingUserIds && !matchingUserIds.has(s.user_id)) return;
          userIdsNeeded.add(s.user_id);
          if (s.subject_id) subjectIdsNeeded.add(s.subject_id);

          // Recalled questions and Biology Focus are browse-only features (no
          // score), so they get their own description rather than being
          // forced into the scored-session template below.
          if (s.is_recalled_questions_session) {
            events.push({
              id: `session_${s.id}`,
              type: "session",
              user_id: s.user_id,
              timestamp: s.ended_at || s.started_at,
              description: "Viewed recalled questions",
              metadata: { subject_id: s.subject_id, completed: s.completed },
            });
            return;
          }

          if (s.is_biology_focus_session) {
            events.push({
              id: `session_${s.id}`,
              type: "session",
              user_id: s.user_id,
              timestamp: s.ended_at || s.started_at,
              description: "Viewed Biology: Plant Morphology Focus",
              metadata: { subject_id: s.subject_id, completed: s.completed },
            });
            return;
          }

          const kind = s.is_error_bank_session ? "error bank review" : s.is_mock ? "mock exam" : "practice session";
          const description = s.completed
            ? `Scored ${s.total_questions > 0 ? Math.round((s.score / s.total_questions) * 100) : 0}% (${s.score}/${s.total_questions}) on a ${kind}`
            : `Started a ${kind}`;

          events.push({
            id: `session_${s.id}`,
            type: "session",
            user_id: s.user_id,
            timestamp: s.completed ? (s.ended_at || s.started_at) : s.started_at,
            description,
            metadata: { subject_id: s.subject_id, completed: s.completed },
          });
        });
      }

      if (requestedTypes.includes("feedback")) {
        const { data: feedback } = await supabaseAdmin
          .from("feedback")
          .select("id, user_id, rating, category, emoji_mood, message, created_at")
          .order("created_at", { ascending: false })
          .limit(perSourceLimit);

        (feedback || []).forEach((f: any) => {
          if (matchingUserIds && !matchingUserIds.has(f.user_id)) return;
          userIdsNeeded.add(f.user_id);

          events.push({
            id: `feedback_${f.id}`,
            type: "feedback",
            user_id: f.user_id,
            timestamp: f.created_at,
            description: `Left ${f.rating}★ feedback on ${f.category}${f.message ? " with a comment" : ""}`,
            metadata: { rating: f.rating, category: f.category, emoji_mood: f.emoji_mood, message: f.message },
          });
        });
      }

      if (requestedTypes.includes("flag")) {
        const { data: flags } = await supabaseAdmin
          .from("flagged_questions")
          .select("id, user_id, question_id, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(perSourceLimit);

        (flags || []).forEach((f: any) => {
          if (matchingUserIds && !matchingUserIds.has(f.user_id)) return;
          userIdsNeeded.add(f.user_id);

          events.push({
            id: `flag_${f.id}`,
            type: "flag",
            user_id: f.user_id,
            timestamp: f.created_at,
            description: f.reason ? `Flagged a question: "${f.reason}"` : "Flagged a question for review",
            metadata: { question_id: f.question_id },
          });
        });
      }

      if (requestedTypes.includes("signup")) {
        const { data: signups } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, email, created_at")
          .order("created_at", { ascending: false })
          .limit(perSourceLimit);

        (signups || []).forEach((p: any) => {
          if (matchingUserIds && !matchingUserIds.has(p.id)) return;
          userIdsNeeded.add(p.id);

          events.push({
            id: `signup_${p.id}`,
            type: "signup",
            user_id: p.id,
            timestamp: p.created_at,
            description: "Created an account",
          });
        });
      }

      if (requestedTypes.includes("subscription")) {
        const { data: subs } = await supabaseAdmin
          .from("subscriptions")
          .select("id, user_id, plan, amount, status, created_at")
          .order("created_at", { ascending: false })
          .limit(perSourceLimit);

        (subs || []).forEach((s: any) => {
          if (matchingUserIds && !matchingUserIds.has(s.user_id)) return;
          userIdsNeeded.add(s.user_id);

          const nairaAmount = s.amount ? Math.round(s.amount / 100).toLocaleString() : null;
          const description =
            s.status === "active"
              ? `Purchased ${s.plan}${nairaAmount ? ` (₦${nairaAmount})` : ""}`
              : `Started checkout for ${s.plan}`;

          events.push({
            id: `subscription_${s.id}`,
            type: "subscription",
            user_id: s.user_id,
            timestamp: s.created_at,
            description,
            metadata: { plan: s.plan, status: s.status },
          });
        });
      }

      if (requestedTypes.includes("analytics")) {
        // analytics_reports has a unique index on user_id (it's a one-row-
        // per-user cache, refreshed on regeneration), so this surfaces each
        // user's most recent report generation - the same "one row per
        // user" shape as the signup source above.
        const { data: reports } = await supabaseAdmin
          .from("analytics_reports")
          .select("id, user_id, generated_at")
          .order("generated_at", { ascending: false })
          .limit(perSourceLimit);

        (reports || []).forEach((r: any) => {
          if (matchingUserIds && !matchingUserIds.has(r.user_id)) return;
          userIdsNeeded.add(r.user_id);

          events.push({
            id: `analytics_${r.id}`,
            type: "analytics",
            user_id: r.user_id,
            timestamp: r.generated_at,
            description: "Generated an AI analytics report",
          });
        });
      }

      // Attach user display info
      const profiles = await batchQuery<{ id: string; full_name: string; email: string }>(
        "profiles",
        "id",
        Array.from(userIdsNeeded),
        "id, full_name, email"
      );
      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      const subjects = await batchQuery<{ id: string; name: string }>(
        "subjects",
        "id",
        Array.from(subjectIdsNeeded),
        "id, name"
      );
      const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

      const enriched = events
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)
        .map((e) => {
          const user = profileMap.get(e.user_id);
          const subjectName = e.metadata?.subject_id ? subjectMap.get(e.metadata.subject_id as string) : undefined;
          return {
            ...e,
            user_name: user?.full_name || "Unknown user",
            user_email: user?.email || null,
            subject_name: subjectName || null,
          };
        });

      res.json({
        status: "success",
        data: { events: enriched },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/activity] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/users
  app.get("/api/admin/users", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const page = parseInt((req.query.page as string) || "1");
      const limit = Math.min(parseInt((req.query.limit as string) || "20"), 100);
      const filters = parseProfileFilters(req.query as Record<string, unknown>);

      // profiles.email (added in the Firebase Auth migration) is now the
      // source of truth for user email, so this no longer needs to merge in
      // supabaseAdmin.auth.admin.listUsers() - that call silently truncates
      // at its own default page size and was capping this list at ~50 users.
      let query = supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, email, role, subscription_status, target_course, subject_combination, target_university_id, created_at",
          { count: "exact" }
        );

      query = applyProfileFilters(query, filters);

      const start = (page - 1) * limit;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(start, start + limit - 1);

      if (error) throw error;

      const users = (data || []).map((profile: any) => ({
        ...profile,
        email: profile.email || "N/A",
        role: profile.role || "user",
      }));

      res.json({
        status: "success",
        data: users,
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/users] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/users/filter-options - distinct target_course values in
  // use, so the admin panel's course filter only shows real, selectable values
  app.get("/api/admin/users/filter-options", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const courseSet = new Set<string>();
      const pageSize = 1000;

      // Supabase caps a single `.select()` at 1000 rows, so page through in
      // batches (same pattern as the revenue query in /api/admin/stats above)
      // rather than risk missing distinct values past the first page.
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabaseAdmin
          .from("profiles")
          .select("target_course")
          .not("target_course", "is", null)
          .range(from, from + pageSize - 1);

        if (error) throw error;
        (data || []).forEach((p: any) => {
          if (p.target_course) courseSet.add(p.target_course);
        });
        if (!data || data.length < pageSize) break;
      }

      const courses = Array.from(courseSet).sort((a, b) => a.localeCompare(b));

      res.json({
        status: "success",
        data: { courses },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/users/filter-options] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/users/export - CSV export of every user matching the given filters
  app.get("/api/admin/users/export", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const filters = parseProfileFilters(req.query as Record<string, unknown>);
      const rows: any[] = [];
      const pageSize = 1000;

      for (let from = 0; ; from += pageSize) {
        let query = supabaseAdmin
          .from("profiles")
          .select("full_name, email, subscription_status, target_course, created_at");
        query = applyProfileFilters(query, filters);

        const { data, error } = await query
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }

      const escapeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
      const csvLines = [
        ["Name", "Email", "Plan", "Target Course", "Joined"].join(","),
        ...rows.map((r) =>
          [
            escapeCsv(r.full_name),
            escapeCsv(r.email),
            escapeCsv(r.subscription_status),
            escapeCsv(r.target_course),
            escapeCsv(new Date(r.created_at).toISOString().split("T")[0]),
          ].join(",")
        ),
      ];

      const filename = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csvLines.join("\n"));
    } catch (error) {
      console.error("[admin/users/export] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // PATCH /api/admin/users/:id - also used to manually grant/extend a paid
  // plan when Flutterwave fails to process and the student pays another way
  // (bank transfer, cash, etc.) - mirrors what a real successful payment does
  // (profiles.subscription_expires_at + a subscriptions audit row) so manually
  // granted plans behave identically to ones paid through Flutterwave.
  app.patch("/api/admin/users/:id", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { id } = req.params;
      const { role, subscription_status, duration_days, amount_naira, subject_combination } = req.body;

      if (
        subscription_status &&
        !["explorer", "scholar", "elite"].includes(subscription_status)
      ) {
        res.status(400).json({
          status: "error",
          message: "subscription_status must be explorer, scholar, or elite",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (subject_combination !== undefined) {
        if (!Array.isArray(subject_combination) || subject_combination.some((s) => typeof s !== "string")) {
          res.status(400).json({
            status: "error",
            message: "subject_combination must be an array of subject IDs",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (subject_combination.length > 0) {
          const { data: validSubjects, error: subjectsError } = await supabaseAdmin
            .from("subjects")
            .select("id")
            .in("id", subject_combination);

          if (subjectsError) {
            res.status(500).json({
              status: "error",
              message: "Failed to validate subjects",
              timestamp: new Date().toISOString(),
            });
            return;
          }

          if ((validSubjects || []).length !== subject_combination.length) {
            res.status(400).json({
              status: "error",
              message: "One or more subject IDs are invalid",
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }
      }

      const updateData: any = {};
      if (role) updateData.role = role;
      if (subject_combination !== undefined) updateData.subject_combination = subject_combination;

      if (subscription_status) {
        updateData.subscription_status = subscription_status;

        if (subscription_status === "explorer") {
          updateData.subscription_expires_at = null;
        } else {
          const days = Number(duration_days) > 0 ? Number(duration_days) : 180;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);
          updateData.subscription_expires_at = expiresAt.toISOString();

          const { error: subError } = await supabaseAdmin.from("subscriptions").insert({
            user_id: id,
            plan: subscription_status,
            status: "active",
            paystack_reference: `MANUAL-${crypto.randomUUID()}`,
            amount: Math.round((Number(amount_naira) || 0) * 100),
            expires_at: expiresAt.toISOString(),
          });

          if (subError) {
            console.error("[admin/users/:id] Manual subscription log error:", subError);
          }
        }
      }

      const { data, error: updateError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError || !data) {
        res.status(500).json({
          status: "error",
          message: "Failed to update user",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/users/:id] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // DELETE /api/admin/users/:id - permanently deletes a user: the Firebase
  // Auth account first, then the Supabase Auth user (whose id = profiles.id),
  // which cascades to profiles/sessions/subscriptions/analytics_reports and,
  // via auth.users directly, flagged_questions/recalled_questions too. Order
  // matters: deleting Firebase first means a failure on the Supabase side
  // leaves all data intact and safely retryable; the reverse order would
  // risk cascading away all data while leaving a live, orphaned Firebase
  // login - the same class of bug as the Firebase Orphaned Account Incident.
  app.delete("/api/admin/users/:id", async (req: Request, res: Response) => {
    const adminId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!adminId) return;

    try {
      const { id } = req.params;

      if (id === adminId) {
        res.status(400).json({
          status: "error",
          message: "You cannot delete your own account.",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, firebase_uid, full_name, role")
        .eq("id", id)
        .single();

      if (profileError || !profile) {
        res.status(404).json({
          status: "error",
          message: "User not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (profile.role === "admin") {
        res.status(403).json({
          status: "error",
          message: "Cannot delete an admin account.",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (profile.firebase_uid) {
        try {
          await firebaseAdminAuth.deleteUser(profile.firebase_uid);
        } catch (firebaseError: any) {
          if (firebaseError?.code !== "auth/user-not-found") {
            console.error("[admin/users/:id DELETE] Firebase delete failed:", firebaseError);
            res.status(500).json({
              status: "error",
              message: "Failed to delete Firebase account — nothing was removed. Try again.",
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }
      }

      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

      if (authDeleteError) {
        console.error("[admin/users/:id DELETE] Supabase delete failed:", authDeleteError);
        res.status(500).json({
          status: "error",
          message:
            "Firebase account was deleted, but removing the database record failed. Click delete again to retry.",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        message: "Account deleted.",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/users/:id DELETE] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/admin/upload/docx
  app.post(
    "/api/admin/upload/docx",
    upload.single("file"),
    async (req: Request, res: Response) => {
      console.log('[admin/upload/docx] Handler called');

      const userId = await checkAdminAuth(req, res, supabaseAdmin);
      if (!userId) {
        console.log('[admin/upload/docx] Auth failed');
        return;
      }

      console.log('[admin/upload/docx] Auth passed, userId:', userId);

      try {
        if (!req.file) {
          console.log('[admin/upload/docx] No file provided');
          res.status(400).json({
            status: "error",
            message: "No file provided",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        console.log('[admin/upload/docx] File received, size:', req.file.size);

        const { subject_id, university_id } = req.body;
        if (!subject_id || !university_id) {
          console.log('[admin/upload/docx] Missing subject_id or university_id');
          res.status(400).json({
            status: "error",
            message: "Missing subject_id or university_id",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        console.log('[admin/upload/docx] Calling parseRomanSeriesDocument with buffer size:', req.file.buffer.length);
        const parseResult = await parseRomanSeriesDocument(req.file.buffer);
        console.log('[admin/upload/docx] Parse complete:', {
          total_parsed: parseResult.total_parsed,
          total_matched: parseResult.total_matched,
          total_unmatched: parseResult.total_unmatched,
        });

        const uploadToken = crypto.randomUUID();
        const ttl = 10 * 60 * 1000;
        uploadCache.set(uploadToken, {
          parsed: {
            questions: parseResult.questions,
            subject_id,
            university_id,
          },
          expiresAt: Date.now() + ttl,
        });

        res.json({
          status: "success",
          data: {
            preview: parseResult.questions.slice(0, 5),
            all_questions: parseResult.questions,
            topics: parseResult.topics,
            total_parsed: parseResult.total_parsed,
            total_matched: parseResult.total_matched,
            total_unmatched: parseResult.total_unmatched,
            errors: parseResult.errors,
            upload_token: uploadToken,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[admin/upload/docx] Error:", error);
        res.status(500).json({
          status: "error",
          message: "Failed to parse document",
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // POST /api/admin/upload/confirm
  app.post("/api/admin/upload/confirm", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { upload_token, subject_id, university_id } = req.body;

      if (!upload_token) {
        res.status(400).json({
          status: "error",
          message: "Missing upload_token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const cached = uploadCache.get(upload_token);
      if (!cached || cached.expiresAt < Date.now()) {
        res.status(400).json({
          status: "error",
          message: "Upload token expired or invalid",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { questions } = cached.parsed;
      let created = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let i = 0; i < questions.length; i += 20) {
        const batch = questions.slice(i, i + 20);

        for (const question of batch) {
          try {
            const hasCorrectAnswer = question.options.some((o: any) => o.is_correct);
            if (!hasCorrectAnswer) {
              skipped++;
              continue;
            }

            const { data: questionData, error: qError } = await supabaseAdmin
              .from("questions")
              .insert({
                subject_id,
                university_id,
                body: question.body,
                explanation: question.explanation,
                difficulty: question.difficulty || "medium",
              })
              .select()
              .single();

            if (qError) throw qError;

            const optionRows = question.options.map((o: any) => ({
              id: crypto.randomUUID(),
              question_id: questionData.id,
              label: o.label,
              body: o.body,
              is_correct: o.is_correct,
            }));

            const { error: oError } = await supabaseAdmin
              .from("options")
              .insert(optionRows);

            if (oError) throw oError;

            created++;
          } catch (error) {
            skipped++;
            errors.push(
              `Failed to save question: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      }

      uploadCache.delete(upload_token);

      res.json({
        status: "success",
        data: {
          created,
          skipped,
          errors,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/upload/confirm] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/admin/upload/manual
  app.post("/api/admin/upload/manual", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { subject_id, university_id, topic_id, body, explanation, options, difficulty } = req.body;

      if (!subject_id || !university_id || !topic_id || !body || !options) {
        res.status(400).json({
          status: "error",
          message: "Missing required fields (subject, university, topic, and body are required)",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const correctCount = options.filter((o: any) => o.is_correct).length;
      if (correctCount !== 1) {
        res.status(400).json({
          status: "error",
          message: "Exactly one option must be marked as correct",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data: topic, error: topicError } = await supabaseAdmin
        .from("topics")
        .select("id, name, subject_id, university_id")
        .eq("id", topic_id)
        .single();

      if (topicError || !topic) {
        res.status(400).json({
          status: "error",
          message: "Selected topic could not be found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (topic.subject_id !== subject_id || topic.university_id !== university_id) {
        res.status(400).json({
          status: "error",
          message: "Selected topic does not belong to the chosen subject/university",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data: questionData, error: qError } = await supabaseAdmin
        .from("questions")
        .insert({
          subject_id,
          university_id,
          topic_id,
          topic_name: topic.name,
          body,
          explanation: explanation || null,
          difficulty: difficulty || "medium",
        })
        .select()
        .single();

      if (qError) throw qError;

      const optionRows = options.map((o: any) => ({
        id: crypto.randomUUID(),
        question_id: questionData.id,
        label: o.label,
        body: o.body,
        is_correct: o.is_correct,
      }));

      const { error: oError } = await supabaseAdmin
        .from("options")
        .insert(optionRows);

      if (oError) throw oError;

      res.status(201).json({
        status: "success",
        data: {
          id: questionData.id,
          ...questionData,
          options: optionRows,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/upload/manual] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // PATCH /api/admin/questions/:id/answer
  app.patch("/api/admin/questions/:id/answer", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { id } = req.params;
      const { answer_letter } = req.body;

      if (!answer_letter || !["A", "B", "C", "D", "E"].includes(answer_letter)) {
        res.status(400).json({
          status: "error",
          message: "Invalid answer_letter. Must be A, B, C, D, or E",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get all options for this question
      const { data: options, error: fetchError } = await supabaseAdmin
        .from("options")
        .select("id, label")
        .eq("question_id", id);

      if (fetchError || !options) {
        res.status(400).json({
          status: "error",
          message: "Failed to fetch options",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Update is_correct for all options
      const updates = options.map((opt) => ({
        id: opt.id,
        is_correct: opt.label === answer_letter,
      }));

      for (const update of updates) {
        await supabaseAdmin
          .from("options")
          .update({ is_correct: update.is_correct })
          .eq("id", update.id);
      }

      res.json({
        status: "success",
        data: { question_id: id, answer_letter },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/questions/:id/answer] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/questions/unanswered
  app.get("/api/admin/questions/unanswered", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { data, error } = await supabaseAdmin
        .from("questions")
        .select(`
          id,
          body,
          topic_id,
          topics(name, subject_id, subjects(id, name)),
          options(id, label, body, is_correct)
        `);

      if (error) {
        res.status(400).json({
          status: "error",
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // "Unanswered" means no option on the question is marked correct —
      // there is no answer_letter column on questions, correctness lives
      // solely on options.is_correct.
      const unanswered = (data || []).filter(
        (q: any) => !(q.options || []).some((o: any) => o.is_correct)
      );

      unanswered.sort((a: any, b: any) => {
        const subjA = a.topics?.subjects?.name || "";
        const subjB = b.topics?.subjects?.name || "";
        if (subjA !== subjB) return subjA.localeCompare(subjB);
        return (a.topics?.name || "").localeCompare(b.topics?.name || "");
      });

      res.json({
        status: "success",
        data: unanswered,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/questions/unanswered] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/questions - retrieve questions with filtering and pagination
  app.get("/api/admin/questions", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const page = parseInt((req.query.page as string) || "1");
      const limit = Math.min(parseInt((req.query.limit as string) || "20"), 100);
      const subjectId = req.query.subjectId as string;
      const universityId = req.query.universityId as string;
      const topicId = req.query.topicId as string;
      const noTopic = req.query.noTopic === "true";

      let query = supabaseAdmin
        .from("questions")
        .select("*, topics(name), subjects(name), universities(name), options(id, label, body, is_correct)", { count: "exact" });

      if (subjectId) {
        query = query.eq("subject_id", subjectId);
      }
      if (universityId) {
        query = query.eq("university_id", universityId);
      }
      if (noTopic) {
        query = query.is("topic_id", null);
      } else if (topicId) {
        query = query.eq("topic_id", topicId);
      }

      const start = (page - 1) * limit;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(start, start + limit - 1);

      if (error) throw error;

      res.json({
        status: "success",
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/questions] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // PATCH /api/admin/questions/bulk-assign-topic - assign a topic to many topic-less questions at once
  // Must be registered before the generic /api/admin/questions/:id routes below,
  // otherwise Express would match "bulk-assign-topic" as an :id.
  app.patch("/api/admin/questions/bulk-assign-topic", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { question_ids, topic_id } = req.body;

      if (!Array.isArray(question_ids) || question_ids.length === 0 || !topic_id) {
        res.status(400).json({
          status: "error",
          message: "question_ids (array) and topic_id are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data: topic, error: topicError } = await supabaseAdmin
        .from("topics")
        .select("id, name")
        .eq("id", topic_id)
        .single();

      if (topicError || !topic) {
        res.status(400).json({
          status: "error",
          message: "Selected topic could not be found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { error: updateError } = await supabaseAdmin
        .from("questions")
        .update({ topic_id: topic.id, topic_name: topic.name })
        .in("id", question_ids);

      if (updateError) throw updateError;

      res.json({
        status: "success",
        message: `${question_ids.length} question(s) assigned to "${topic.name}"`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/questions/bulk-assign-topic] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/questions/:id - fetch a single question with its options, for editing
  app.get("/api/admin/questions/:id", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { id } = req.params;
      const { data, error } = await supabaseAdmin
        .from("questions")
        .select("*, topics(id, name), subjects(id, name), universities(id, name), options(id, label, body, is_correct)")
        .eq("id", id)
        .single();

      if (error || !data) {
        res.status(404).json({
          status: "error",
          message: "Question not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({ status: "success", data, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("[admin/questions/:id GET] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // PATCH /api/admin/questions/:id - edit a question's content, topic, and options
  app.patch("/api/admin/questions/:id", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { id } = req.params;
      const { body, explanation, difficulty, topic_id, options } = req.body;

      const updates: Record<string, unknown> = {};

      if (body !== undefined) updates.body = body;
      if (explanation !== undefined) updates.explanation = explanation || null;
      if (difficulty !== undefined) updates.difficulty = difficulty;

      if (topic_id !== undefined) {
        const { data: topic, error: topicError } = await supabaseAdmin
          .from("topics")
          .select("id, name")
          .eq("id", topic_id)
          .single();

        if (topicError || !topic) {
          res.status(400).json({
            status: "error",
            message: "Selected topic could not be found",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        updates.topic_id = topic.id;
        updates.topic_name = topic.name;
      }

      if (options !== undefined) {
        if (!Array.isArray(options) || options.length === 0) {
          res.status(400).json({
            status: "error",
            message: "Options must be a non-empty array",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const correctCount = options.filter((o: any) => o.is_correct).length;
        if (correctCount !== 1) {
          res.status(400).json({
            status: "error",
            message: "Exactly one option must be marked as correct",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        for (const option of options) {
          if (!option.id) continue;
          const { error: optError } = await supabaseAdmin
            .from("options")
            .update({ label: option.label, body: option.body, is_correct: !!option.is_correct })
            .eq("id", option.id)
            .eq("question_id", id);

          if (optError) throw optError;
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error: qError } = await supabaseAdmin
          .from("questions")
          .update(updates)
          .eq("id", id);

        if (qError) throw qError;
      }

      const { data: updated, error: fetchError } = await supabaseAdmin
        .from("questions")
        .select("*, topics(id, name), subjects(id, name), universities(id, name), options(id, label, body, is_correct)")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      res.json({ status: "success", data: updated, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("[admin/questions/:id PATCH] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // DELETE /api/admin/questions/:id - delete a question (blocked if students have already answered it)
  app.delete("/api/admin/questions/:id", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { id } = req.params;

      const { count: answeredCount, error: countError } = await supabaseAdmin
        .from("session_answers")
        .select("id", { count: "exact", head: true })
        .eq("question_id", id);

      if (countError) throw countError;

      if ((answeredCount || 0) > 0) {
        res.status(409).json({
          status: "error",
          message: `This question has already been answered by students in ${answeredCount} session(s) and can't be deleted. Edit it instead to fix any issues.`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { error: deleteError } = await supabaseAdmin
        .from("questions")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      res.json({ status: "success", message: "Question deleted", timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("[admin/questions/:id DELETE] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/topics - list topics with live question counts
  app.get("/api/admin/topics", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const subjectId = req.query.subjectId as string;
      const universityId = req.query.universityId as string;

      let query = supabaseAdmin
        .from("topics")
        .select("id, name, subject_id, university_id, subjects(name), universities(name)");

      if (subjectId) query = query.eq("subject_id", subjectId);
      if (universityId) query = query.eq("university_id", universityId);

      const { data: topics, error } = await query.order("name", { ascending: true });
      if (error) throw error;

      // Live question counts — the denormalized topics.question_count column
      // is stale/unmaintained, so count directly instead of trusting it.
      const { data: counts, error: countsError } = await supabaseAdmin
        .from("questions")
        .select("topic_id");

      if (countsError) throw countsError;

      const countByTopic = new Map<string, number>();
      (counts || []).forEach((q: any) => {
        if (!q.topic_id) return;
        countByTopic.set(q.topic_id, (countByTopic.get(q.topic_id) || 0) + 1);
      });

      const enriched = (topics || []).map((t: any) => ({
        ...t,
        question_count: countByTopic.get(t.id) || 0,
      }));

      res.json({ status: "success", data: enriched, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("[admin/topics GET] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/admin/topics - create a new topic
  app.post("/api/admin/topics", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { name, subject_id, university_id } = req.body;

      if (!name || !subject_id || !university_id) {
        res.status(400).json({
          status: "error",
          message: "name, subject_id, and university_id are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data: existing } = await supabaseAdmin
        .from("topics")
        .select("id")
        .eq("name", name)
        .eq("subject_id", subject_id)
        .eq("university_id", university_id)
        .maybeSingle();

      if (existing) {
        res.status(409).json({
          status: "error",
          message: "A topic with this name already exists for this subject/university",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from("topics")
        .insert({ name, subject_id, university_id })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ status: "success", data, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("[admin/topics POST] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // PATCH /api/admin/topics/:id - rename a topic (cascades to questions.topic_name)
  app.patch("/api/admin/topics/:id", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name) {
        res.status(400).json({
          status: "error",
          message: "name is required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { error: updateError } = await supabaseAdmin
        .from("topics")
        .update({ name })
        .eq("id", id);

      if (updateError) throw updateError;

      // Keep the denormalized topic_name on questions in sync
      const { error: cascadeError } = await supabaseAdmin
        .from("questions")
        .update({ topic_name: name })
        .eq("topic_id", id);

      if (cascadeError) throw cascadeError;

      res.json({ status: "success", message: "Topic renamed", timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("[admin/topics/:id PATCH] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // DELETE /api/admin/topics/:id - delete a topic (blocked if it still has questions)
  app.delete("/api/admin/topics/:id", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { id } = req.params;

      const { count, error: countError } = await supabaseAdmin
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("topic_id", id);

      if (countError) throw countError;

      if ((count || 0) > 0) {
        res.status(409).json({
          status: "error",
          message: `This topic still has ${count} question(s). Reassign or delete them first.`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { error: deleteError } = await supabaseAdmin
        .from("topics")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      res.json({ status: "success", message: "Topic deleted", timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("[admin/topics/:id DELETE] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/admin/cutoff-marks/upload-json - Upload JSON cutoff marks
  app.post("/api/admin/cutoff-marks/upload-json", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { university, year, cutoff_marks } = req.body;

      // Validate required fields
      if (!university || !year || !Array.isArray(cutoff_marks) || cutoff_marks.length === 0) {
        res.status(400).json({
          status: "error",
          message: "Invalid JSON structure. Required fields: university, year, cutoff_marks (array)",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Resolve university ID from name
      const { data: uniData, error: uniError } = await supabaseAdmin
        .from("universities")
        .select("id")
        .ilike("name", university)
        .single();

      if (uniError || !uniData) {
        res.status(400).json({
          status: "error",
          message: `University not found: ${university}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const university_id = uniData.id;

      // Validate records
      for (const record of cutoff_marks) {
        if (!record.faculty || !record.course || record.merit === undefined || record.catch === undefined || record.elds === undefined) {
          res.status(400).json({
            status: "error",
            message: "Invalid record. Required fields per record: faculty, course, merit, catch, elds",
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      // Deduplicate records by course only (constraint is on university_id, course, year)
      const courseMap = new Map<string, any>();
      for (const record of cutoff_marks) {
        // Keep first occurrence of each course
        if (!courseMap.has(record.course)) {
          courseMap.set(record.course, record);
        }
      }
      const deduplicatedRecords = Array.from(courseMap.values());
      console.log(`[admin/cutoff-marks/upload-json] Deduplicating by course: ${cutoff_marks.length} records → ${deduplicatedRecords.length} unique courses`);

      // Delete existing records for this university and year
      console.log(`[admin/cutoff-marks/upload-json] Deleting existing records: university_id=${university_id}, year=${year}`);
      const { error: deleteError, count: deleteCount } = await supabaseAdmin
        .from("cutoff_marks")
        .delete()
        .eq("university_id", university_id)
        .eq("year", year);

      if (deleteError) {
        console.error("[admin/cutoff-marks/upload-json] Delete error:", deleteError);
        res.status(400).json({
          status: "error",
          message: `Failed to delete existing records: ${deleteError.message}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log(`[admin/cutoff-marks/upload-json] Delete completed, removed ${deleteCount} records`);

      // Batch insert in groups of 50
      let totalInserted = 0;
      for (let i = 0; i < deduplicatedRecords.length; i += 50) {
        const batch = deduplicatedRecords.slice(i, i + 50).map((r: any) => ({
          university_id,
          year,
          faculty: r.faculty,
          course: r.course,
          merit_cutoff: r.merit,
          catch_cutoff: r.catch,
          elds_cutoff: r.elds,
          // Set default values for prediction calculations - UI's real
          // aggregate formula is a fixed (UTME/8) + (PUTME/2), i.e. equal
          // max contribution of 50 each, not a 60/40 split.
          utme_cutoff: 200,
          utme_weight: 50,
          putme_weight: 50,
          combined_cutoff: r.merit,
        }));

        console.log(`[admin/cutoff-marks/upload-json] Inserting batch ${Math.floor(i/50) + 1}: ${batch.length} records`);

        const { data, error } = await supabaseAdmin.from("cutoff_marks").insert(batch).select();

        if (error) {
          console.error("[admin/cutoff-marks/upload-json] Batch insert error:", error, "Batch:", batch);
          res.status(400).json({
            status: "error",
            message: `Batch insert failed: ${error.message}`,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        console.log(`[admin/cutoff-marks/upload-json] Batch ${Math.floor(i/50) + 1} inserted successfully: ${data?.length || 0} records`);
        totalInserted += data?.length || 0;
      }

      res.json({
        status: "success",
        data: { inserted: totalInserted },
        message: `Successfully inserted ${totalInserted} cutoff marks`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/cutoff-marks/upload-json] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/admin/cutoff-marks/bulk - Bulk insert cutoff marks
  app.post("/api/admin/cutoff-marks/bulk", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { university_id, year, records } = req.body;

      // Validate required fields
      if (!university_id || !year || !Array.isArray(records) || records.length === 0) {
        res.status(400).json({
          status: "error",
          message: "Missing required fields: university_id, year, records (non-empty array)",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Deduplicate records by course only (constraint is on university_id, course, year)
      const courseMap = new Map<string, any>();
      for (const record of records) {
        // Keep first occurrence of each course
        if (!courseMap.has(record.course)) {
          courseMap.set(record.course, record);
        }
      }
      const deduplicatedRecords = Array.from(courseMap.values());
      console.log(`[admin/cutoff-marks/bulk] Deduplicating by course: ${records.length} records → ${deduplicatedRecords.length} unique courses`);

      // Delete existing records for this university and year
      console.log(`[admin/cutoff-marks/bulk] Deleting existing records: university_id=${university_id}, year=${year}`);
      const { error: deleteError, count: deleteCount } = await supabaseAdmin
        .from("cutoff_marks")
        .delete()
        .eq("university_id", university_id)
        .eq("year", year);

      if (deleteError) {
        console.error("[admin/cutoff-marks/bulk] Delete error:", deleteError);
        res.status(400).json({
          status: "error",
          message: `Failed to delete existing records: ${deleteError.message}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log(`[admin/cutoff-marks/bulk] Delete completed, removed ${deleteCount} records`);

      // Batch insert in groups of 50
      let totalInserted = 0;
      for (let i = 0; i < deduplicatedRecords.length; i += 50) {
        const batch = deduplicatedRecords.slice(i, i + 50).map((r: any) => ({
          university_id,
          year,
          faculty: r.faculty,
          course: r.course,
          merit_cutoff: r.merit,
          catch_cutoff: r.catch,
          elds_cutoff: r.elds,
          // Set default values for prediction calculations - UI's real
          // aggregate formula is a fixed (UTME/8) + (PUTME/2), i.e. equal
          // max contribution of 50 each, not a 60/40 split.
          utme_cutoff: 200,
          utme_weight: 50,
          putme_weight: 50,
          combined_cutoff: r.merit,
        }));

        console.log(`[admin/cutoff-marks/bulk] Inserting batch ${Math.floor(i/50) + 1}: ${batch.length} records`);

        const { data, error } = await supabaseAdmin.from("cutoff_marks").insert(batch).select();

        if (error) {
          console.error("[admin/cutoff-marks/bulk] Batch insert error:", error, "Batch:", batch);
          res.status(400).json({
            status: "error",
            message: `Batch insert failed: ${error.message}`,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        console.log(`[admin/cutoff-marks/bulk] Batch ${Math.floor(i/50) + 1} inserted successfully: ${data?.length || 0} records`);
        totalInserted += data?.length || 0;
      }

      res.json({
        status: "success",
        data: { inserted: totalInserted },
        message: `Successfully inserted ${totalInserted} cutoff marks`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/cutoff-marks/bulk] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/cutoff-marks - List cutoff marks with filters
  app.get("/api/admin/cutoff-marks", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const universityId = req.query.universityId as string;
      const course = req.query.course as string;
      const year = req.query.year as string;

      let query = supabaseAdmin.from("cutoff_marks").select("*");

      if (universityId) {
        query = query.eq("university_id", universityId);
      }
      if (course) {
        query = query.eq("course", course);
      }
      if (year) {
        query = query.eq("year", parseInt(year));
      }

      const { data, error } = await query.order("year", { ascending: false });

      if (error) {
        res.status(400).json({
          status: "error",
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data: data || [],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/cutoff-marks] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/admin/cutoff-marks - Create a new cutoff mark
  app.post("/api/admin/cutoff-marks", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const {
        university_id,
        course,
        year,
        utme_cutoff,
        utme_weight,
        putme_weight,
        combined_cutoff,
        notes,
      } = req.body;

      // Validate required fields
      if (!university_id || !course || !year || utme_cutoff === undefined || combined_cutoff === undefined) {
        res.status(400).json({
          status: "error",
          message: "Missing required fields: university_id, course, year, utme_cutoff, combined_cutoff",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate numeric values
      if (typeof utme_cutoff !== "number" || typeof combined_cutoff !== "number") {
        res.status(400).json({
          status: "error",
          message: "utme_cutoff and combined_cutoff must be numbers",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Insert into database
      const { data: cutoffMark, error: insertError } = await supabaseAdmin
        .from("cutoff_marks")
        .insert({
          university_id,
          course,
          year,
          utme_cutoff,
          utme_weight: utme_weight || 50,
          putme_weight: putme_weight || 50,
          combined_cutoff,
          notes: notes || null,
        })
        .select()
        .single();

      if (insertError) {
        res.status(400).json({
          status: "error",
          message: insertError.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(201).json({
        status: "success",
        data: cutoffMark,
        message: "Cutoff mark created successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/cutoff-marks POST] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // DELETE /api/admin/cutoff-marks/:id - Delete a cutoff mark
  app.delete("/api/admin/cutoff-marks/:id", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { id } = req.params;

      const { error: deleteError } = await supabaseAdmin
        .from("cutoff_marks")
        .delete()
        .eq("id", id);

      if (deleteError) {
        res.status(400).json({
          status: "error",
          message: deleteError.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        message: "Cutoff mark deleted successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/cutoff-marks DELETE] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
