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

interface OptionRow {
  id?: string;
  label: string;
  body: string;
  is_correct: boolean;
}

interface EditableQuestion {
  id: string;
  body: string;
  explanation: string | null;
  difficulty: string | null;
  subject_id: string;
  university_id: string;
  topic_id: string | null;
  topic_name: string | null;
  options: OptionRow[];
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
  university_id: string;
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

  // Edit modal
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<EditableQuestion | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editExplanation, setEditExplanation] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("medium");
  const [editTopicId, setEditTopicId] = useState("");
  const [editOptions, setEditOptions] = useState<OptionRow[]>([]);
  const [topicOptions, setTopicOptions] = useState<Topic[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

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

  const openEditModal = async (questionId: string) => {
    setLoadingEditId(questionId);
    try {
      const res = await api.get(`/api/admin/questions/${questionId}`);
      const q = res.data.data;

      setEditingQuestion(q);
      setEditBody(q.body);
      setEditExplanation(q.explanation || "");
      setEditDifficulty(q.difficulty || "medium");
      setEditTopicId(q.topic_id || "");
      setEditOptions(
        (q.options || []).map((o: OptionRow) => ({
          id: o.id,
          label: o.label,
          body: o.body,
          is_correct: o.is_correct,
        }))
      );

      const topicsRes = await api.get(
        `/api/admin/topics?subjectId=${q.subject_id}&universityId=${q.university_id}`
      );
      setTopicOptions(topicsRes.data.data || []);
    } catch (error) {
      console.error("Failed to load question for editing:", error);
      toast.error("Failed to load question");
    } finally {
      setLoadingEditId(null);
    }
  };

  const closeEditModal = () => {
    setEditingQuestion(null);
    setEditOptions([]);
    setTopicOptions([]);
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;

    const correctCount = editOptions.filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      toast.error("Exactly one option must be marked as correct");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await api.patch(`/api/admin/questions/${editingQuestion.id}`, {
        body: editBody,
        explanation: editExplanation || null,
        difficulty: editDifficulty,
        topic_id: editTopicId,
        options: editOptions,
      });

      const updated = res.data.data;
      setFlaggedQuestions((prev) =>
        prev.map((f) =>
          f.question_id === editingQuestion.id
            ? {
                ...f,
                questions: {
                  body: updated.body,
                  topic_name: updated.topic_name,
                  subject_id: updated.subject_id,
                },
              }
            : f
        )
      );
      toast.success("Question updated");
      closeEditModal();
    } catch (error: any) {
      console.error("Failed to update question:", error);
      toast.error(error.response?.data?.message || "Failed to update question");
    } finally {
      setSavingEdit(false);
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
                        <div className="flex flex-col gap-2 items-start">
                          <button
                            onClick={() => openEditModal(flag.question_id)}
                            disabled={loadingEditId === flag.question_id}
                            className="px-3 py-1.5 border border-gray-300 text-navy text-xs font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {loadingEditId === flag.question_id ? "Loading..." : "Edit Question"}
                          </button>
                          <button
                            onClick={() => handleResolve(flag.question_id)}
                            disabled={resolvingId === flag.question_id}
                            className="px-3 py-1.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {resolvingId === flag.question_id ? "Resolving..." : "Mark Resolved"}
                          </button>
                        </div>
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

      {editingQuestion && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-navy mb-6">Edit Flagged Question</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Body
                </label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                  <select
                    value={editTopicId}
                    onChange={(e) => setEditTopicId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="">No topic</option>
                    {topicOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Explanation (optional)
                </label>
                <textarea
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options — select the correct one
                </label>
                <div className="space-y-3">
                  {editOptions.map((opt, idx) => (
                    <div key={opt.id || idx} className="flex gap-3 items-center">
                      <input
                        type="radio"
                        name="edit-correct"
                        checked={opt.is_correct}
                        onChange={() => {
                          setEditOptions((prev) =>
                            prev.map((o, i) => ({ ...o, is_correct: i === idx }))
                          );
                        }}
                        className="cursor-pointer"
                      />
                      <span className="w-6 text-sm font-semibold text-gray-700">
                        {opt.label}.
                      </span>
                      <input
                        type="text"
                        value={opt.body}
                        onChange={(e) => {
                          const updated = [...editOptions];
                          updated[idx] = { ...updated[idx], body: e.target.value };
                          setEditOptions(updated);
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex-1 px-6 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={closeEditModal}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
