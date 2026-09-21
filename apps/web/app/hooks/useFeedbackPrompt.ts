"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

// Feedback prompt is mandatory from this date onward (Africa/Lagos local date).
const FEEDBACK_PROMPT_START_DATE = "2026-07-21";

// Routes where it's unsafe or nonsensical to hard-block: the feedback page
// itself, a live timed exam already in progress, brand-new users still
// setting up their profile, and admins.
const EXCLUDED_PREFIXES = [
  "/feedback",
  "/practice/session",
  "/practice/mock/session",
  "/onboarding",
  "/admin",
];

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function isExcludedRoute(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

interface UseFeedbackPromptArgs {
  isAuthenticated: boolean;
  loading: boolean;
  pathname: string;
  userId?: string;
  isAdmin?: boolean;
}

export function useFeedbackPrompt({
  isAuthenticated,
  loading,
  pathname,
  userId,
  isAdmin,
}: UseFeedbackPromptArgs) {
  // Whether this user still owes feedback (fetched once per session).
  const [needsFeedback, setNeedsFeedback] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Fetch feedback status once per authenticated session, independent of route.
  useEffect(() => {
    if (loading || !isAuthenticated || !userId || isAdmin) return;
    if (todayString() < FEEDBACK_PROMPT_START_DATE) return;

    let cancelled = false;

    api
      .get("/api/feedback/me")
      .then((res) => {
        const data = res.data?.data;
        if (!cancelled && data?.has_submitted === false && data?.has_completed_session === true) {
          setNeedsFeedback(true);
        }
      })
      .catch((error) => {
        console.error("Failed to check feedback status:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated, userId, isAdmin]);

  // Block every route except the small safe-list above — no skip, no snooze.
  useEffect(() => {
    setShowPrompt(needsFeedback && !isExcludedRoute(pathname));
  }, [needsFeedback, pathname]);

  const submitted = () => {
    setNeedsFeedback(false);
    setShowPrompt(false);
  };

  return { showPrompt, submitted };
}
