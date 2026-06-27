"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, profile, loading, router]);

  if (loading || !user || profile?.role !== "admin") {
    return <PageLoader />;
  }

  return (
    <div className="flex pt-14 min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-navy text-white shadow-lg fixed left-0 top-14 h-[calc(100vh-56px)] overflow-y-auto">
        <nav className="p-6 space-y-1">
          <Link
            href="/admin"
            className="block px-4 py-3 rounded-lg hover:bg-rose/20 transition-colors text-sm font-medium"
          >
            Overview
          </Link>
          <Link
            href="/admin/users"
            className="block px-4 py-3 rounded-lg hover:bg-rose/20 transition-colors text-sm font-medium"
          >
            Users
          </Link>
          <Link
            href="/admin/questions"
            className="block px-4 py-3 rounded-lg hover:bg-rose/20 transition-colors text-sm font-medium"
          >
            Questions
          </Link>
          <Link
            href="/admin/review-answers"
            className="block px-4 py-3 rounded-lg hover:bg-rose/20 transition-colors text-sm font-medium"
          >
            Review Answers
          </Link>
          <Link
            href="/admin/cutoff-marks"
            className="block px-4 py-3 rounded-lg hover:bg-rose/20 transition-colors text-sm font-medium"
          >
            Cut-off Marks
          </Link>
          <Link
            href="/dashboard"
            className="block px-4 py-3 rounded-lg hover:bg-rose/20 transition-colors text-sm font-medium mt-6 pt-6 border-t border-rose/30"
          >
            Back to Dashboard
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto ml-64">
        <div className="px-8 py-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
