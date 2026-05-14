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
} from "lucide-react";
import { AuthContext } from "@/context/AuthContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiresUpgrade?: boolean;
  upgradeTooltip?: string;
}

export function Navbar() {
  const { user, profile, logout, isAuthenticated } = useContext(AuthContext) || {};
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAuthenticated || !user || !profile) {
    return null;
  }

  const isExplorer = profile.subscription_status === "explorer";

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <Grid3x3 size={20} />,
    },
    {
      label: "Mock Exam",
      href: "/practice/mock/session",
      icon: <Clipboard size={20} />,
      requiresUpgrade: isExplorer,
      upgradeTooltip: "Upgrade to unlock full mock exam access",
    },
    {
      label: "Subjects",
      href: "/practice/topics",
      icon: <Book size={20} />,
    },
    {
      label: "Error Bank",
      href: "/error-bank",
      icon: <AlertCircle size={20} />,
      requiresUpgrade: isExplorer,
      upgradeTooltip: "Limited to 10 recent errors. Upgrade for unlimited access",
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: <BarChart3 size={20} />,
      requiresUpgrade: isExplorer,
      upgradeTooltip: "Upgrade to unlock full analytics",
    },
    {
      label: "Profile",
      href: "/profile",
      icon: <User size={20} />,
    },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D1B2A] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link
          href="/dashboard"
          className="text-xl font-bold text-[#1A7A4A] hover:text-[#C4522A] transition"
        >
          Roman
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <div key={item.href} className="relative group">
              {item.requiresUpgrade ? (
                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#1A2F45] transition relative group"
                  disabled
                >
                  {item.icon}
                  <span>{item.label}</span>

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[#C4522A] text-white text-xs px-3 py-2 rounded whitespace-nowrap z-50">
                    {item.upgradeTooltip}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#C4522A]" />
                  </div>
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive(item.href)
                      ? "bg-[#C4522A] text-white"
                      : "hover:bg-[#1A2F45] text-gray-300 hover:text-white"
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
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#1A2F45] transition text-gray-300 hover:text-white"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 hover:bg-[#1A2F45] rounded-lg transition"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0D1B2A] border-t border-[#1A2F45] px-4 py-4 space-y-3">
          {navItems.map((item) => (
            <div key={item.href}>
              {item.requiresUpgrade ? (
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-[#1A2F45] transition disabled opacity-60"
                  disabled
                  title={item.upgradeTooltip}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  <span className="text-xs text-[#C4522A] ml-auto">Upgrade</span>
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                    isActive(item.href)
                      ? "bg-[#C4522A] text-white"
                      : "hover:bg-[#1A2F45] text-gray-300 hover:text-white"
                  }`}
                  onClick={() => handleNavClick(item)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          ))}

          {/* Mobile Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-[#1A2F45] transition text-gray-300 hover:text-white"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </nav>
  );
}
