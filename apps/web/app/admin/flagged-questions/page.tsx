"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";

interface FlaggedQuestion {
  id: string;
  user_id: string;
  question_id: string;
  session_id: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
  questions: {
    body: string;
    topic_name: string | null;
    subject_id: string;
  } | null;
  flagger: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export default function AdminFlaggedQuestionsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [flaggedQuestions, setFlaggedQuestions] = useState<FlaggedQuestion[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
        return;
      }
      if (profile?.role !== "admin") {
        toast.error("Admin access required");
        router.push("/dashboard");
        return;
      }
    }
  }, [user, profile, loading, router]);

  // Fetch flagged questions
  useEffect(() => {
    const fetchFlaggedQuestions = async () => {
      try {
        setPageLoading(true);
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
        });

        if (selectedUserId) {
          params.append("user_id", selectedUserId);
        }

        const res = await api.get(`/api/admin/flagging/all?${params}`);
        setFlaggedQuestions(res.data.data);
        setTotalCount(res.data.count);
      } catch (error) {
        console.error("Failed to fetch flagged questions:", error);
        toast.error("Failed to fetch flagged questions");
      } finally {
        setPageLoading(false);
      }
    };

    if (profile?.role === "admin") {
      fetchFlaggedQuestions();
    }
  }, [profile, selectedUserId, offset, limit]);

  const handleResolve = async (questionId: string) => {
    setResolvingId(questionId);
    try {
      await api.delete(`/api/admin/flagging/${questionId}`);
      const removed = flaggedQuestions.filter((f) => f.question_id === questionId).length;
      setFlaggedQuestions((prev) => prev.filter((f) => f.question_id !== questionId));
      setTotalCount((prev) => Math.max(0, prev - removed));
      toast.success("Question resolved — it's back in the mock exam pool");
    } catch (error) {
      console.error("Failed to resolve flagged question:", error);
      toast.error("Failed to resolve question");
    } finally {
      setResolvingId(null);
    }
  };

  if (loading || pageLoading) {
    return <PageLoader message="Loading flagged questions..." />;
  }

  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Admin access required</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-navy">Flagged Questions</h1>
          <p className="text-gray-600 mt-2">
            Review questions flagged by students. Flagged questions are automatically excluded from mock exams
            until marked resolved here.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-bold text-navy mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
              <input
                type="text"
                placeholder="Filter by user ID..."
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setOffset(0);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedUserId("");
                  setOffset(0);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-navy font-medium hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Total Flagged Questions</p>
            <p className="text-3xl font-bold text-navy">{totalCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Current Page</p>
            <p className="text-3xl font-bold text-navy">{currentPage}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Items Per Page</p>
            <p className="text-3xl font-bold text-navy">{limit}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {flaggedQuestions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Question</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Flagged By</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Flagged At</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {flaggedQuestions.map((flag) => (
                    <tr key={flag.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 max-w-md">
                        {flag.questions?.topic_name && (
                          <span className="text-xs font-semibold text-forest uppercase tracking-wide">
                            {flag.questions.topic_name}
                          </span>
                        )}
                        <p className="text-sm text-gray-800 mt-1">
                          {flag.questions?.body || "Question no longer exists"}
                        </p>
                        <code className="text-[10px] text-gray-400">{flag.question_id.slice(0, 8)}...</code>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {flag.flagger?.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">{flag.flagger?.email || "—"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{flag.reason || "—"}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(flag.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleResolve(flag.question_id)}
                          disabled={resolvingId === flag.question_id}
                          className="px-3 py-1.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {resolvingId === flag.question_id ? "Resolving..." : "Mark Resolved"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-navy font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-navy font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </>
          ) : (
            <div className="px-6 py-8 text-center text-gray-600">
              <p>No flagged questions found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
