"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 15; // 15 * 2s = 30s

type Phase = "polling" | "success" | "failed" | "timeout";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function PaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Paystack appends this to callback_url automatically once checkout finishes.
  const reference = searchParams.get("reference");
  const { restoreSession } = useAuth();

  const [phase, setPhase] = useState<Phase>(reference ? "polling" : "failed");
  const [plan, setPlan] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const attemptsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!reference) return;

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const checkStatus = async () => {
      attemptsRef.current += 1;

      try {
        const res = await api.get(`/api/payments/paystack/status/${reference}`);
        const { status, subscription_active, plan: confirmedPlan } = res.data;

        if (status === "success" && subscription_active) {
          stopPolling();
          setPlan(confirmedPlan);
          setPhase("success");
          // Refresh profile so the dashboard reflects the new plan immediately.
          await restoreSession();
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
          return;
        }

        if (status === "failed") {
          stopPolling();
          setPhase("failed");
          return;
        }

        // Still pending — keep polling unless we've hit the attempt cap.
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          stopPolling();
          setPhase("timeout");
        }
      } catch {
        // Transient network/server error — treat like "still pending" and
        // let the attempt cap decide whether to keep trying.
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          stopPolling();
          setPhase("timeout");
        }
      }
    };

    attemptsRef.current = 0;
    setPhase("polling");
    checkStatus();
    intervalRef.current = setInterval(checkStatus, POLL_INTERVAL_MS);

    return stopPolling;
    // handleCheckAgain below re-runs this same effect by bumping retryCount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, retryCount]);

  const handleCheckAgain = () => setRetryCount((count) => count + 1);

  if (phase === "polling") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blush px-4">
        <div className="text-center max-w-md">
          <div className="animate-spin mb-4">
            <div className="w-12 h-12 border-4 border-forest border-t-transparent rounded-full mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-navy mb-2">
            Confirming your payment...
          </h1>
          <p className="text-gray-600">
            This usually takes just a few seconds. Please don&apos;t close this page.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blush px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4 animate-bounce">✓</div>
          <h1 className="text-3xl font-bold text-forest mb-2">
            Payment confirmed!
          </h1>
          <p className="text-gray-600 mb-2">
            You&apos;re now on the {plan ? capitalize(plan) : "new"} plan.
          </p>
          <p className="text-sm text-gray-500">Redirecting you to your dashboard...</p>
        </div>
      </div>
    );
  }

  if (phase === "timeout") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blush px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold text-navy mb-2">Still confirming...</h1>
          <p className="text-gray-600 mb-6">
            This can take a moment longer than usual. You can safely close this
            page — we&apos;ll update your account shortly — or check again now.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleCheckAgain}
              className="w-full px-6 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition-opacity"
            >
              Check again
            </button>
            <Link
              href="/dashboard"
              className="inline-block w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-forest hover:text-forest transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // phase === "failed"
  return (
    <div className="min-h-screen flex items-center justify-center bg-blush px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-navy mb-2">
          Payment could not be confirmed
        </h1>
        <p className="text-gray-600 mb-6">
          {reference
            ? "If money was deducted from your account, don't worry — contact support with your reference below and we'll sort it out."
            : "We couldn't find a payment reference for this page."}
        </p>
        {reference && (
          <p className="text-xs text-gray-400 mb-6 font-mono break-all">
            Reference: {reference}
          </p>
        )}
        <div className="space-y-3">
          <Link
            href="/pricing"
            className="inline-block w-full px-6 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition-opacity"
          >
            Try Again
          </Link>
          <a
            href="mailto:granjefetech@gmail.com"
            className="inline-block w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-forest hover:text-forest transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
