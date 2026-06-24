"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import api from "@/lib/api";
import { Check } from "lucide-react";
import toast from "react-hot-toast";

// Utility function to load Flutterwave script and open modal
const openFlutterwaveModal = (config: any) => {
  const scriptId = "flutterwave-inline-script";

  const initPayment = () => {
    if (typeof window !== "undefined" && (window as any).FlutterwaveCheckout) {
      (window as any).FlutterwaveCheckout(config);
    }
  };

  if (document.getElementById(scriptId)) {
    initPayment();
    return;
  }

  const script = document.createElement("script");
  script.id = scriptId;
  script.src = "https://checkout.flutterwave.com/v3.js";
  script.onload = initPayment;
  document.body.appendChild(script);
};

export default function UpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
        return;
      }
      // Only allow Scholar users to access upgrade page
      if (profile?.subscription_status !== "scholar") {
        router.push("/pricing");
        return;
      }
    }
  }, [user, profile, loading, router]);

  const handleUpgradeToElite = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      // Call backend to create subscription record and get tx_ref
      const res = await api.post("/api/payments/upgrade", {
        target_plan: "elite",
      });

      const paymentData = res.data.data;

      // Configure Flutterwave
      const config = {
        public_key: process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY!,
        tx_ref: paymentData.tx_ref,
        amount: paymentData.amount,
        currency: "NGN",
        payment_options: "card,banktransfer,ussd,opay",
        customer: {
          email: user.email || "",
          name: profile?.full_name || "Roman Series Student",
        },
        customizations: {
          title: "Roman Series",
          description: "Upgrade to Elite",
          logo: "https://romanseries.com.ng/logo.png",
        },
        callback: async (response: any) => {
          console.log("[FLW] Upgrade response:", response);

          if (response.status === "successful" || response.charge_response_code === "00") {
            try {
              // Verify payment on backend
              await api.post("/api/payments/verify", {
                transaction_id: response.transaction_id,
                tx_ref: response.tx_ref,
              });
              toast.success("Payment successful! Your subscription is now Elite.");
              // Refresh user profile to get updated subscription status
              // Wait for refresh to complete before redirecting
              await refreshProfile();
              // Small delay to ensure UI updates, then redirect
              setTimeout(() => router.push("/dashboard"), 500);
            } catch (error) {
              console.error("[Upgrade] Verification error:", error);
              toast.error(`Verification failed. Contact support with ref: ${paymentData.tx_ref}`);
              setIsProcessing(false);
            }
          } else {
            toast.error("Payment was not completed. Please try again.");
            setIsProcessing(false);
          }
        },
        onclose: () => {
          setIsProcessing(false);
        },
      };

      // Open Flutterwave modal using direct script
      openFlutterwaveModal(config);
      setIsProcessing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to initiate upgrade. Please try again.");
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!user || profile?.subscription_status !== "scholar") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">This page is only for Scholar users.</p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90"
          >
            Back to Pricing
          </Link>
        </div>
      </div>
    );
  }

  const eliteFeatures = [
    "Everything in Scholar",
    "Advanced predictive scoring",
    "Admission probability meter",
    "Course-specific ranking",
    "Percentile ranking (You're ahead of X%)",
    "Smart weak-topic prioritisation",
    "Advanced analytics dashboard",
    "Time-pressure diagnostics",
    "Hard-mode mock exams",
    "Recalled UI-POSTUTME questions",
    "Extended leaderboard",
    "Elite badge (blue tick on profile)",
    "Performance trend forecasting",
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link
            href="/pricing"
            className="text-forest text-sm font-medium hover:underline mb-4 inline-block"
          >
            ← Back to Pricing
          </Link>
          <h1 className="text-4xl font-bold text-[#0D1B2A] mb-2">
            Upgrade to Elite
          </h1>
          <p className="text-gray-600">
            Unlock advanced features and boost your exam preparation
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-[#C4522A]">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Pricing */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-[#0D1B2A] mb-2">
                Elite Plan
              </h2>
              <p className="text-gray-600">
                Full access to all premium features
              </p>
            </div>

            {/* Pricing Display */}
            <div className="bg-gradient-to-br from-forest/5 to-transparent rounded-lg p-6 mb-8 border border-forest/20">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Your current plan: Scholar (₦2,500){" "}
                  <span className="text-xs text-ember font-semibold">PROMO</span>
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  Elite plan regular price:{" "}
                  <span className="line-through">₦5,000</span>
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">
                    Elite plan promo price:{" "}
                    <span className="font-bold text-forest">₦3,500</span>
                  </p>
                  <span className="bg-ember text-white text-xs font-bold px-2 py-1 rounded">
                    PROMO
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4 border-2 border-forest">
                <p className="text-sm text-gray-600 mb-1">You&apos;ll pay today:</p>
                <p className="text-5xl font-bold text-forest">₦1,000</p>
                <p className="text-xs text-gray-500 mt-2">
                  Difference between Scholar (₦2,500) and Elite (₦3,500) for 6 months
                </p>
              </div>

              <button
                onClick={handleUpgradeToElite}
                disabled={isProcessing}
                className={`w-full py-4 px-6 rounded-lg font-bold text-white text-lg transition-all ${
                  isProcessing
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-forest hover:bg-opacity-90 shadow-lg hover:shadow-xl"
                }`}
              >
                {isProcessing
                  ? "Processing..."
                  : "Complete Upgrade (₦1,000)"}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Secure payment powered by Flutterwave
              </p>
            </div>

            {/* Trust Indicators */}
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>Instant access to all Elite features</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>Valid for 6 months from purchase</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>Secure payment with Flutterwave</span>
              </div>
            </div>
          </div>

          {/* Right: Features */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-bold text-[#0D1B2A] mb-6">
              What You Get
            </h3>
            <div className="space-y-4">
              {eliteFeatures.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Check
                    size={20}
                    className="text-forest flex-shrink-0 mt-0.5"
                  />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            {/* Additional Info */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">
                Why upgrade to Elite?
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Get advanced analytics to identify weak areas faster</li>
                <li>• Practice hard-mode exams for extra challenge</li>
                <li>• Access recalled UI-POSTUTME questions</li>
                <li>• See your percentile ranking among peers</li>
                <li>• Get admission probability predictions</li>
              </ul>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-8">
          <h3 className="text-lg font-bold text-[#0D1B2A] mb-4">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">
                Why only ₦1,000?
              </h4>
              <p className="text-gray-600 text-sm">
                During our promo, you&apos;re upgrading from Scholar at the promo price (₦2,500) to Elite at the promo price (₦3,500) for the same 6-month period. You only pay the difference of ₦1,000.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">
                How long does the upgrade take?
              </h4>
              <p className="text-gray-600 text-sm">
                Your access is updated instantly after successful payment.
                You&apos;ll have full Elite features immediately.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">
                Can I get a refund?
              </h4>
              <p className="text-gray-600 text-sm">
                Contact support within 7 days of purchase for a full refund if
                you&apos;re not satisfied.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">
                What happens when my subscription expires?
              </h4>
              <p className="text-gray-600 text-sm">
                Your subscription lasts 6 months. You&apos;ll get a notification
                before it expires and can renew anytime.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
