"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

// Feedback prompt goes live from this date onward (Africa/Lagos local date).
const FEEDBACK_PROMPT_START_DATE = "2026-07-21";

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
  // Whether this user is due for a feedback ask today (fetched once per session).
  const [needsFeedback, setNeedsFeedback] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Fetch feedback status once per authenticated session, independent of route.
  useEffect(() => {
    if (loading || !isAuthenticated || !userId || isAdmin) return;
    if (todayString() < FEEDBACK_PROMPT_START_DATE) return;

    const snoozeKey = `feedback_prompt_snoozed_${userId}`;
    if (localStorage.getItem(snoozeKey) === todayString()) return;

    let cancelled = false;

    api
      .get("/api/feedback/me")
      .then((res) => {
        if (!cancelled && res.data?.data?.has_submitted === false) {
          setNeedsFeedback(true);
        }
      })
      .catch((error) => {
        console.error("Failed to check feedback status:", error);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, userId, isAdmin]);

  // Only surface the modal once the user lands on a route where it's safe to interrupt.
  useEffect(() => {
    setShowPrompt(needsFeedback && !isExcludedRoute(pathname));
  }, [needsFeedback, pathname]);

  const skip = () => {
    if (userId) {
      localStorage.setItem(`feedback_prompt_snoozed_${userId}`, todayString());
    }
    setNeedsFeedback(false);
    setShowPrompt(false);
  };

  const submitted = () => {
    setNeedsFeedback(false);
    setShowPrompt(false);
  };

  return { showPrompt, skip, submitted };
}
