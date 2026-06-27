"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatCardSkeleton } from "@/components/skeletons";

interface AdminStats {
  total_users: number;
  sessions_today: number;
  total_revenue: number;
  total_questions: number;
  new_users_this_week: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Guard: redirect non-admins to dashboard
  useEffect(() => {
    if (profile && profile.role !== "admin") {
      router.push("/dashboard");
    }
  }, [profile, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/api/admin/stats");
        setStats(res.data.data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (!stats && !loading) {
    return <div className="text-red-600">Failed to load statistics</div>;
  }

  const metricCards = stats ? [
    {
      label: "Total Users",
      value: stats.total_users,
      color: "blue",
    },
    {
      label: "Sessions Today",
      value: stats.sessions_today,
      color: "green",
    },
    {
      label: "Total Revenue",
      value: `₦${stats.total_revenue.toLocaleString()}`,
      color: "emerald",
    },
    {
      label: "Total Questions",
      value: stats.total_questions,
      color: "purple",
    },
    {
      label: "New Users This Week",
      value: stats.new_users_this_week,
      color: "orange",
    },
  ] : [];

  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy mb-8">Admin Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          metricCards.map((card) => (
            <div
              key={card.label}
              className={`border-2 rounded-lg p-6 transition-shadow hover:shadow-md ${colorClasses[card.color as keyof typeof colorClasses]}`}
            >
              <p className="text-xs uppercase tracking-wider font-semibold opacity-75 mb-3">{card.label}</p>
              <p className="text-4xl font-bold">{card.value}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
