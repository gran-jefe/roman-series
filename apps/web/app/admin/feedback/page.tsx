"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { FeedbackCharts, type FeedbackStats } from "./FeedbackCharts";

interface Feedback {
  id: string;
  rating: number;
  category: string;
  message: string | null;
  emoji_mood: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

interface FeedbackResponse {
  feedback: Feedback[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const CATEGORY_EMOJIS: Record<string, string> = {
  questions: "📚",
  ui: "🎨",
  performance: "⚡",
  features: "✨",
  other: "🐛",
  general: "💭",
};

const MOOD_EMOJIS: Record<string, string> = {
  love: "😍",
  like: "😊",
  okay: "😐",
  better: "😕",
  frustrated: "😤",
};

export default function AdminFeedbackPage() {
  const router = useRouter();
  const { profile, loading } = useAuth();
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | "">("");
  const [selectedRating, setSelectedRating] = useState<number | "">("");
  const [stats, setStats] = useState<FeedbackStats | null>(null);

  // Check admin access
  useEffect(() => {
    if (!loading && profile?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
  }, [loading, profile, router]);

  // Fetch feedback
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
        });

        const res = await api.get(`/api/feedback?${params}`);
        if (res.data.status === "success") {
          setFeedbackList(res.data.data.feedback);
          setPagination(res.data.data.pagination);
        }
      } catch (error) {
        console.error("Failed to fetch feedback:", error);
        toast.error("Failed to load feedback");
      } finally {
        setIsLoading(false);
      }
    };

    if (!loading && profile?.role === "admin") {
      fetchFeedback();
    }
  }, [loading, profile?.role, pagination.page, pagination.limit]);

  // Fetch aggregate stats for the graphical report (independent of the
  // paginated table above, so charts always reflect the full data set).
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/api/feedback/stats");
        if (res.data.status === "success") {
          setStats(res.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch feedback stats:", error);
      }
    };

    if (!loading && profile?.role === "admin") {
      fetchStats();
    }
  }, [loading, profile?.role]);

  const filteredFeedback = feedbackList.filter((f) => {
    if (selectedCategory && f.category !== selectedCategory) return false;
    if (selectedRating && f.rating !== selectedRating) return false;
    return true;
  });

  const handleExportCSV = () => {
    const csv = [
      ["Date", "User", "Email", "Mood", "Rating", "Category", "Message"],
      ...filteredFeedback.map((f) => [
        new Date(f.created_at).toLocaleDateString(),
        f.profiles?.full_name || "Unknown",
        f.profiles?.email || "N/A",
        MOOD_EMOJIS[f.emoji_mood || ""] || f.emoji_mood || "",
        f.rating,
        f.category,
        f.message || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Feedback exported!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-forest text-sm font-medium hover:underline mb-2 inline-block">
              ← Admin Panel
            </Link>
            <h1 className="text-3xl font-bold text-navy">User Feedback</h1>
            <p className="text-gray-600 mt-1">
              Total: {pagination.total} responses
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Graphical Report */}
      {stats && <FeedbackCharts stats={stats} />}

      {/* Filters */}
      <div className="bg-white border-b shadow-sm p-4 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest"
            >
              <option value="">All Categories</option>
              <option value="questions">📚 Questions Quality</option>
              <option value="ui">🎨 App Design</option>
              <option value="performance">⚡ Performance</option>
              <option value="features">✨ Features</option>
              <option value="other">🐛 Found a Bug</option>
              <option value="general">💭 General</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Rating
            </label>
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value ? parseInt(e.target.value) : "")}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest"
            >
              <option value="">All Ratings</option>
              <option value="1">1 ⭐ Needs work</option>
              <option value="2">2 ⭐ Not great</option>
              <option value="3">3 ⭐ Okay</option>
              <option value="4">4 ⭐ Good</option>
              <option value="5">5 ⭐ Excellent!</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Items per page
            </label>
            <select
              value={pagination.limit}
              onChange={(e) => {
                setPagination({ ...pagination, limit: parseInt(e.target.value), page: 1 });
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-12 text-gray-600">Loading feedback...</div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-12 text-gray-600">No feedback found</div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      User
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      Mood
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredFeedback.map((feedback) => (
                    <tr key={feedback.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(feedback.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {feedback.profiles?.full_name || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {feedback.profiles?.email || "N/A"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-2xl">
                        {MOOD_EMOJIS[feedback.emoji_mood || ""] || feedback.emoji_mood || "—"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={i < feedback.rating ? "text-yellow-400" : "text-gray-300"}>
                              ⭐
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center gap-1">
                          {CATEGORY_EMOJIS[feedback.category] || ""}
                          <span className="capitalize">{feedback.category}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {feedback.message || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} responses
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  ← Previous
                </button>

                {[...Array(pagination.pages)].map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 ||
                    page === pagination.pages ||
                    (page >= pagination.page - 1 && page <= pagination.page + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setPagination({ ...pagination, page })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                          page === pagination.page
                            ? "bg-forest text-white"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === 2 || page === pagination.pages - 1) {
                    return (
                      <span key={page} className="px-2 py-2 text-gray-500">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <button
                  onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
