import { Resend } from "resend";

export const EMAIL_FROM =
  process.env.EMAIL_FROM_ADDRESS || "Roman Series <announcements@romanseries.com.ng>";

export const EMAIL_DAILY_LIMIT = parseInt(process.env.EMAIL_DAILY_LIMIT || "100", 10);
export const EMAIL_MONTHLY_LIMIT = parseInt(process.env.EMAIL_MONTHLY_LIMIT || "3000", 10);

// Resend's batch-send endpoint accepts at most 100 messages per call.
export const RESEND_BATCH_SIZE = 100;

export const isResendConfigured = () => Boolean(process.env.RESEND_API_KEY);

let client: Resend | null = null;

// Lazy singleton: the Resend SDK throws synchronously in its constructor when
// no API key is passed, so this must not run at module load time - importing
// this file (which index.ts does, indirectly, for every route) would crash
// the entire API on boot whenever RESEND_API_KEY isn't set yet.
export function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}
