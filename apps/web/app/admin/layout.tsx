"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";

const NAV_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/review-answers", label: "Review Answers" },
  { href: "/admin/cutoff-marks", label: "Cut-off Marks" },
  { href: "/admin/flagged-questions", label: "Flagged Questions" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/recalled-questions", label: "Recalled Questions" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, profile, loading, router]);

  // Close the mobile drawer on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading || !user || profile?.role !== "admin") {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col md:flex-row pt-14 min-h-screen bg-gray-50">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-14 z-30 bg-navy text-white flex items-center justify-between px-4 py-3 shadow-lg">
        <span className="font-bold text-sm">Admin Panel</span>
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open admin menu"
          className="p-1"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 top-14 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-navy text-white shadow-lg fixed md:sticky left-0 top-14 md:top-14 h-[calc(100vh-56px)] overflow-y-auto z-50 transition-transform duration-200 flex-shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="md:hidden flex justify-end p-4">
          <button onClick={() => setSidebarOpen(false)} aria-label="Close admin menu">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="p-6 pt-0 md:pt-6 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-4 py-3 rounded-lg hover:bg-rose/20 transition-colors text-sm font-medium ${
                pathname === link.href ? "bg-rose/20" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="block px-4 py-3 rounded-lg hover:bg-rose/20 transition-colors text-sm font-medium mt-6 pt-6 border-t border-rose/30"
          >
            Back to Dashboard
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="px-4 sm:px-6 md:px-8 py-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
