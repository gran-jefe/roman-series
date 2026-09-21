"use client";

import { useState, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Grid3x3,
  Clipboard,
  Book,
  AlertCircle,
  BarChart3,
  User,
  LogOut,
  Menu,
  X,
  Zap,
  Archive,
  Trophy,
  Crown,
  Sparkles,
} from "lucide-react";
import { AuthContext } from "@/context/AuthContext";
import {
  canAccessAnalytics,
  canAccessErrorBank,
  canAccessMockExam,
  canAccessHardMode,
  canAccessRecalledQuestions,
  getSubscriptionName,
} from "@/lib/subscription";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiresUpgrade?: boolean;
  upgradeTooltip?: string;
  badge?: string;
}

export function Navbar() {
  const { user, profile, logout, isAuthenticated } = useContext(AuthContext) || {};
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAuthenticated || !user || !profile) {
    return null;
  }

  const planName = getSubscriptionName(profile.subscription_status);
  const status = profile.subscription_status?.toLowerCase();
  const hasMockExamAccess = canAccessMockExam(profile.subscription_status);
  const hasErrorBankAccess = canAccessErrorBank(profile.subscription_status);
  const hasAnalyticsAccess = canAccessAnalytics(profile.subscription_status);
  const hasHardModeAccess = canAccessHardMode(profile.subscription_status);
  const hasRecalledQuestionsAccess = canAccessRecalledQuestions(profile.subscription_status);

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <Grid3x3 size={18} />,
    },
    {
      label: "Mock Exam",
      href: "/practice/mock/session",
      icon: <Clipboard size={18} />,
      requiresUpgrade: !hasMockExamAccess,
      upgradeTooltip: "Upgrade to Scholar or Elite for mock exams",
    },
    {
      label: "Hard Mode",
      href: "/practice/mock/session?mode=hard",
      icon: <Zap size={18} />,
      requiresUpgrade: !hasHardModeAccess,
      upgradeTooltip: "Elite feature: Timed stress & hard questions",
      badge: "Elite",
    },
    {
      label: "Recalled",
      href: "/practice/recalled-questions",
      icon: <Archive size={18} />,
      requiresUpgrade: !hasRecalledQuestionsAccess,
      upgradeTooltip: "Elite feature: Real recalled past questions",
      badge: "Elite",
    },
    {
      label: "Subjects",
      href: "/practice/topics",
      icon: <Book size={18} />,
    },
    {
      label: "Error Bank",
      href: "/error-bank",
      icon: <AlertCircle size={18} />,
      requiresUpgrade: !hasErrorBankAccess,
      upgradeTooltip: "Upgrade to Scholar or Elite to unlock Error Bank",
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: <BarChart3 size={18} />,
      requiresUpgrade: !hasAnalyticsAccess,
      upgradeTooltip: "Upgrade to Scholar or Elite for analytics",
    },
    {
      label: "Leaderboard",
      href: "/leaderboard",
      icon: <Trophy size={18} />,
    },
    {
      label: "Profile",
      href: "/profile",
      icon: <User size={18} />,
    },
  ];

  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const handleLogout = async () => {
    if (logout) {
      await logout();
    }
    setMobileMenuOpen(false);
  };

  const handleNavClick = (item: NavItem) => {
    if (item.requiresUpgrade) {
      return;
    }
    setMobileMenuOpen(false);
  };

  const renderPlanBadge = () => {
    if (status === "elite") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-400/30">
          <Crown className="w-3 h-3 text-purple-300" />
          Elite
        </span>
      );
    }
    if (status === "scholar") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
          <Sparkles className="w-3 h-3 text-emerald-300" />
          Scholar
        </span>
      );
    }
    return (
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/80 hover:bg-[#C4522A] hover:text-white transition border border-white/15"
      >
        Explorer • Upgrade →
      </Link>
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D1B2A]/95 backdrop-blur-md text-white border-b border-white/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo / Brand & Plan */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 group"
          >
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1A7A4A] to-[#125533] flex items-center justify-center font-black text-white text-base shadow-sm group-hover:scale-105 transition-transform">
              R
            </span>
            <span className="text-lg font-black tracking-tight text-white group-hover:text-[#1A7A4A] transition-colors">
              Roman<span className="text-[#C4522A]">Series</span>
            </span>
          </Link>
          <div className="hidden sm:block">
            {renderPlanBadge()}
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <div key={item.href} className="relative group">
              {item.requiresUpgrade ? (
                <Link
                  href="/pricing"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition relative"
                >
                  <span className="opacity-60">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-500/30">
                      {item.badge}
                    </span>
                  )}
                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-[#0D1B2A] border border-white/20 text-white text-[11px] font-normal px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
                    {item.upgradeTooltip}
                  </div>
                </Link>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive(item.href)
                      ? "bg-[#1A7A4A] text-white shadow-sm"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                  onClick={() => handleNavClick(item)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          ))}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Log out"
            className="flex items-center gap-1.5 ml-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile menu and plan badge button */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="sm:hidden">
            {renderPlanBadge()}
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0D1B2A] border-t border-white/10 px-4 py-4 space-y-1.5 shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto">
          {navItems.map((item) => (
            <div key={item.href}>
              {item.requiresUpgrade ? (
                <Link
                  href="/pricing"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center gap-3">
                    <span className="opacity-60">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#C4522A]/20 text-[#E07A5F] border border-[#C4522A]/30">
                    Upgrade
                  </span>
                </Link>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive(item.href)
                      ? "bg-[#1A7A4A] text-white"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                  onClick={() => handleNavClick(item)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          ))}

          <div className="pt-3 mt-3 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

