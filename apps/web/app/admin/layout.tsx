"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-navy text-white shadow-lg">
        <div className="p-6 border-b border-navy-light">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-forest rounded-full" />
            <span className="font-bold text-lg">Roman Series</span>
          </Link>
          <p className="text-xs text-gray-300 mt-2">Admin Panel</p>
        </div>

        <nav className="p-6 space-y-2">
          <Link
            href="/admin"
            className="block px-4 py-3 rounded-lg hover:bg-navy-light transition-colors text-sm font-medium"
          >
            Overview
          </Link>
          <Link
            href="/admin/users"
            className="block px-4 py-3 rounded-lg hover:bg-navy-light transition-colors text-sm font-medium"
          >
            Users
          </Link>
          <Link
            href="/admin/questions"
            className="block px-4 py-3 rounded-lg hover:bg-navy-light transition-colors text-sm font-medium"
          >
            Questions
          </Link>
          <Link
            href="/admin/review-answers"
            className="block px-4 py-3 rounded-lg hover:bg-navy-light transition-colors text-sm font-medium"
          >
            Review Answers
          </Link>
          <Link
            href="/dashboard"
            className="block px-4 py-3 rounded-lg hover:bg-navy-light transition-colors text-sm font-medium mt-6 pt-6 border-t border-navy-light"
          >
            Back to Dashboard
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
