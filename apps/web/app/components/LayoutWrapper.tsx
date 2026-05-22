"use client";

import { useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import { AuthContext } from "@/context/AuthContext";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/onboarding"];
const EXCLUDE_NAVBAR_ROUTES = ["/practice/session", "/practice/mock/session"];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, logout, profile } = useContext(AuthContext) || {};
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [subscription, setSubscription] = useState<{ subscription_status: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  return (
    <>
      {shouldShowNavbar && (
        <nav className="sticky top-0 z-50 bg-navy text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-forest flex items-center justify-center font-bold text-white text-sm">
                RS
              </div>
              <h1 className="text-lg font-bold">Roman Series</h1>
            </div>
            <div className="flex items-center gap-6 relative">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${subscriptionBadge.colour}`}>
                {subscriptionBadge.label}
              </span>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center text-xs font-bold text-white">
                  {profile?.full_name?.split(" ").map(n => n[0]).join("") || "U"}
                </div>
                <span className="text-sm">{profile?.full_name || "User"}</span>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="text-gray-300 hover:text-white transition-colors p-2"
                  title="Menu"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-0.9 2-2s-0.9-2-2-2-2 0.9-2 2 0.9 2 2 2zm0 2c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2zm0 6c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2z" />
                  </svg>
                </button>
              </div>

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
        </nav>
      )}
      <div className={shouldShowNavbar ? "pt-16" : ""}>{children}</div>
    </>
  );
}
