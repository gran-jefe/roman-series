"use client";

import { useContext, useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import { AuthContext } from "@/context/AuthContext";
import { canAccessMockExam, canAccessHardMode, canAccessRecalledQuestions } from "@/lib/subscription";
import CountdownBanner from "./CountdownBanner";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/onboarding"];
const EXCLUDE_NAVBAR_ROUTES = ["/practice/session", "/practice/mock/session"];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, logout, profile } = useContext(AuthContext) || {};
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [subscription, setSubscription] = useState<{ subscription_status: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await api.get("/api/payments/status");
        setSubscription(res.data.data);
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
      }
    };

    if (isAuthenticated && !loading) {
      fetchSubscription();
    }
  }, [isAuthenticated, loading, pathname]);

  if (!mounted || loading) {
    return <>{children}</>;
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isExcludedRoute = EXCLUDE_NAVBAR_ROUTES.some(route => pathname.startsWith(route));
  const shouldShowNavbar = isAuthenticated && !isPublicRoute && !isExcludedRoute;

  const planLabels: Record<string, { label: string; colour: string }> = {
    explorer: { label: "Explorer", colour: "bg-amber-100 text-amber-800" },
    scholar: { label: "Scholar", colour: "bg-blue-100 text-blue-800" },
    elite: { label: "Elite", colour: "bg-purple-100 text-purple-800" },
  };

  const subscriptionBadge = planLabels[subscription?.subscription_status || "explorer"] ||
    { label: "Explorer", colour: "bg-amber-100 text-amber-800" };

  const hasMockExamAccess = canAccessMockExam(subscription?.subscription_status);
  const hasHardModeAccess = canAccessHardMode(subscription?.subscription_status);
  const hasRecalledQuestionsAccess = canAccessRecalledQuestions(subscription?.subscription_status);

  return (
    <>
      <CountdownBanner />
      {shouldShowNavbar && (
        <nav className="sticky top-0 z-40 bg-white text-navy border-b border-gray-200/60">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link href="/" className="hover:opacity-90 transition flex items-center">
              <Image
                src="/assets/logos/roman-series-full.png"
                alt="Roman Series"
                width={180}
                height={70}
                className="h-10 w-auto"
              />
            </Link>
            <div className="flex items-center gap-3 relative">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                subscription?.subscription_status === "elite"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                  : subscriptionBadge.colour
              }`}>
                {subscription?.subscription_status === "elite" && <span>⭐</span>}
                {subscriptionBadge.label}
              </span>
              <div className="flex items-center gap-3 relative" ref={menuRef}>
                <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center text-xs font-bold text-white">
                  {profile?.full_name?.split(" ").map(n => n[0]).join("") || "U"}
                </div>
                <span className="text-sm">{profile?.full_name || "User"}</span>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    menuOpen
                      ? "bg-forest text-white"
                      : "text-navy hover:text-forest hover:bg-gray-100"
                  }`}
                  title="Navigation Menu"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-0.9 2-2s-0.9-2-2-2-2 0.9-2 2 0.9 2 2 2zm0 2c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2zm0 6c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2z" />
                  </svg>
                  <span className="text-xs font-semibold">Menu</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#1A2F45] rounded-lg shadow-xl z-50">
                  <a
                    href="/dashboard"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#283D52] transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m2-2l6.3-6.3a1 1 0 011.414 0L19 9m-8.5 6.5L3 20.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Dashboard
                  </a>
                  <a
                    href="/dashboard#subjects-section"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#283D52] transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.228 6.253 2 10.541 2 15.75c0 5.209 4.228 9.5 10 9.5s10-4.291 10-9.5C22 10.541 17.772 6.253 12 6.253z" />
                    </svg>
                    Practice Subject
                  </a>
                  {hasMockExamAccess && (
                    <a
                      href="/practice/mock/session"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#283D52] transition"
                      onClick={() => setMenuOpen(false)}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Mock Exam
                    </a>
                  )}
                  {hasHardModeAccess && (
                    <a
                      href="/practice/mock/session?mode=hard"
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#283D52] transition"
                      onClick={() => setMenuOpen(false)}
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                          <polyline points="13 2 13 9 20 9" />
                        </svg>
                        Hard Mode
                      </div>
                      <span className="bg-purple-700 text-white text-xs font-bold px-2 py-0.5 rounded">Elite</span>
                    </a>
                  )}
                  {hasRecalledQuestionsAccess && (
                    <a
                      href="/practice/recalled-questions"
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#283D52] transition"
                      onClick={() => setMenuOpen(false)}
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Recalled Questions
                      </div>
                      <span className="bg-purple-700 text-white text-xs font-bold px-2 py-0.5 rounded">Elite</span>
                    </a>
                  )}
                  <a
                    href="/analytics"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#283D52] transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Analytics
                  </a>
                  <a
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#283D52] transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </a>
                  <a
                    href="/feedback"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#283D52] transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="text-lg">💬</span>
                    Feedback
                  </a>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout?.();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#283D52] transition border-t border-[#0D1B2A]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
                )}
              </div>
            </div>
          </div>
        </nav>
      )}
      <div className={shouldShowNavbar ? "pt-[60px]" : ""}>{children}</div>
    </>
  );
}
