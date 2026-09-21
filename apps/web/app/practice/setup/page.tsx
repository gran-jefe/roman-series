"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import type { Subject, University, Topic } from "types";
import { CardSkeleton } from "@/components/skeletons";
import Link from "next/link";
import {
  ChevronLeft,
  Clock,
  BookOpen,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

const subjectColours: Record<string, string> = {
  Biology: "#1A7A4A",
  Chemistry: "#8B2252",
  Physics: "#7B4F1A",
  Government: "#1E3A5F",
  Literature: "#C4522A",
  CRS: "#D97B20",
  IRS: "#B0287A",
  English: "#2166B2",
  Mathematics: "#4F46E5",
  Economics: "#0284C7",
  Commerce: "#0D9488",
  Accounting: "#9333EA",
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
      const errorMessage =
        errorObj?.response?.data?.message ||
        "Failed to start practice session. Please try again.";
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  const isFreeUser = profile?.subscription_status === "explorer";
  const subjectColour = subject ? subjectColours[subject.name] || "#1A7A4A" : "#1A7A4A";

  const getEstimatedDuration = (count: number | "all") => {
    if (count === "all") return "~45–60 mins";
    return `~${count} mins`;
  };

  return (
    <div className="min-h-screen bg-[#FAF7F4] text-slate-800">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Navigation Breadcrumb */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0D1B2A] transition mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {loading || pageLoading ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200">
            <CardSkeleton />
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-10 relative overflow-hidden">
            {/* Top decorative accent */}
            <div
              className="absolute top-0 left-0 right-0 h-2"
              style={{ backgroundColor: subjectColour }}
            />

            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-[#1A7A4A]" />
                {university?.name || "Target University"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0D1B2A] tracking-tight">
                Practice Session Setup
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Customize your practice drill to target your weak spots and build exam timing.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-rose-800 font-medium">{error}</p>
              </div>
            )}

            {isFreeUser && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Explorer Free Plan
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Free accounts can practice up to 10 questions per drill. Upgrade to <strong>Scholar (₦2,500)</strong> or <strong>Elite (₦3,500)</strong> for unlimited questions.
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="px-3 py-1.5 bg-[#C4522A] hover:bg-[#b04520] text-white text-xs font-bold rounded-xl whitespace-nowrap shadow-sm transition"
                >
                  Upgrade
                </Link>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Subject & Topic Banner */}
              <div
                className="p-4 sm:p-5 rounded-2xl border"
                style={{
                  backgroundColor: `${subjectColour}10`,
                  borderColor: `${subjectColour}30`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Selected Subject
                    </span>
                    <h2
                      className="text-lg sm:text-xl font-black mt-0.5"
                      style={{ color: subjectColour }}
                    >
                      {subject?.name}
                    </h2>
                    {topic && (
                      <p className="text-xs font-semibold text-slate-600 mt-1 flex items-center gap-1">
                        Topic: <span className="text-[#0D1B2A]">{topic.name}</span>
                      </p>
                    )}
                  </div>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-sm"
                    style={{ backgroundColor: subjectColour }}
                  >
                    {subject?.name?.slice(0, 2).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Number of Questions Selector Tiles */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Number of Questions
                  </label>
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Est. Duration: {getEstimatedDuration(questionCount)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {[10, 20, 30, 40, 50].map((count) => {
                    const isDisabled = isFreeUser && count > 10;
                    const isSelected = questionCount === count;

                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setQuestionCount(count)}
                        disabled={isDisabled}
                        className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-center relative ${
                          isSelected
                            ? "bg-[#0D1B2A] border-[#0D1B2A] text-white shadow-md"
                            : isDisabled
                            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                            : "bg-[#FAF7F4] border-slate-200 text-slate-800 hover:border-slate-400 hover:bg-white"
                        }`}
                      >
                        <span className="text-lg sm:text-xl font-black">{count}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                          Questions
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 absolute top-2 right-2" />
                        )}
                      </button>
                    );
                  })}

                  {/* All Questions */}
                  <button
                    type="button"
                    onClick={() => setQuestionCount("all")}
                    disabled={isFreeUser}
                    className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-center relative ${
                      questionCount === "all"
                        ? "bg-[#0D1B2A] border-[#0D1B2A] text-white shadow-md"
                        : isFreeUser
                        ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                        : "bg-[#FAF7F4] border-slate-200 text-slate-800 hover:border-slate-400 hover:bg-white"
                    }`}
                    title={isFreeUser ? "Available on Scholar & Elite plans" : "Practice all questions"}
                  >
                    <span className="text-lg sm:text-xl font-black">All</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                      Full Pool
                    </span>
                    {questionCount === "all" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 absolute top-2 right-2" />
                    )}
                  </button>
                </div>
              </div>

              {/* Session Expectations / Tips */}
              <div className="p-4 rounded-2xl bg-[#FAF7F4] border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Sparkles className="w-4 h-4 text-[#1A7A4A]" />
                  What to expect in this drill:
                </div>
                <ul className="text-xs text-slate-600 space-y-1 pl-6 list-disc">
                  <li>Timed at <strong>1 minute per question</strong> to build competitive exam speed.</li>
                  <li>Flag tricky questions to review before final submission.</li>
                  <li>Detailed step-by-step explanations and key takeaways for every question.</li>
                </ul>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 text-white rounded-2xl font-black text-sm tracking-wide shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:-translate-y-0.5"
                style={{ backgroundColor: subjectColour }}
              >
                {submitting ? "Preparing Your Questions..." : "Launch Practice Drill →"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

