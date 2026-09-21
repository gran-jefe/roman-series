"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useContentProtection } from "@/hooks/useContentProtection";
import { ContentWatermark } from "@/components/ContentWatermark";
import type { ErrorBankQuestion } from "types";
import toast from "react-hot-toast";
import {
  X,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  BookOpen,
  Calendar,
} from "lucide-react";

// Color mapping for subjects
const SUBJECT_COLORS: Record<string, string> = {
  Biology: "#1A7A4A",
  Government: "#1E3A5F",
  Chemistry: "#8B2252",
  Literature: "#C4522A",
  CRS: "#D97B20",
  IRS: "#B0287A",
  English: "#2166B2",
  Physics: "#7B4F1A",
  Mathematics: "#4F46E5",
  Economics: "#0284C7",
  Commerce: "#0D9488",
  Accounting: "#9333EA",
};

const getSubjectColor = (subjectName: string): string => {
  return SUBJECT_COLORS[subjectName] || "#1A7A4A";
};

export default function ErrorBankPage() {
  useContentProtection();
  const router = useRouter();
  const { user, loading, profile } = useAuth();
  const { checkErrorBankAccess } = useFeatureAccess();
  const [questions, setQuestions] = useState<ErrorBankQuestion[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<ErrorBankQuestion | null>(null);

  const errorBankAccess = checkErrorBankAccess();
  const isLimited = errorBankAccess.currentLimit && errorBankAccess.currentLimit > 0;
  const limitedQuestions = isLimited
    ? questions.slice(0, errorBankAccess.currentLimit)
    : questions;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    const fetchErrorBank = async () => {
      try {
        const res = await api.get("/api/sessions/wrong-questions");
        setQuestions(res.data.data?.questions || []);
      } catch (error) {
        console.error("Failed to fetch error bank:", error);
        toast.error("Failed to load error bank");
      } finally {
        setPageLoading(false);
      }
    };

    if (!loading && user) {
      fetchErrorBank();
    }
  }, [user, loading, router]);

  if (pageLoading) {
    return <PageLoader message="Loading your Error Bank..." />;
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] text-slate-800">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0D1B2A] mb-2">
            Your Error Bank is Empty!
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto mb-8">
            You don&apos;t have any unreviewed mistakes. Keep practicing mock exams and topic drills to discover and master new questions.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-2xl bg-[#0D1B2A] text-white font-bold text-sm hover:bg-[#1A2F45] transition"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/practice/topics"
              className="px-6 py-3 rounded-2xl bg-[#1A7A4A] text-white font-bold text-sm hover:bg-[#15633c] transition"
            >
              Start New Practice →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Check if user has access to error bank
  if (!errorBankAccess.hasAccess) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] text-slate-800">
        <main className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-[#0D1B2A] mb-2">
            Error Bank Locked
          </h1>
          <p className="text-slate-600 text-sm mb-6">
            {errorBankAccess.reason || "Error Bank review is available on Scholar and Elite plans."}
          </p>
          <Link
            href="/pricing"
            className="inline-block px-8 py-3.5 bg-[#C4522A] hover:bg-[#b04520] text-white font-black rounded-2xl text-sm shadow-md transition"
          >
            Upgrade to Scholar or Elite →
          </Link>
        </main>
      </div>
    );
  }

  // Group by subject (using limited questions if applicable)
  const bySubject = new Map<string, ErrorBankQuestion[]>();
  limitedQuestions.forEach((q) => {
    if (!bySubject.has(q.subject_name)) {
      bySubject.set(q.subject_name, []);
    }
    bySubject.get(q.subject_name)!.push(q);
  });

  // Get unique subjects with their color
  const subjects = Array.from(bySubject.entries()).map(([name, qs]) => ({
    name,
    count: qs.length,
    colour: getSubjectColor(name),
  }));

  // Filter questions based on selected subject
  const displayedQuestions = selectedSubject
    ? limitedQuestions.filter((q) => q.subject_name === selectedSubject)
    : limitedQuestions;

  // Filter by subject for display
  const displayBySubject = new Map<string, ErrorBankQuestion[]>();
  displayedQuestions.forEach((q) => {
    if (!displayBySubject.has(q.subject_name)) {
      displayBySubject.set(q.subject_name, []);
    }
    displayBySubject.get(q.subject_name)!.push(q);
  });

  return (
    <div className="min-h-screen bg-[#FAF7F4] text-slate-800">
      <ContentWatermark />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Navigation Breadcrumb */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0D1B2A] transition mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C4522A]/10 text-[#C4522A] text-xs font-black uppercase tracking-wider mb-2">
            <AlertCircle className="w-3.5 h-3.5" /> High-Yield Weakness Diagnostic
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#0D1B2A] tracking-tight">
            Personal Error Bank
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Review and clear your past exam mistakes ({displayedQuestions.length} of {questions.length} questions shown).
          </p>

          {isLimited && (
            <div className="mt-4 p-4 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-start justify-between gap-4">
              <div className="text-xs text-blue-900 leading-relaxed">
                <span className="font-bold">Explorer Tier Limit:</span> Showing your {errorBankAccess.currentLimit} most recent mistakes. Upgrade to{" "}
                <strong>Scholar (₦2,500)</strong> or <strong>Elite (₦3,500)</strong> for unlimited historical error mastery.
              </div>
              <button
                onClick={() => setShowUpgradePrompt(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-blue-700 transition whitespace-nowrap"
              >
                Upgrade Plan
              </button>
            </div>
          )}
        </div>

        {/* Subject Filter Pills */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSubject(null)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              selectedSubject === null
                ? "bg-[#0D1B2A] text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
            }`}
          >
            All Subjects ({questions.length})
          </button>
          {subjects.map((subject) => (
            <button
              key={subject.name}
              onClick={() => setSelectedSubject(subject.name)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                selectedSubject === subject.name
                  ? "text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
              }`}
              style={{
                backgroundColor: selectedSubject === subject.name ? subject.colour : "white",
                color: selectedSubject === subject.name ? "white" : undefined,
              }}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: selectedSubject === subject.name ? "white" : subject.colour }}
              />
              {subject.name} ({subject.count})
            </button>
          ))}
        </div>

        {/* Retake Action Bar */}
        <div className="mb-8 p-4 sm:p-5 bg-gradient-to-r from-[#0D1B2A] to-[#1A3353] rounded-3xl text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-400" />
              Retake {selectedSubject ? selectedSubject : "All"} Missed Questions
            </h2>
            <p className="text-xs text-white/70 mt-0.5">
              Launch a timed drill containing {displayedQuestions.length} question{displayedQuestions.length !== 1 ? "s" : ""} to turn weaknesses into strengths.
            </p>
          </div>
          <button
            onClick={() => {
              router.push(
                `/practice/error-bank?questions=${displayedQuestions.map((q) => q.id).join(",")}`
              );
            }}
            className="px-6 py-3 bg-[#1A7A4A] hover:bg-[#15633c] text-white rounded-2xl font-black text-xs shadow-md transition whitespace-nowrap"
          >
            Start Error Drill →
          </button>
        </div>

        {/* By Subject Sections */}
        {displayBySubject.size === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
            <p className="text-slate-500 text-sm font-medium">
              No questions found for {selectedSubject}.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(displayBySubject.entries()).map(([subjectName, subjectQuestions]) => {
              const themeColor = getSubjectColor(subjectName);

              return (
                <div key={subjectName} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: themeColor }}
                      />
                      <h3 className="text-lg sm:text-xl font-black text-[#0D1B2A]">
                        {subjectName} ({subjectQuestions.length})
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        router.push(
                          `/practice/error-bank?questions=${subjectQuestions.map((q) => q.id).join(",")}`
                        );
                      }}
                      className="text-xs font-bold hover:underline flex items-center gap-1"
                      style={{ color: themeColor }}
                    >
                      Practice only {subjectName} →
                    </button>
                  </div>

                  {/* Question Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {subjectQuestions.map((q) => (
                      <div
                        key={q.id}
                        onClick={() => setSelectedQuestion(q)}
                        className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition cursor-pointer flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${themeColor}15`,
                                color: themeColor,
                              }}
                            >
                              {q.subject_name}
                            </span>
                            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              Missed {q.times_wrong}×
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                            {q.body}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(q.last_seen_at).toLocaleDateString()}
                          </span>
                          <span className="text-[#1A7A4A] font-bold group-hover:underline flex items-center gap-0.5">
                            Inspect Solution <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Question Detail Modal */}
      {selectedQuestion && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setSelectedQuestion(null)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-slate-100">
              {/* Header */}
              <div
                className="px-6 py-4 flex items-center justify-between sticky top-0 z-10 text-white"
                style={{ backgroundColor: getSubjectColor(selectedQuestion.subject_name) }}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="font-extrabold text-sm">{selectedQuestion.subject_name} Diagnostic</span>
                </div>
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="p-1 hover:bg-white/20 rounded-xl transition text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="inline-flex items-center gap-2 mb-3">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    Missed {selectedQuestion.times_wrong} times
                  </span>
                  <span className="text-xs text-slate-400">
                    Last encountered: {new Date(selectedQuestion.last_seen_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-slate-900 text-sm sm:text-base font-medium leading-relaxed mb-6">
                  {selectedQuestion.body}
                </p>

                {/* Options List */}
                <div className="space-y-2.5">
                  {selectedQuestion.options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-[#FAF7F4]"
                    >
                      <span className="font-black text-slate-700 text-xs w-5 h-5 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm flex-shrink-0">
                        {option.label}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-800 leading-normal font-medium">
                        {option.body}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-[#FAF7F4] border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-200 text-slate-800 font-bold rounded-xl text-xs hover:bg-slate-300 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const questionId = selectedQuestion.id;
                    setSelectedQuestion(null);
                    router.push(`/practice/error-bank?questions=${questionId}`);
                  }}
                  className="flex-1 px-4 py-2.5 bg-[#1A7A4A] text-white font-bold rounded-xl text-xs hover:bg-[#15633c] shadow-sm transition"
                >
                  Drill This Question Now
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Upgrade Prompt */}
      {showUpgradePrompt && (
        <UpgradePrompt
          title="Unlock Full Error Bank History"
          message="Explorer free plan displays your 10 most recent errors. Upgrade to Scholar (₦2,500) or Elite (₦3,500) for unlimited error history and AI topic diagnostics."
          feature="Unlimited Error Bank"
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
}

