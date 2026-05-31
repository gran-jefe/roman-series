"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import api from "@/lib/api";
import { Check, X } from "lucide-react";

export default function PricingPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSelectPlan = async (plan: "explorer" | "scholar" | "elite") => {
    // Explorer is free
    if (plan === "explorer") {
      router.push("/dashboard");
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setLoadingPlan(plan);
    setError("");

    try {
      // Check if user is already on Scholar and upgrading to Elite
      if (plan === "elite" && profile?.subscription_status === "scholar") {
        const res = await api.post("/api/payments/upgrade", { target_plan: plan });
        if (res.data.data?.authorization_url) {
          window.location.href = res.data.data.authorization_url;
        }
      } else {
        // Standard payment flow for new subscribers
        const res = await api.post("/api/payments/initiate", { plan });
        if (res.data.data?.authorization_url) {
          window.location.href = res.data.data.authorization_url;
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to initiate payment"
      );
      setLoadingPlan(null);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  const isOnScholar = profile?.subscription_status === "scholar";

  const plans = [
    {
      name: "Explorer",
      price: "Free",
      subheading: "Get started",
      badge: null,
      cta: "Get Started Free",
      ctaPlan: "explorer" as const,
      highlighted: false,
      features: [
        { name: "1–2 subjects", included: true },
        { name: "20 questions/day", included: true },
        { name: "2 mock exams (lifetime)", included: true },
        { name: "Timer simulation", included: true },
        { name: "Last 10 errors in error bank", included: true },
        { name: "Basic analytics", included: true },
        { name: "Daily streak", included: true },
        { name: "Top 20 leaderboard", included: true },
        { name: "Full predicted score", included: false },
        { name: "Course comparison", included: false },
        { name: "Full error bank", included: false },
        { name: "Unlimited practice", included: false },
      ],
    },
    {
      name: "Scholar",
      price: "₦3,500",
      subheading: "Most students choose this",
      badge: "Most Popular",
      cta: "Get Scholar",
      ctaPlan: "scholar" as const,
      highlighted: true,
      features: [
        { name: "Unlimited practice", included: true },
        { name: "All subjects", included: true },
        { name: "Topic-by-topic drilling", included: true },
        { name: "3 mock exams per week", included: true },
        { name: "Full error bank", included: true },
        { name: "Detailed analytics", included: true },
        { name: "Topic mastery tracking", included: true },
        { name: "Speed analysis", included: true },
        { name: "Daily streak", included: true },
        { name: "Full leaderboard + your rank", included: true },
        { name: "Predicted score (basic)", included: true },
        { name: "Weak topic recommendations", included: true },
        { name: "Performance history", included: true },
        { name: "Exam simulation mode", included: true },
      ],
    },
    {
      name: "Elite",
      price: "₦5,000",
      subheading: "For the top 1%",
      badge: "Best Value",
      cta: isOnScholar ? "Upgrade for ₦1,500" : "Get Elite",
      ctaPlan: "elite" as const,
      highlighted: false,
      upgradeNote: isOnScholar ? "Already on Scholar? Just pay ₦1,500 to upgrade." : null,
      features: [
        { name: "Everything in Scholar", included: true },
        { name: "Advanced predictive scoring", included: true },
        { name: "Admission probability meter", included: true },
        { name: "Course-specific ranking", included: true },
        { name: "Percentile ranking (You're ahead of X%)", included: true },
        { name: "Smart weak-topic prioritisation", included: true },
        { name: "Advanced analytics dashboard", included: true },
        { name: "Time-pressure diagnostics", included: true },
        { name: "Hard-mode mock exams", included: true },
        { name: "Likely UI-standard challenge sets", included: true },
        { name: "Extended leaderboard", included: true },
        { name: "Elite badge (blue tick on profile)", included: true },
        { name: "Performance trend forecasting", included: true },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      {/* Navbar */}
    

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#0D1B2A] mb-4">Simple, Transparent Pricing</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Choose the plan that works best for your exam preparation journey
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-[#C4522A]">{error}</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg shadow-lg overflow-hidden transition-transform ${
                plan.highlighted
                  ? "ring-2 ring-[#1A7A4A] scale-105 bg-white"
                  : "bg-white hover:shadow-xl"
              }`}
            >
              {plan.badge && (
                <div className="bg-[#1A7A4A] text-white text-center py-2 text-sm font-semibold">
                  {plan.badge}
                </div>
              )}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-[#0D1B2A] mb-1">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-6">{plan.subheading}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-[#1A7A4A]">{plan.price}</span>
                  {plan.price !== "Free" && (
                    <span className="text-gray-600 ml-2">/ 6 months</span>
                  )}
                </div>

                {plan.upgradeNote && (
                  <p className="text-xs text-gray-500 mb-4 italic">{plan.upgradeNote}</p>
                )}

                <button
                  onClick={() => handleSelectPlan(plan.ctaPlan)}
                  disabled={loadingPlan === plan.ctaPlan}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-opacity mb-8 ${
                    plan.highlighted
                      ? "bg-[#1A7A4A] text-white hover:bg-opacity-90"
                      : plan.ctaPlan === "explorer"
                      ? "border-2 border-[#1A7A4A] text-[#1A7A4A] hover:bg-[#1A7A4A] hover:text-white"
                      : "border-2 border-gray-300 text-gray-700 hover:border-[#1A7A4A] hover:text-[#1A7A4A]"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loadingPlan === plan.ctaPlan ? "Processing..." : plan.cta}
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check size={18} className="text-[#1A7A4A] flex-shrink-0 mt-0.5" />
                      ) : (
                        <X size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={`text-sm ${feature.included ? "text-gray-700" : "text-gray-400"}`}>
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ / Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <h3 className="text-lg font-bold text-[#0D1B2A] mb-2">Not sure which plan is right for you?</h3>
          <p className="text-gray-600 mb-4">
            Start with <strong>Explorer</strong> for free and upgrade anytime. All plans include access to
            past questions, timed practice, and performance tracking.
          </p>
          <Link href="/dashboard" className="text-[#1A7A4A] font-medium hover:underline">
            Start Free →
          </Link>
        </div>
      </main>
    </div>
  );
}
