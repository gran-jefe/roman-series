"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

export default function PricingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSelectPlan = async (plan: "monthly" | "per_university" | "bundle") => {
    if (!user) {
      router.push("/login");
      return;
    }

    setLoadingPlan(plan);
    setError("");

    try {
      const res = await api.post("/api/payments/initiate", { plan });
      if (res.data.data?.authorization_url) {
        window.location.href = res.data.data.authorization_url;
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to initiate payment"
      );
      setLoadingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const plans = [
    {
      name: "Per University Pack",
      price: "₦1,500",
      duration: "1 year",
      description: "Access to one university's past questions",
      features: [
        "One university only",
        "All subjects for that university",
        "Valid for 1 year",
        "Offline download (coming soon)",
      ],
      plan: "per_university" as const,
      highlighted: false,
    },
    {
      name: "Monthly Access",
      price: "₦2,000",
      duration: "30 days",
      description: "Perfect for quick preparation",
      features: [
        "All universities",
        "All subjects",
        "Valid for 30 days",
        "Performance analytics",
        "Leaderboard access",
      ],
      plan: "monthly" as const,
      highlighted: true,
      badge: "Most Popular",
    },
    {
      name: "Bundle Deal",
      price: "₦5,000",
      duration: "90 days",
      description: "Best value for comprehensive prep",
      features: [
        "All universities",
        "All subjects",
        "Valid for 90 days",
        "Performance analytics",
        "Leaderboard access",
        "Priority support",
      ],
      plan: "bundle" as const,
      highlighted: false,
      badge: "Best Value",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-navy text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-forest rounded-full" />
            <h1 className="text-xl font-bold">Roman Series</h1>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white">
            Back to Dashboard
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-navy mb-4">Simple, Transparent Pricing</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Choose the plan that works best for your exam preparation journey
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-ember">{error}</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.plan}
              className={`rounded-lg shadow-lg overflow-hidden transition-transform transform hover:scale-105 ${
                plan.highlighted
                  ? "ring-2 ring-forest scale-105 bg-white"
                  : "bg-white"
              }`}
            >
              {plan.badge && (
                <div className="bg-forest text-white text-center py-2 text-sm font-semibold">
                  {plan.badge}
                </div>
              )}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-navy mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-forest">{plan.price}</span>
                  <span className="text-gray-600 ml-2">/ {plan.duration}</span>
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.plan)}
                  disabled={loadingPlan === plan.plan}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-opacity mb-8 ${
                    plan.highlighted
                      ? "bg-forest text-white hover:bg-opacity-90"
                      : "border-2 border-forest text-forest hover:bg-forest hover:text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loadingPlan === plan.plan ? "Processing..." : "Get Started"}
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-forest font-bold">✓</span>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Free Tier Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <h3 className="text-lg font-bold text-navy mb-2">Starting Your Journey?</h3>
          <p className="text-gray-600 mb-4">
            Free users get <strong>10 practice questions</strong> to try out Roman Series before upgrading.
            Perfect for testing our features!
          </p>
          <Link href="/dashboard" className="text-forest font-medium hover:underline">
            Try Free →
          </Link>
        </div>
      </main>
    </div>
  );
}
