"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import api from "@/lib/api";
import { Check, X } from "lucide-react";
import toast from "react-hot-toast";

// Utility function to load Flutterwave script and open modal
const openFlutterwaveModal = (config: any) => {
  const scriptId = "flutterwave-inline-script";

  const initPayment = () => {
    try {
      if (typeof window !== "undefined" && (window as any).FlutterwaveCheckout) {
        (window as any).FlutterwaveCheckout(config);
      } else {
        console.error("[FLW] FlutterwaveCheckout not available on window");
        toast.error("Payment system failed to load. Please refresh and try again.");
      }
    } catch (err) {
      console.error("[FLW] FlutterwaveCheckout error:", err);
      toast.error("Payment failed to open. Please try again.");
    }
  };

  const existingScript = document.getElementById(scriptId);
  if (existingScript) {
    // Script already loaded — call directly
    initPayment();
    return;
  }

  const script = document.createElement("script");
  script.id = scriptId;
  script.src = "https://checkout.flutterwave.com/v3.js";
  script.async = true;
  script.onload = () => {
    console.log("[FLW] Script loaded successfully");
    initPayment();
  };
  script.onerror = () => {
    console.error("[FLW] Failed to load Flutterwave script");
    toast.error("Payment system unavailable. Check your connection.");
  };
  document.body.appendChild(script);
};

export default function PricingPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isLaunch, setIsLaunch] = useState(true);

  // Countdown to launch (June 27, 2026) or discount (7 days after launch)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const launchDate = new Date(2026, 5, 27, 0, 0, 0, 0); // June 27, 2026 at midnight
      const discountEnd = new Date(launchDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days after launch
      discountEnd.setHours(23, 59, 59, 999);

      let targetDate: Date;
      let launchMode: boolean;

      if (now < launchDate) {
        // Still countdown to launch
        targetDate = launchDate;
        launchMode = true;
      } else if (now < discountEnd) {
        // Countdown to end of discount
        targetDate = discountEnd;
        launchMode = false;
      } else {
        // Discount ended
        setTimeLeft("");
        return;
      }

      const diff = targetDate.getTime() - now.getTime();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        setIsLaunch(launchMode);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

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
      // Check if public key is available
      console.log(
        "[FLW] Public key available:",
        !!process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY
      );

      if (!process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY) {
        toast.error(
          "Payment configuration error: Flutterwave public key not configured"
        );
        setLoadingPlan(null);
        return;
      }

      // Check if user is already on Scholar and upgrading to Elite
      if (plan === "elite" && profile?.subscription_status === "scholar") {
        // Redirect to dedicated upgrade page for Scholar → Elite
        router.push("/upgrade");
        return;
      }

      // Pricing in Naira
      const pricing = {
        scholar: 2500,
        elite: 3500,
      };

      const amount = pricing[plan as keyof typeof pricing];

      // Step 1: Create subscription record and get tx_ref
      const res = await api.post("/api/payments/initiate", { plan });
      const { tx_ref } = res.data.data;

      // Step 2: Configure Flutterwave
      const config = {
        public_key: process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY,
        tx_ref,
        amount,
        currency: "NGN",
        payment_options: "card,banktransfer,ussd,opay",
        customer: {
          email: user?.email || "",
          name: profile?.full_name || "Student",
        },
        customizations: {
          title: "Roman Series",
          description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - 6 months`,
          logo: "https://romanseries.com.ng/logo.png",
        },
        callback: async (response: any) => {
          if (
            response.status === "successful" ||
            response.charge_response_code === "00"
          ) {
            try {
              await api.post("/api/payments/verify", {
                transaction_id: response.transaction_id,
                tx_ref: response.tx_ref,
              });
              toast.success("Payment successful! Upgrading your account...");
              setTimeout(() => {
                window.location.href = "/dashboard";
              }, 2000);
            } catch (err: any) {
              toast.error(
                err?.response?.data?.message ||
                  "Payment received but upgrade failed. Contact support."
              );
            }
          } else {
            toast.error("Payment was not completed");
            setLoadingPlan(null);
          }
        },
        onclose: () => {
          setLoadingPlan(null);
        },
      };

      // Validate config before opening modal
      if (!config.public_key) {
        toast.error("Payment configuration error: missing public key");
        setLoadingPlan(null);
        return;
      }
      if (!config.customer.email) {
        toast.error("Please log in to make a payment");
        setLoadingPlan(null);
        return;
      }

      console.log("[FLW] Opening modal with config:", {
        public_key: config.public_key.substring(0, 20) + "...",
        tx_ref: config.tx_ref,
        amount: config.amount,
        customer_email: config.customer.email,
      });

      // Step 3: Open Flutterwave modal using direct script
      openFlutterwaveModal(config);
      setLoadingPlan(null);
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err?.response?.data?.message || "Payment failed. Try again.");
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
        { name: "1 mock exam", included: true },
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
      price: "₦2,500",
      originalPrice: "₦3,500",
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
      price: "₦3,500",
      originalPrice: "₦5,000",
      subheading: "For the top 1%",
      badge: "Best Value",
      cta: isOnScholar ? "Upgrade for ₦1,000" : "Get Elite",
      ctaPlan: "elite" as const,
      highlighted: false,
      upgradeNote: isOnScholar ? "Already on Scholar? Just pay ₦1,000 to upgrade." : null,
      features: [
        { name: "Everything in Scholar", included: true },
        { name: "Unlimited mock exams", included: true },
        { name: "Hard-mode mock exams", included: true },
        { name: "Access to authentic UI POST-UTME questions from 2019-2025", included: true },
        { name: "Advanced predictive scoring", included: true },
        { name: "Admission probability meter", included: true },
        { name: "Course-specific ranking", included: true },
        { name: "Percentile ranking (You're ahead of X%)", included: true },
        { name: "Smart weak-topic prioritisation", included: true },
        { name: "Advanced analytics dashboard", included: true },
        { name: "Time-pressure diagnostics", included: true },
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
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        {/* Launch/Discount Banner */}
        {timeLeft && (
          <div className="mb-8 p-4 bg-gradient-to-r from-ember to-amber-600 text-white rounded-lg text-center border border-amber-400">
            <p className="font-semibold">{isLaunch ? "🚀 Platform Launching Soon!" : "🎉 Launch Week Special! Limited-time discount pricing available"}</p>
            <p className="text-sm mt-1">{isLaunch ? "Launching in: " : "Ends in: "}{timeLeft}</p>
          </div>
        )}

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`w-full rounded-lg shadow-lg overflow-hidden transition-transform ${
                plan.highlighted
                  ? "ring-2 ring-[#1A7A4A] md:scale-105 md:-mt-4 bg-white order-1 md:order-2"
                  : "bg-white hover:shadow-xl"
              } ${plan.name === "Elite" ? "order-2 md:order-3" : ""} ${plan.name === "Explorer" ? "order-3 md:order-1" : ""}`}
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
                      <>
                        <span className="text-lg text-gray-400 line-through">
                          {plan.originalPrice}
                        </span>
                        <span className="bg-ember text-white text-xs font-bold px-2 py-1 rounded">
                          DISCOUNT
                        </span>
                      </>
                    )}
                  </div>
                  {plan.price !== "Free" && (
                    <span className="text-gray-600">/ 6 months</span>
                  )}
                  {plan.upgradeNote && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm font-semibold text-forest mb-1">Coming from Scholar?</p>
                      <p className="text-lg font-bold text-forest">{plan.upgradeNote}</p>
                    </div>
                  )}
                </div>

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
