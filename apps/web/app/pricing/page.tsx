"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import api from "@/lib/api";
import { Check } from "lucide-react";

export default function PricingPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isOnScholar = profile?.subscription_status === "scholar";
  const isOnElite = profile?.subscription_status === "elite";

  const handleSelectPlan = async (plan: "explorer" | "scholar" | "elite") => {
    if (plan === "explorer") {
      router.push("/dashboard");
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    // Scholar upgrading to Elite
    if (plan === "elite" && isOnScholar) {
      router.push("/upgrade");
      return;
    }

    setLoadingPlan(plan);
    setError("");

    try {
      const res = await api.post("/api/payments/paystack/initialize", {
        plan,
      });
      const { authorization_url } = res.data.data;

      // Redirect to Paystack's hosted checkout page
      window.location.href = authorization_url;
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err?.response?.data?.message || "Payment failed. Try again.");
      setLoadingPlan(null);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  const plans = [
    {
      key: "explorer" as const,
      name: "Explorer",
      price: "Free",
      originalPrice: null,
      duration: null,
      subheading: "Get started with essential practice",
      badge: null,
      cta: "Get Started Free",
      highlighted: false,
      isCurrent: profile?.subscription_status === "explorer" && !isOnScholar && !isOnElite,
      features: [
        "1–2 subjects",
        "20 questions/day",
        "1 mock exam",
        "Timer simulation",
        "Last 10 errors in error bank",
        "Basic analytics",
        "Daily streak",
        "Top 20 leaderboard",
      ],
    },
    {
      key: "scholar" as const,
      name: "Scholar",
      price: "₦2,500",
      originalPrice: "₦3,500",
      duration: "/ 6 months",
      subheading: "Comprehensive UTME & Post-UTME preparation",
      badge: "Most Popular",
      cta: isOnScholar ? "Current Plan" : "Get Scholar",
      highlighted: true,
      isCurrent: isOnScholar,
      features: [
        "All subjects, unlimited practice",
        "Unlimited questions/day",
        "3 mock exams per week",
        "Full error bank",
        "Topic performance breakdown",
        "Peer comparison insights",
        "Full global leaderboard",
        "Priority student support",
      ],
    },
    {
      key: "elite" as const,
      name: "Elite",
      price: "₦3,500",
      originalPrice: "₦5,000",
      duration: "/ 6 months",
      subheading: "For top performers aiming for high merit scores",
      badge: "Best Value",
      cta: isOnElite ? "Current Plan" : isOnScholar ? "Upgrade for ₦1,000" : "Get Elite",
      highlighted: false,
      isCurrent: isOnElite,
      features: [
        "Everything in Scholar",
        "Unlimited mock exams",
        "Hard-mode mock exams",
        "Access to authentic UTME & Post-UTME questions",
        "Full error bank",
        "Advanced predictive scoring",
        "Admission probability meter",
        "Course-specific ranking",
        "Percentile ranking (You're ahead of X%)",
        "Smart weak-topic prioritisation",
        "Advanced analytics dashboard",
        "Time-pressure diagnostics",
        "Recalled & challenge questions",
        "Extended leaderboard",
        "Elite badge (blue tick on profile)",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-block bg-[#1A7A4A]/10 text-[#1A7A4A] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            UTME & Post-UTME Preparation
          </div>
          <h1 className="text-4xl font-bold text-[#0D1B2A] mb-4">Simple, Transparent Pricing</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Choose the plan that fits your exam goals. Full-season 6-month access covering both UTME and Post-UTME screenings.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg max-w-5xl mx-auto">
            <p className="text-sm text-[#C4522A] mb-1">{error}</p>
            <p className="text-xs text-[#C4522A]/80">
              Still stuck? Call 0906 177 0885 / 0703 834 1818 or email granjefetech@gmail.com
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`w-full rounded-lg shadow-lg overflow-hidden transition-transform ${
                plan.highlighted
                  ? "ring-2 ring-[#1A7A4A] md:scale-105 md:-mt-4 bg-white order-1 md:order-2"
                  : "bg-white hover:shadow-xl"
              } ${plan.key === "elite" ? "order-2 md:order-3" : ""} ${plan.key === "explorer" ? "order-3 md:order-1" : ""}`}
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
                  <div className="flex items-baseline gap-2 flex-wrap mb-2">
                    <span className="text-4xl font-bold text-[#1A7A4A]">{plan.price}</span>
                    {plan.originalPrice && (
                      <span className="text-lg text-gray-400 line-through">
                        {plan.originalPrice}
                      </span>
                    )}
                  </div>
                  {plan.duration && (
                    <span className="text-gray-600">{plan.duration}</span>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={loadingPlan === plan.key || plan.isCurrent}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-opacity mb-8 ${
                    plan.isCurrent
                      ? "bg-gray-100 text-gray-500 cursor-default"
                      : plan.highlighted
                      ? "bg-[#1A7A4A] text-white hover:bg-opacity-90"
                      : plan.key === "explorer"
                      ? "border-2 border-[#1A7A4A] text-[#1A7A4A] hover:bg-[#1A7A4A] hover:text-white"
                      : "border-2 border-gray-300 text-gray-700 hover:border-[#1A7A4A] hover:text-[#1A7A4A]"
                  } disabled:opacity-50`}
                >
                  {loadingPlan === plan.key ? "Processing..." : plan.cta}
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check size={18} className="text-[#1A7A4A] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ / Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center max-w-5xl mx-auto">
          <h3 className="text-lg font-bold text-[#0D1B2A] mb-2">Not sure which plan is right for you?</h3>
          <p className="text-gray-600 mb-4">
            Start with <strong>Explorer</strong> for free and upgrade anytime. All plans include access to
            authentic past questions, timed practice, and performance analytics.
          </p>
          <Link href="/dashboard" className="text-[#1A7A4A] font-medium hover:underline">
            Start Free →
          </Link>
        </div>

        {/* Payment Support */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-8 text-center max-w-5xl mx-auto">
          <h3 className="text-lg font-bold text-[#0D1B2A] mb-2">Having issues paying?</h3>
          <p className="text-gray-600 mb-4">
            If your payment doesn&apos;t go through or you run into any trouble at checkout, reach out to us directly — we&apos;ll sort it out.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-[#1A7A4A]">
            <a href="tel:09061770885" className="hover:underline">0906 177 0885</a>
            <a href="tel:07038341818" className="hover:underline">0703 834 1818</a>
            <a href="mailto:granjefetech@gmail.com" className="hover:underline">granjefetech@gmail.com</a>
            <a href="mailto:roman.series.edu@gmail.com" className="hover:underline">roman.series.edu@gmail.com</a>
          </div>
        </div>
      </main>
    </div>
  );
}
