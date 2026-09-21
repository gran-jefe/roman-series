import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { checkAdminAuth, parseProfileFilters, applyProfileFilters } from "./admin.routes";
import {
  getResendClient,
  isResendConfigured,
  EMAIL_FROM,
  EMAIL_DAILY_LIMIT,
  EMAIL_MONTHLY_LIMIT,
  RESEND_BATCH_SIZE,
} from "../lib/resend";

interface AnnouncementsDeps {
  supabaseAdmin: SupabaseClient;
}

interface Recipient {
  id: string;
  full_name: string;
  email: string;
}

async function resolveRecipients(
  supabaseAdmin: SupabaseClient,
  body: { user_ids?: unknown; filters?: Record<string, unknown> }
): Promise<Recipient[]> {
  if (Array.isArray(body.user_ids) && body.user_ids.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", body.user_ids);

    if (error) throw error;
    return (data || []) as Recipient[];
  }

  const filters = parseProfileFilters((body.filters || {}) as Record<string, unknown>);
  const recipients: Recipient[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    let query = supabaseAdmin.from("profiles").select("id, full_name, email");
    query = applyProfileFilters(query, filters);

    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    recipients.push(...((data || []) as Recipient[]));
    if (!data || data.length < pageSize) break;
  }

  return recipients;
}

function dedupeByEmail(recipients: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  return recipients.filter((r) => {
    if (!r.email || seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });
}

// Our own approximation of Resend usage - accurate as long as this app is the
// only sender on the Resend account. Used to decide send-for-real vs. export.
async function getQuotaUsage(
  supabaseAdmin: SupabaseClient
): Promise<{ usedToday: number; usedThisMonth: number }> {
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();

  const [dayRes, monthRes] = await Promise.all([
    supabaseAdmin.from("email_send_log").select("recipient_count").gte("sent_at", startOfDay),
    supabaseAdmin.from("email_send_log").select("recipient_count").gte("sent_at", startOfMonth),
  ]);

  if (dayRes.error) throw dayRes.error;
  if (monthRes.error) throw monthRes.error;

  const sum = (rows: { recipient_count: number }[] | null) =>
    (rows || []).reduce((total, r) => total + (r.recipient_count || 0), 0);

  return { usedToday: sum(dayRes.data), usedThisMonth: sum(monthRes.data) };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderEmailHtml(subject: string, body: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F7F9FC;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="background:#0D1B2A;color:#ffffff;padding:20px 24px;border-radius:8px 8px 0 0;">
        <p style="margin:0;font-size:12px;letter-spacing:0.05em;color:#9CA3AF;">ROMAN SERIES</p>
        <h1 style="margin:4px 0 0;font-size:18px;">${escapeHtml(subject)}</h1>
      </div>
      <div style="background:#ffffff;padding:24px;border-radius:0 0 8px 8px;color:#1F2937;font-size:14px;line-height:1.6;">
        ${paragraphs}
      </div>
    </div>
  </body>
</html>`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function registerAnnouncementsRoutes(app: Express, deps: AnnouncementsDeps) {
  const { supabaseAdmin } = deps;

  // GET /api/admin/announcements/preview - audience size + a small sample,
  // shown in the compose modal before the admin commits to sending.
  app.get("/api/admin/announcements/preview", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const filters = parseProfileFilters(req.query as Record<string, unknown>);

      let query = supabaseAdmin
        .from("profiles")
        .select("full_name, email", { count: "exact" })
        .not("email", "is", null);
      query = applyProfileFilters(query, filters);

      const { data, error, count } = await query.limit(20);
      if (error) throw error;

      res.json({
        status: "success",
        data: { count: count || 0, sample: data || [] },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/announcements/preview] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/admin/announcements/send - either sends for real via Resend, or,
  // if that would exceed the free-tier quota, exports the recipient list
  // instead. This is an all-or-nothing decision per batch (never half sent,
  // half exported), to keep the outcome unambiguous for the admin.
  app.post("/api/admin/announcements/send", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { title, subject, body, filters, user_ids } = req.body;

      if (!title || !subject || !body) {
        res.status(400).json({
          status: "error",
          message: "title, subject, and body are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const recipients = dedupeByEmail(
        await resolveRecipients(supabaseAdmin, { user_ids, filters })
      );

      if (recipients.length === 0) {
        res.status(400).json({
          status: "error",
          message: "No recipients matched the given selection/filters",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { usedToday, usedThisMonth } = await getQuotaUsage(supabaseAdmin);
      const remaining = Math.min(
        EMAIL_DAILY_LIMIT - usedToday,
        EMAIL_MONTHLY_LIMIT - usedThisMonth
      );
      const filtersSnapshot = filters || {};

      const resendReady = isResendConfigured();
      if (!resendReady || recipients.length > remaining) {
        const { data: announcement, error: insertError } = await supabaseAdmin
          .from("email_announcements")
          .insert({
            title,
            subject,
            body,
            filters: filtersSnapshot,
            recipient_count: recipients.length,
            mode: "exported",
            created_by: userId,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        res.json({
          status: "success",
          data: {
            mode: "exported",
            reason: resendReady ? "quota" : "not_configured",
            recipient_count: recipients.length,
            quota_remaining: Math.max(remaining, 0),
            recipients: recipients.map((r) => ({ full_name: r.full_name, email: r.email })),
            announcement_id: announcement.id,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const html = renderEmailHtml(subject, body);
      let sentCount = 0;
      let failedCount = 0;

      for (const batch of chunk(recipients, RESEND_BATCH_SIZE)) {
        try {
          const { error: sendError } = await getResendClient().batch.send(
            batch.map((r) => ({ from: EMAIL_FROM, to: [r.email], subject, html }))
          );

          if (sendError) {
            console.error("[admin/announcements/send] Resend batch error:", sendError);
            failedCount += batch.length;
          } else {
            sentCount += batch.length;
          }
        } catch (err) {
          console.error("[admin/announcements/send] Resend batch threw:", err);
          failedCount += batch.length;
        }
      }

      const { data: announcement, error: insertError } = await supabaseAdmin
        .from("email_announcements")
        .insert({
          title,
          subject,
          body,
          filters: filtersSnapshot,
          recipient_count: recipients.length,
          mode: "sent",
          sent_count: sentCount,
          failed_count: failedCount,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (sentCount > 0) {
        const { error: logError } = await supabaseAdmin.from("email_send_log").insert({
          announcement_id: announcement.id,
          recipient_count: sentCount,
        });
        if (logError) throw logError;
      }

      res.json({
        status: "success",
        data: {
          mode: "sent",
          recipient_count: recipients.length,
          sent_count: sentCount,
          failed_count: failedCount,
          announcement_id: announcement.id,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/announcements/send] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/announcements - history, for audit visibility
  app.get("/api/admin/announcements", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const page = parseInt((req.query.page as string) || "1");
      const limit = Math.min(parseInt((req.query.limit as string) || "20"), 100);
      const start = (page - 1) * limit;

      const { data, error, count } = await supabaseAdmin
        .from("email_announcements")
        .select(
          "id, title, subject, filters, recipient_count, mode, sent_count, failed_count, created_at",
          { count: "exact" }
        )
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
      console.error("[admin/announcements] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
