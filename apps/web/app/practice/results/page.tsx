"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import type { SessionResult, UserStats } from "types";
import { CardSkeleton } from "@/components/skeletons";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Trophy, BarChart3, Home } from "lucide-react";
import { useContentProtection } from "@/hooks/useContentProtection";

interface SessionMeta {
  subject: { id: string; name: string } | null;
  university: { id: string; name: string; short_code: string } | null;
  total_questions: number;
}

export default function PracticeResultsPage() {
  useContentProtection();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const { profile } = useAuth();

  const [results, setResults] = useState<SessionResult | null>(null);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [pageLoading, setPageLoading] = useState(true);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      router.push("/dashboard");
      return;
    }

    const loadResults = async () => {
      try {
        // Try sessionStorage first
        const resultsRaw = sessionStorage.getItem(`session_results_${sessionId}`);
        const metaRaw = sessionStorage.getItem(`session_meta_${sessionId}`);
        const questionsRaw = sessionStorage.getItem(`session_questions_${sessionId}`);

        if (resultsRaw) {
          const parsedResults = JSON.parse(resultsRaw);

          // If we have stored questions (from mock exam), merge them with results
          if (questionsRaw && !metaRaw) {
            const storedQuestions = JSON.parse(questionsRaw);
            const enhancedResults: SessionResult = {
              score: parsedResults.score,
              total: parsedResults.total_questions || parsedResults.total,
              percentage: parsedResults.percentage || Math.round(
                (parsedResults.score / (parsedResults.total_questions || parsedResults.total)) * 100
              ),
              answers: parsedResults.answers?.map((answer: { question_id: string; question_body: string; selected_option_id: string; is_correct: boolean; correct_option_id: string; explanation: string; options: { id: string; label: string; body: string; is_correct: boolean }[] }, idx: number) => {
                const question = storedQuestions[idx];
                return {
                  question_id: answer.question_id,
                  question_body: question?.body || answer.question_body || "Question not found",
                  selected_option_id: answer.selected_option_id,
                  is_correct: answer.is_correct,
                  correct_option_id: question?.options?.find((o: { id: string; is_correct: boolean }) => o.is_correct)?.id || answer.correct_option_id,
                  explanation: question?.explanation || answer.explanation,
                  options: question?.options || answer.options || [],
                };
              }) || [],
            };
            setResults(enhancedResults);
          } else {
            setResults(parsedResults);
          }

          if (metaRaw) {
            setSessionMeta(JSON.parse(metaRaw));
          }
        } else {
          // Fallback to API
          const res = await api.get(`/api/sessions/${sessionId}`);
          if (res.data.data) {
            const session = res.data.data;
            const reconstructedResults: SessionResult = {
              score: session.score,
              total: session.total_questions,
              percentage: Math.round(
                (session.score / session.total_questions) * 100
              ),
              answers: session.session_answers.map((answer: { question_id: string; selected_option_id: string; is_correct: boolean; question: { body: string; explanation: string; options: { id: string; label: string; body: string; is_correct: boolean }[] } }) => ({
                question_id: answer.question_id,
                question_body: answer.question?.body || "Question not found",
                selected_option_id: answer.selected_option_id,
                is_correct: answer.is_correct,
                correct_option_id: answer.question?.options?.find(
                  (o: { id: string; is_correct: boolean }) => o.is_correct
                )?.id,
                explanation: answer.question?.explanation,
                options: answer.question?.options || [],
              })),
            };
            setResults(reconstructedResults);
          }
        }

        // Fetch user stats for comparison
        const statsRes = await api.get("/api/stats/me");
        if (statsRes.data.data) {
          setUserStats(statsRes.data.data);
        }
      } catch (error) {
        console.error("Failed to load results:", error);
      } finally {
        setPageLoading(false);
      }
    };

    loadResults();
  }, [sessionId, router]);

  // Auto-trigger upgrade prompt for Explorer users after 1.5s
  useEffect(() => {
    if (profile?.subscription_status === "explorer" && results) {
      const timer = setTimeout(() => {
        setShowUpgradePrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [profile?.subscription_status, results]);

  const toggleAnswerExpanded = (questionId: string) => {
    setExpandedAnswers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4]">
        <div className="text-center">
          <p className="text-gray-600 mb-4 font-medium">Results not found</p>
          <Link href="/dashboard" className="text-forest font-bold hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isPassing = results.percentage >= 50;

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Score Hero Card */}
        <div className={`mb-8 rounded-3xl p-8 sm:p-12 text-white shadow-lg relative overflow-hidden ${isPassing ? "bg-gradient-to-br from-forest to-forest/80" : "bg-gradient-to-br from-navy to-navy/80"}`}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl translate-y-1/3 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
            {/* Score Circle */}
            <div className="flex-shrink-0">
              <div className="relative w-36 h-36">
                <div className="absolute inset-0 rounded-full border-4 border-white/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl font-black">{results.percentage}%</div>
                    <div className="text-white/70 text-xs mt-1 font-medium">Score</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Hero Text */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-300" />
                <span className="text-sm font-bold text-white/80 uppercase tracking-widest">Session Complete</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-2">
                {isPassing ? "Great Job!" : "Keep Practicing!"}
              </h1>
              <p className="text-white/70 text-base">
                {results.score} correct out of {results.total} questions
              </p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
            <div className="flex justify-center mb-2">
              <CheckCircle className="w-6 h-6 text-forest" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-forest">{results.score}</div>
            <p className="text-gray-500 text-xs font-medium mt-1">Correct</p>
          </div>
          <div className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
            <div className="flex justify-center mb-2">
              <XCircle className="w-6 h-6 text-ember" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-ember">{results.total - results.score}</div>
            <p className="text-gray-500 text-xs font-medium mt-1">Wrong</p>
          </div>
          <div className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
            <div className="flex justify-center mb-2">
              <BarChart3 className="w-6 h-6 text-navy" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-navy">
              {Math.floor((results.answers.filter(a => a.selected_option_id).length / results.total) * 100)}%
            </div>
            <p className="text-gray-500 text-xs font-medium mt-1">Attempted</p>
          </div>
          <div className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
            <div className="flex justify-center mb-2">
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">{results.total}</div>
            <p className="text-gray-500 text-xs font-medium mt-1">Total Qs</p>
          </div>
        </div>

        {/* How You Compare */}
        <div className="relative mb-8">
          {profile?.subscription_status === "explorer" && showUpgradePrompt && (
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center z-10">
              <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center max-w-sm mx-4">
                <h3 className="text-lg font-black text-navy mb-2">Advanced Analytics Locked</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Get Elite access to unlock full performance insights, detailed score predictions, and how you compare to peers.
                </p>
                <button
                  onClick={() => setShowUpgradePrompt(false)}
                  className="text-sm text-forest font-bold hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          <div className={profile?.subscription_status === "explorer" && showUpgradePrompt ? "blur-sm pointer-events-none" : ""}>
            {sessionMeta && userStats && (
              <div className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-black text-navy mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-forest" />
                  How You Compare
                </h2>
                <div className="grid sm:grid-cols-2 gap-6 mb-6">
                  <div className="text-center p-5 bg-forest/5 rounded-xl border border-forest/20">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Your Score</div>
                    <div className="text-5xl font-black text-forest">{results?.percentage}%</div>
                  </div>
                  <div className="text-center p-5 bg-navy/5 rounded-xl border border-navy/20">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                      {sessionMeta.subject?.name} Average
                    </div>
                    <div className="text-5xl font-black text-navy">
                      {userStats.avg_score_by_subject?.find(s => s.subject_id === sessionMeta.subject?.id)?.avg_percentage ?? "—"}%
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  {results && (
                    <>
                      {(() => {
                        const percentage = results.percentage ?? 0;
                        if (percentage >= 80) return <p className="text-green-700 font-bold text-sm">Excellent! Outstanding performance ({percentage}%).</p>;
                        if (percentage >= 60) return <p className="text-blue-700 font-bold text-sm">Good performance ({percentage}%)! Keep practicing to improve.</p>;
                        if (percentage >= 40) return <p className="text-amber-700 font-bold text-sm">Keep practicing ({percentage}%). You&apos;re getting closer to your target.</p>;
                        return <p className="text-red-700 font-bold text-sm">Focus on practicing more to improve your score.</p>;
                      })()}
                      {userStats.avg_score_by_subject && (() => {
                        const subjectAvg = userStats.avg_score_by_subject.find(s => s.subject_id === sessionMeta.subject?.id)?.avg_percentage ?? 0;
                        const diff = (results.percentage ?? 0) - subjectAvg;
                        if (subjectAvg > 0) {
                          if (diff > 0) return <p className="text-sm text-gray-500 font-medium">You are {diff.toFixed(0)}% above the subject average ({subjectAvg.toFixed(0)}%)</p>;
                          if (diff < 0) return <p className="text-sm text-gray-500 font-medium">You are {Math.abs(diff).toFixed(0)}% below the subject average ({subjectAvg.toFixed(0)}%)</p>;
                          return <p className="text-sm text-gray-500 font-medium">You are on par with the subject average ({subjectAvg.toFixed(0)}%)</p>;
                        }
                        return null;
                      })()}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Answer Review */}
        <div className="relative mb-8">
          {profile?.subscription_status === "explorer" && showUpgradePrompt && (
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center z-10">
              <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center max-w-sm mx-4">
                <h3 className="text-lg font-black text-navy mb-2">Full Answer Review Locked</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Get Elite access to unlock complete answer reviews, detailed explanations, and performance analytics.
                </p>
                <button
                  onClick={() => setShowUpgradePrompt(false)}
                  className="text-sm text-forest font-bold hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          <div className={profile?.subscription_status === "explorer" && showUpgradePrompt ? "blur-sm pointer-events-none" : ""}>
            <h2 className="text-xl sm:text-2xl font-black text-navy mb-5">Answer Review</h2>
            <div className="space-y-3">
              {results.answers.map((answer, idx) => {
                const isExpanded = expandedAnswers.has(answer.question_id);
                const selectedOption = answer.options.find(o => o.id === answer.selected_option_id);
                const correctOption = answer.options.find(o => o.id === answer.correct_option_id);

                return (
                  <div
                    key={answer.question_id}
                    className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <button
                      onClick={() => toggleAnswerExpanded(answer.question_id)}
                      className="w-full text-left p-5 sm:p-6 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-0.5">
                          {answer.is_correct
                            ? <CheckCircle className="w-6 h-6 text-forest" />
                            : <XCircle className="w-6 h-6 text-ember" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                            Question {idx + 1}
                          </div>
                          <p className={`text-navy font-medium text-sm sm:text-base ${isExpanded ? "" : "line-clamp-2"}`}>
                            {answer.question_body}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-gray-400 ml-2">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 p-5 sm:p-6 bg-gray-50/50 space-y-4">
                        {/* Your Answer */}
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Your Answer</p>
                          {answer.selected_option_id ? (
                            <div className={`p-3.5 rounded-xl text-sm font-medium ${answer.is_correct ? "bg-green-50 text-forest border border-green-200" : "bg-red-50 text-ember border border-red-200"}`}>
                              {selectedOption?.label}. {selectedOption?.body}
                            </div>
                          ) : (
                            <div className="p-3.5 rounded-xl text-sm font-medium bg-gray-200 text-gray-600">
                              Not answered
                            </div>
                          )}
                        </div>

                        {/* Correct Answer */}
                        {!answer.is_correct && (
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Correct Answer</p>
                            <div className="p-3.5 rounded-xl text-sm font-medium bg-green-50 text-forest border border-green-200">
                              {correctOption?.label}. {correctOption?.body}
                            </div>
                          </div>
                        )}

                        {/* Explanation */}
                        {answer.explanation && (
                          <div className="bg-blue-50/60 border-l-4 border-blue-400 p-4 rounded-lg">
                            <p className="text-xs font-bold text-blue-900 mb-1.5 uppercase tracking-widest">Explanation</p>
                            <p className="text-sm text-blue-800 leading-relaxed">{answer.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center pt-4 pb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-8 py-3.5 bg-forest text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </main>

      {/* Upgrade Prompt for Explorer Users */}
      {showUpgradePrompt && profile?.subscription_status === "explorer" && (
        <UpgradePrompt
          title="Your full results are ready"
          message="Your predicted UI aggregate is ready. Upgrade to unlock full analytics, performance trends, and your admission probability."
          feature="Full Results Analytics"
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
}
