"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import type { Subject, University, Topic } from "types";
import { CardSkeleton } from "@/components/skeletons";

const subjectColours: Record<string, string> = {
  Biology: "#1A7A4A",
  Chemistry: "#8B2252",
  Physics: "#7B4F1A",
  Government: "#1E3A5F",
  Literature: "#C4522A",
  CRS: "#D97B20",
  IRS: "#B0287A",
};

export default function PracticeSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useAuth();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [university, setUniversity] = useState<University | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [questionCount, setQuestionCount] = useState<number | "all">(10);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const subjectId = searchParams.get("subjectId");
  const universityId = searchParams.get("universityId");
  const topicId = searchParams.get("topicId");

  // Auth check
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (!subjectId || !universityId) {
      router.push("/dashboard");
      return;
    }
  }, [loading, user, subjectId, universityId, router]);

  // Fetch data on mount
  useEffect(() => {
    if (loading || !user || !subjectId || !universityId) return;

    const fetchData = async () => {
      try {
        const [subjectsRes, unisRes] = await Promise.allSettled([
          api.get("/api/subjects"),
          api.get("/api/universities"),
        ]);

        if (subjectsRes.status === "fulfilled") {
          const subjects = subjectsRes.value.data.data || [];
          const foundSubject = subjects.find((s: Subject) => s.id === subjectId);
          if (foundSubject) {
            setSubject(foundSubject);
          }
        }

        if (unisRes.status === "fulfilled") {
          const universities = unisRes.value.data.data || [];
          const foundUni = universities.find((u: University) => u.id === universityId);
          if (foundUni) {
            setUniversity(foundUni);
          }
        }

        // Fetch topic if provided
        if (topicId) {
          const topicRes = await api.get(`/api/topics/${topicId}`);
          if (topicRes.data.status === "success") {
            setTopic(topicRes.data.data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch setup data:", err);
        setError("Failed to load setup data. Please try again.");
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
  }, [loading, user, subjectId, universityId, topicId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !universityId) return;

    setSubmitting(true);
    setError("");

    try {
      const payload: Record<string, string | number> = {
        subject_id: subjectId || "",
        university_id: universityId || "",
        total_questions: questionCount === "all" ? 0 : questionCount,
      };

      if (topicId) {
        payload.topic_id = topicId;
      }

      const res = await api.post("/api/sessions/start", payload);

      if (res.data.status === "success") {
        const {
          session_id,
          questions,
          subject: sessionSubject,
          university: sessionUni,
          topic: sessionTopic,
          total_questions,
        } = res.data.data;

        // Store in sessionStorage for session page
        sessionStorage.setItem(
          `session_questions_${session_id}`,
          JSON.stringify(questions)
        );
        sessionStorage.setItem(
          `session_meta_${session_id}`,
          JSON.stringify({
            subject: sessionSubject,
            university: sessionUni,
            topic: sessionTopic || null,
            total_questions,
          })
        );

        router.push(`/practice/session?sessionId=${session_id}`);
      }
    } catch (err: unknown) {
      console.error("Failed to start session:", err);
      const errorObj = err as { response?: { data?: { message?: string } } };
      const errorMessage = errorObj?.response?.data?.message ||
        "Failed to start practice session. Please try again.";
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  const isFreeUser = profile?.subscription_status === "explorer";
  const subjectColour = subject ? subjectColours[subject.name] || "#7B68EE" : "#7B68EE";

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="max-w-2xl mx-auto px-4 py-8">
        {loading || pageLoading ? (
          <CardSkeleton />
        ) : (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-navy mb-2">
            Set Up Your Practice Session
          </h1>
          <p className="text-gray-600 mb-8">
            {subject?.name} • {university?.short_code}
            {topic && ` • ${topic.name}`}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-ember">{error}</p>
            </div>
          )}

          {isFreeUser && questionCount !== "all" && questionCount > 10 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-medium mb-2">
                Free Plan Limit
              </p>
              <p className="text-sm text-amber-700">
                Your free plan allows up to 10 questions per session. Upgrade to
                access more.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subject Display */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: `${subjectColour}20` }}>
              <p className="text-sm text-gray-600">Subject</p>
              <p className="text-lg font-semibold text-navy">{subject?.name}</p>
            </div>

            {/* University Display */}
            <div>
              <p className="text-sm text-gray-600">University</p>
              <p className="text-lg font-semibold text-navy">{university?.name}</p>
            </div>

            {/* Topic Display (if applicable) */}
            {topic && (
              <div>
                <p className="text-sm text-gray-600">Topic</p>
                <p className="text-lg font-semibold text-navy">{topic.name}</p>
              </div>
            )}

            {/* Question Count */}
            <div>
              <label className="block text-sm font-semibold text-navy mb-3">
                Number of Questions
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[10, 20, 30, 40, 50].map((count) => {
                  const isDisabled = isFreeUser && count > 10;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setQuestionCount(count)}
                      disabled={isDisabled}
                      className={`py-3 rounded-lg font-medium transition-colors ${
                        questionCount === count
                          ? "bg-forest text-white"
                          : isDisabled
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                            : "bg-gray-100 text-navy hover:bg-gray-200"
                      }`}
                    >
                      {count}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setQuestionCount("all")}
                  disabled={isFreeUser}
                  className={`py-3 rounded-lg font-medium transition-colors ${
                    questionCount === "all"
                      ? "bg-forest text-white"
                      : isFreeUser
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                        : "bg-gray-100 text-navy hover:bg-gray-200"
                  }`}
                  title={isFreeUser ? "Not available for free users" : "Practice all questions"}
                >
                  All
                </button>
              </div>
              {isFreeUser && (
                <p className="text-xs text-gray-500 mt-2">
                  Free plan: max 10 questions
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ backgroundColor: subjectColour }}
            >
              {submitting ? "Starting Session..." : "Start Practice Session"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Time per question:</strong> 1 minute • Flagged questions
              for review • Detailed answer explanations
            </p>
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
