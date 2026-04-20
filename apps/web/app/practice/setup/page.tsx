"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import type { Subject, University } from "types";

export default function PracticeSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useAuth();

  const [universities, setUniversities] = useState<University[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("any");
  const [questionCount, setQuestionCount] = useState(20);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const subjectId = searchParams.get("subjectId");

  // Auth check
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (!subjectId) {
      router.push("/dashboard");
      return;
    }
  }, [loading, user, subjectId, router]);

  // Fetch data on mount
  useEffect(() => {
    if (loading || !user || !subjectId) return;

    const fetchData = async () => {
      try {
        const [unisRes, subjectsRes] = await Promise.allSettled([
          api.get("/api/universities"),
          api.get("/api/subjects"),
        ]);

        if (unisRes.status === "fulfilled") {
          setUniversities(unisRes.value.data.data || []);
          // Pre-fill with profile's target university
          if (profile?.target_university_id) {
            setSelectedUniversityId(profile.target_university_id);
          }
        }

        if (subjectsRes.status === "fulfilled") {
          const subjects = subjectsRes.value.data.data || [];
          const foundSubject = subjects.find(
            (s: Subject) => s.id === subjectId
          );
          if (foundSubject) {
            setSubject(foundSubject);
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
  }, [loading, user, subjectId, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUniversityId || !subjectId) return;

    setSubmitting(true);
    setError("");

    try {
      const payload: any = {
        subject_id: subjectId,
        university_id: selectedUniversityId,
        total_questions: questionCount,
      };

      if (selectedYear !== "any") {
        payload.year = parseInt(selectedYear);
      }

      const res = await api.post("/api/sessions/start", payload);

      if (res.data.status === "success") {
        const {
          session_id,
          questions,
          subject: sessionSubject,
          university,
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
            university,
            total_questions,
          })
        );

        router.push(`/practice/session?sessionId=${session_id}`);
      }
    } catch (err: any) {
      console.error("Failed to start session:", err);
      setError(
        err.response?.data?.message ||
          "Failed to start practice session. Please try again."
      );
      setSubmitting(false);
    }
  };

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const isFreeUser = profile?.subscription_status === "free";
  const years = Array.from({ length: 10 }, (_, i) => 2024 - i);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-navy text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-forest rounded-full" />
            <h1 className="text-xl font-bold">Roman Series</h1>
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-navy mb-2">
            Set Up Your Practice Session
          </h1>
          <p className="text-gray-600 mb-8">
            {subject?.name || "Loading..."} • University of Ibadan
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-ember">{error}</p>
            </div>
          )}

          {isFreeUser && questionCount > 10 && (
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
            {/* University Selection */}
            <div>
              <label className="block text-sm font-semibold text-navy mb-3">
                Select University
              </label>
              <select
                value={selectedUniversityId}
                onChange={(e) => setSelectedUniversityId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest"
              >
                <option value="">-- Choose a university --</option>
                {universities.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selection */}
            <div>
              <label className="block text-sm font-semibold text-navy mb-3">
                Question Year (Optional)
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest"
              >
                <option value="any">Any Year</option>
                {years.map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

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
              </div>
              {isFreeUser && (
                <p className="text-xs text-gray-500 mt-2">
                  Free plan: max 10 questions
                </p>
              )}
            </div>

            {/* Error if university not selected */}
            {!selectedUniversityId && (
              <p className="text-sm text-ember">
                Please select a university to continue
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!selectedUniversityId || submitting}
              className="w-full py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
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
      </main>
    </div>
  );
}
