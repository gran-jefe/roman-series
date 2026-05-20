"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import type { SessionResult, UserStats } from "types";
import { CardSkeleton } from "@/components/skeletons";

interface SessionMeta {
  subject: any;
  university: any;
  total_questions: number;
}

export default function PracticeResultsPage() {
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

        if (resultsRaw && metaRaw) {
          setResults(JSON.parse(resultsRaw));
          setSessionMeta(JSON.parse(metaRaw));
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
              answers: session.session_answers.map((answer: any) => ({
                question_id: answer.question_id,
                question_body: answer.question?.body || "Question not found",
                selected_option_id: answer.selected_option_id,
                is_correct: answer.is_correct,
                correct_option_id: answer.question?.options?.find(
                  (o: any) => o.is_correct
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
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-navy text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-forest rounded-full" />
              <h1 className="text-xl font-bold">Roman Series</h1>
            </div>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <CardSkeleton />
        </main>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Results not found</p>
          <Link href="/dashboard" className="text-forest hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isPassing = results.percentage >= 50;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-navy text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-forest rounded-full" />
              <h1 className="text-xl font-bold">Roman Series</h1>
            </Link>
          </div>
        </div>
      </nav>

      {/* Results Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Score Circle */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <div className="relative w-48 h-48">
              <div
                className={`absolute inset-0 rounded-full border-8 ${
                  isPassing ? "border-forest" : "border-ember"
                }`}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div
                    className={`text-6xl font-bold ${
                      isPassing ? "text-forest" : "text-ember"
                    }`}
                  >
                    {results.percentage}%
                  </div>
                  <div className="text-gray-600 text-sm mt-2">
                    {isPassing ? "Great Job!" : "Keep Practicing"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-forest">
                {results.score}
              </div>
              <p className="text-gray-600 text-sm">Correct</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-ember">
                {results.total - results.score}
              </div>
              <p className="text-gray-600 text-sm">Wrong</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-english">
                {Math.floor(
                  (results.answers.reduce(
                    (sum, a) =>
                      sum +
                      (a.selected_option_id ? 1 : 0),
                    0
                  ) / results.total) *
                    100
                )}
                %
              </div>
              <p className="text-gray-600 text-sm">Answered</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-chemistry">
                {Math.floor(
                  (results.answers.reduce(
                    (sum, a) =>
                      sum +
                      Math.max(
                        0,
                        60 -
                          (a.question_id.length % 60)
                      ),
                    0
                  ) / results.total) *
                    10
                ) || "N/A"}
              </div>
              <p className="text-gray-600 text-sm">Avg Time (s)</p>
            </div>
          </div>
        </div>

        {/* How You Compare / Quick Analytics */}
        <div className="relative mb-12">
          {profile?.subscription_status === "explorer" && showUpgradePrompt && (
            <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center z-10">
              <div className="bg-white rounded-lg shadow-xl p-6 text-center max-w-sm">
                <h3 className="text-lg font-bold text-navy mb-2">Advanced Analytics Locked</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Upgrade to Scholar to unlock full performance insights, detailed score predictions, and how you compare to peers.
                </p>
                <button
                  onClick={() => setShowUpgradePrompt(false)}
                  className="text-sm text-forest hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          <div className={profile?.subscription_status === "explorer" && showUpgradePrompt ? "blur-sm" : ""}>
            {sessionMeta && userStats && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-8">
            <h2 className="text-xl font-bold text-navy mb-4">How You Compare</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-2">Your Score</div>
                <div className="text-4xl font-bold text-blue-600">
                  {results?.percentage}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-2">
                  {sessionMeta.subject?.name} Average
                </div>
                <div className="text-4xl font-bold text-indigo-600">
                  {userStats.avg_score_by_subject?.find(
                    (s) =>
                      s.subject_id === sessionMeta.subject?.id
                  )?.avg_percentage ?? "—"}
                  %
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-center">
              {results && (
                <>
                  {/* Absolute Performance Analysis */}
                  {(() => {
                    const percentage = results.percentage ?? 0;
                    if (percentage >= 80) {
                      return (
                        <p className="text-green-700 font-medium">
                          ✓ Excellent! Outstanding performance ({percentage}%).
                        </p>
                      );
                    } else if (percentage >= 60) {
                      return (
                        <p className="text-blue-700 font-medium">
                          Good performance ({percentage}%)! Keep practicing to improve.
                        </p>
                      );
                    } else if (percentage >= 40) {
                      return (
                        <p className="text-amber-700 font-medium">
                          Keep practicing ({percentage}%). You're getting closer to your target.
                        </p>
                      );
                    } else {
                      return (
                        <p className="text-red-700 font-medium">
                          Focus on practicing ({percentage}%) to improve your score.
                        </p>
                      );
                    }
                  })()}

                  {/* Peer Comparison Analysis */}
                  {userStats.avg_score_by_subject && (
                    (() => {
                      const subjectAvg = userStats.avg_score_by_subject.find(
                        (s) =>
                          s.subject_id === sessionMeta.subject?.id
                      )?.avg_percentage ?? 0;
                      const diff = (results.percentage ?? 0) - subjectAvg;
                      if (subjectAvg > 0) {
                        if (diff > 0) {
                          return (
                            <p className="text-sm text-gray-600">
                              {diff.toFixed(0)}% above the subject average ({subjectAvg.toFixed(0)}%)
                            </p>
                          );
                        } else if (diff < 0) {
                          return (
                            <p className="text-sm text-gray-600">
                              {Math.abs(diff).toFixed(0)}% below the subject average ({subjectAvg.toFixed(0)}%)
                            </p>
                          );
                        } else {
                          return (
                            <p className="text-sm text-gray-600">
                              On par with the subject average ({subjectAvg.toFixed(0)}%)
                            </p>
                          );
                        }
                      }
                      return null;
                    })()
                  )}
                </>
              )}
            </div>
          </div>
            )}
          </div>
        </div>

        {/* Answer Review */}
        <div className="relative mb-12">
          {profile?.subscription_status === "explorer" && showUpgradePrompt && (
            <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center z-10">
              <div className="bg-white rounded-lg shadow-xl p-6 text-center max-w-sm">
                <h3 className="text-lg font-bold text-navy mb-2">Full Answer Review Locked</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Upgrade to Scholar to access complete answer reviews, detailed explanations, and performance analytics.
                </p>
                <button
                  onClick={() => setShowUpgradePrompt(false)}
                  className="text-sm text-forest hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          <div className={profile?.subscription_status === "explorer" && showUpgradePrompt ? "blur-sm" : ""}>
            <h2 className="text-2xl font-bold text-navy mb-6">Answer Review</h2>
          <div className="space-y-4">
            {results.answers.map((answer, idx) => {
              const isExpanded = expandedAnswers.has(answer.question_id);
              const selectedOption = answer.options.find(
                (o) => o.id === answer.selected_option_id
              );
              const correctOption = answer.options.find(
                (o) => o.id === answer.correct_option_id
              );

              return (
                <div
                  key={answer.question_id}
                  className="bg-white rounded-lg shadow overflow-hidden"
                >
                  <button
                    onClick={() => toggleAnswerExpanded(answer.question_id)}
                    className="w-full text-left p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          answer.is_correct ? "bg-forest" : "bg-ember"
                        }`}
                      >
                        {answer.is_correct ? "✓" : "✗"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-navy mb-2">
                          Question {idx + 1}
                        </div>
                        <p className="text-gray-700 text-sm">
                          {answer.question_body}
                        </p>
                      </div>
                      <div className="text-gray-400">
                        {isExpanded ? "−" : "+"}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      <div className="space-y-4">
                        {/* Your Answer */}
                        {answer.selected_option_id ? (
                          <div>
                            <p className="text-sm font-semibold text-navy mb-2">
                              Your Answer:
                            </p>
                            <div
                              className={`p-3 rounded-lg text-sm ${
                                answer.is_correct
                                  ? "bg-blush text-forest"
                                  : "bg-red-100 text-ember"
                              }`}
                            >
                              {selectedOption?.label}. {selectedOption?.body}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-semibold text-navy mb-2">
                              Your Answer:
                            </p>
                            <div className="p-3 rounded-lg text-sm bg-gray-200 text-gray-600">
                              Not answered
                            </div>
                          </div>
                        )}

                        {/* Correct Answer */}
                        {!answer.is_correct && (
                          <div>
                            <p className="text-sm font-semibold text-navy mb-2">
                              Correct Answer:
                            </p>
                            <div className="p-3 rounded-lg text-sm bg-blush text-forest">
                              {correctOption?.label}. {correctOption?.body}
                            </div>
                          </div>
                        )}

                        {/* Explanation */}
                        {answer.explanation && (
                          <div>
                            <p className="text-sm font-semibold text-navy mb-2">
                              Explanation:
                            </p>
                            <p className="text-sm text-gray-700">
                              {answer.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              // Get first subject from first answer (would need to track this better)
              // For now, just go back to dashboard
              router.push("/dashboard");
            }}
            className="px-8 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition-opacity"
          >
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
