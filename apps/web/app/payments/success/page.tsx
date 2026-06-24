"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transaction_id = searchParams.get("transaction_id");
  const tx_ref = searchParams.get("tx_ref");
  const status = searchParams.get("status");
  const { restoreSession } = useAuth();

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!transaction_id || !tx_ref) {
      setError("No payment reference found");
      setVerifying(false);
      return;
    }

    const verifyPayment = async () => {
      try {
        const res = await api.post("/api/payments/verify", {
          transaction_id,
          tx_ref,
        });
        if (res.data.data?.success) {
          setSuccess(true);
          // Refresh user profile to get updated subscription status
          await restoreSession();
          // Auto-redirect after 2 seconds
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        } else {
          setError("Payment verification failed");
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message || "Failed to verify payment"
        );
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [transaction_id, tx_ref, router, restoreSession]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <div className="w-12 h-12 border-4 border-forest border-t-transparent rounded-full mx-auto" />
          </div>
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-navy mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition-opacity"
          >
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4 animate-bounce">✓</div>
        <h1 className="text-3xl font-bold text-forest mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-8">
          Your subscription is now active. You have full access to all features.
        </p>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Check your email for a receipt and subscription details.
          </p>
          <Link
            href="/dashboard"
            className="inline-block w-full px-6 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition-opacity"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
