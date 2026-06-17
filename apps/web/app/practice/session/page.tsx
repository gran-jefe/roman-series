"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/api";
import { useContentProtection } from "@/hooks/useContentProtection";
import type { StudentQuestion } from "types";
import { QuestionSkeleton } from "@/components/skeletons";

export default function PracticeSessionPage() {
  useContentProtection();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  // State
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string | null>>(new Map());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Refs for timer callback
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Per-question timing tracking
  const questionStartTime = useRef<number>(Date.now());
  const questionTimes = useRef<Map<string, number>>(new Map());

  // Track when question changes
  useEffect(() => {
    if (questions.length === 0 || !questions[currentIndex]) return;

    // Save time for previous question
    if (questionTimes.current.size > 0 || currentIndex > 0) {
      const elapsed = Math.round((Date.now() - questionStartTime.current) / 1000);
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        questionTimes.current.set(questions[prevIndex].id, elapsed);
      }
    }

    // Reset for current question
    questionStartTime.current = Date.now();
  }, [currentIndex, questions]);

  // Load session data from sessionStorage
  useEffect(() => {
    if (!sessionId) {
      router.push("/dashboard?error=invalid_session");
      return;
    }

    const questionsRaw = sessionStorage.getItem(`session_questions_${sessionId}`);
    const metaRaw = sessionStorage.getItem(`session_meta_${sessionId}`);

    if (!questionsRaw || !metaRaw) {
      router.push("/dashboard?error=session_expired");
      return;
    }

    try {
      const questionsData = JSON.parse(questionsRaw);

      setQuestions(questionsData);

      const calcTotalTime = questionsData.length * 60; // 1 minute per question
      setTotalTime(calcTotalTime);
      setTimeLeft(calcTotalTime);
      setPageLoading(false);
    } catch (error) {
      console.error("Failed to parse session data:", error);
      router.push("/dashboard?error=session_expired");
    }
  }, [sessionId, router]);

  // Load flagged questions on mount
  useEffect(() => {
    const loadFlaggedQuestions = async () => {
      try {
        const res = await api.get("/api/flagging/flags");
        const ids: string[] = (res.data.data || []).map((f: { question_id: string }) => f.question_id);
        setFlagged(new Set(ids));
      } catch (error) {
        console.error("Failed to load flagged questions:", error);
      }
    };

    loadFlaggedQuestions();
  }, []);

  // Timer effect
  useEffect(() => {
    if (!sessionId || questions.length === 0 || timeLeft === 0) return;

    if (timeLeft <= 0) {
      // Auto-submit when time runs out
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionId, questions.length]);

  // Auto-submit handler
  const handleAutoSubmit = useCallback(async () => {
    if (!sessionId) return;
    await submitSession();
  }, [sessionId]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentIndex];

  // Question option selection
  const handleSelectOption = (optionId: string) => {
    setAnswers((prev) => new Map(prev).set(currentQuestion.id, optionId));
  };

  // Toggle flag with API persistence
  const handleToggleFlag = async () => {
    try {
      const isFlagged = flagged.has(currentQuestion.id);

      if (isFlagged) {
        // Unflag
        await api.delete(`/api/flagging/flag/${currentQuestion.id}`);
        setFlagged((prev) => {
          const newSet = new Set(prev);
          newSet.delete(currentQuestion.id);
          return newSet;
        });
      } else {
        // Flag
        await api.post("/api/flagging/flag", {
          question_id: currentQuestion.id,
          reason: "Flagged during practice session",
        });
        setFlagged((prev) => new Set(prev).add(currentQuestion.id));
      }
    } catch (error) {
      console.error("Failed to toggle flag:", error);
    }
  };

  // Navigation
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Go to question from palette
  const handleGoToQuestion = (index: number) => {
    setCurrentIndex(index);
  };

  // Submit session
  const submitSession = async () => {
    if (!sessionId) return;

    setSubmitting(true);
    try {
      // Capture time for the current question before submitting
      const elapsed = Math.round((Date.now() - questionStartTime.current) / 1000);
      if (currentIndex >= 0 && currentIndex < questions.length) {
        questionTimes.current.set(questions[currentIndex].id, elapsed);
      }

      const answersPayload = questions.map((q) => ({
        question_id: q.id,
        selected_option_id: answers.get(q.id) ?? null,
        time_spent_seconds: questionTimes.current.get(q.id) ?? null,
      }));

      const timeTaken = totalTime - timeLeft;

      const res = await api.post(`/api/sessions/${sessionId}/submit`, {
        answers: answersPayload,
        time_taken_seconds: Math.max(timeTaken, 0),
      });

      // Store results in sessionStorage
      sessionStorage.setItem(
        `session_results_${sessionId}`,
        JSON.stringify(res.data.data)
      );

      // Navigate to results
      router.push(`/practice/results?sessionId=${sessionId}`);
    } catch (error) {
      console.error("Failed to submit session:", error);
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setShowSubmitDialog(false);
    await submitSession();
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <main className="flex-1 pb-32 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">
            <QuestionSkeleton />
          </div>
        </main>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">No questions found</div>
      </div>
    );
  }

  const isTimeRunningOut = timeLeft <= 300; // 5 minutes
  const isAnswered = answers.has(currentQuestion.id) && answers.get(currentQuestion.id) !== null;
  const isFlagged = flagged.has(currentQuestion.id);

  // Count stats for submit dialog
  const answeredCount = Array.from(answers.values()).filter((v) => v !== null).length;
  const unansweredCount = questions.length - answeredCount;
  const flaggedCount = flagged.size;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar with Time */}
      <div className="bg-navy text-white px-4 py-4 flex items-center justify-between shadow-lg z-40">
        <div className="text-sm font-medium">
          Question {currentIndex + 1} of {questions.length}
        </div>
        <div
          className={`text-lg font-bold ${isTimeRunningOut ? "text-ember" : ""}`}
        >
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Question Area */}
        <main className="flex-1 pb-32 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Question Body */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-6 select-none">
              <h2 className="text-lg font-semibold text-navy mb-6">
                {currentQuestion.body}
              </h2>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected =
                    answers.get(currentQuestion.id) === option.id;
                  const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelectOption(option.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? "bg-forest text-white border-forest"
                          : "bg-white text-gray-700 border-gray-200 hover:border-forest"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold flex-shrink-0 ${
                            isSelected ? "bg-white text-forest" : "bg-gray-100"
                          }`}
                        >
                          {optionLabel}
                        </div>
                        <div>{option.body}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-2 md:gap-4">
              {/* Left Arrow (Mobile) */}
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="md:hidden p-3 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                title="Previous question"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="hidden md:block px-6 py-2 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>

              <button
                onClick={handleToggleFlag}
                className={`px-4 md:px-6 py-2 rounded-lg font-medium transition-colors ${
                  isFlagged
                    ? "bg-crs text-white"
                    : "border border-gray-300 text-navy hover:bg-gray-50"
                }`}
              >
                {isFlagged ? "✓ Flagged" : "Flag"}
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex === questions.length - 1}
                className="hidden md:block px-6 py-2 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>

              {/* Right Arrow (Mobile) */}
              <button
                onClick={handleNext}
                disabled={currentIndex === questions.length - 1}
                className="md:hidden p-3 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                title="Next question"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Question Palette (Mobile & Tablet - Wrapped) */}
            <div className="lg:hidden mt-6 bg-white rounded-lg shadow-lg p-3">
              <div className="flex flex-wrap gap-2">
                {questions.map((q, idx) => {
                  const isCurrentQuestion = idx === currentIndex;
                  const isQuestionAnswered =
                    answers.has(q.id) && answers.get(q.id) !== null;
                  const isQuestionFlagged = flagged.has(q.id);

                  let bgColor = "bg-white border border-gray-300";
                  if (isQuestionAnswered && !isQuestionFlagged) {
                    bgColor = "bg-forest text-white";
                  } else if (isQuestionFlagged) {
                    bgColor = "bg-crs text-white";
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => handleGoToQuestion(idx)}
                      className={`w-10 h-10 rounded text-xs font-bold text-gray-400 flex items-center justify-center transition-all ${bgColor} ${
                        isCurrentQuestion ? "ring-2 ring-navy" : ""
                      }`}
                      title={`Question ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* Question Palette Sidebar */}
        <aside className="hidden lg:block w-20 bg-white shadow-lg border-l border-gray-200 p-2 fixed right-0 top-16 bottom-24 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {questions.map((q, idx) => {
              const isCurrentQuestion = idx === currentIndex;
              const isQuestionAnswered =
                answers.has(q.id) && answers.get(q.id) !== null;
              const isQuestionFlagged = flagged.has(q.id);

              let bgColor = "bg-white border border-gray-300";
              if (isQuestionAnswered && !isQuestionFlagged) {
                bgColor = "bg-forest text-white";
              } else if (isQuestionFlagged) {
                bgColor = "bg-crs text-white";
              }

              return (
                <button
                  key={q.id}
                  onClick={() => handleGoToQuestion(idx)}
                  className={`w-8 h-8 rounded text-xs font-bold text-gray-400 flex items-center justify-center transition-all ${bgColor} ${
                    isCurrentQuestion ? "ring-2 ring-navy" : ""
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Submit Button (Fixed Bottom) */}
      <div className="fixed bottom-4 right-4 z-30">
        <button
          onClick={() => setShowSubmitDialog(true)}
          disabled={submitting}
          className="px-6 py-3 bg-ember text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-lg"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>

      {/* Submit Confirmation Dialog */}
      {showSubmitDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-navy mb-4">
              Submit Practice Session?
            </h3>

            <div className="space-y-2 mb-6 text-sm text-gray-700">
              <p>
                <strong>Answered:</strong> {answeredCount} questions
              </p>
              <p>
                <strong>Unanswered:</strong> {unansweredCount} questions
              </p>
              <p>
                <strong>Flagged:</strong> {flaggedCount} questions
              </p>
              <p>
                <strong>Time taken:</strong> {formatTime(totalTime - timeLeft)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Continue
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Loader */}
      {submitting && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-4">
              <svg
                className="animate-spin h-8 w-8 text-forest"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-navy">Submitting your session...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we save your answers</p>
          </div>
        </div>
      )}
    </div>
  );
}
