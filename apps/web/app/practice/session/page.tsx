"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/api";
import type { StudentQuestion, Subject, University } from "types";

export default function PracticeSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  // State
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string | null>>(new Map());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState<Subject | null>(null);
  const [university, setUniversity] = useState<University | null>(null);
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
      const meta = JSON.parse(metaRaw);

      setQuestions(questionsData);
      setSubject(meta.subject);
      setUniversity(meta.university);

      const calcTotalTime = questionsData.length * 60; // 1 minute per question
      setTotalTime(calcTotalTime);
      setTimeLeft(calcTotalTime);
      setPageLoading(false);
    } catch (error) {
      console.error("Failed to parse session data:", error);
      router.push("/dashboard?error=session_expired");
    }
  }, [sessionId, router]);

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

  // Toggle flag
  const handleToggleFlag = () => {
    setFlagged((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion.id)) {
        newSet.delete(currentQuestion.id);
      } else {
        newSet.add(currentQuestion.id);
      }
      return newSet;
    });
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
      const answersPayload = questions.map((q) => ({
        question_id: q.id,
        selected_option_id: answers.get(q.id) ?? null,
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading practice session...</div>
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
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-navy text-white px-4 flex items-center justify-between shadow-lg z-40">
        <div className="text-sm font-medium">{subject?.name || "Practice"}</div>
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
      <div className="mt-16 flex-1 flex">
        {/* Question Area */}
        <main className="flex-1 pb-32 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Question Body */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
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

            {/* Navigation */}
            <div className="flex gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="px-6 py-2 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <button
                onClick={handleToggleFlag}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
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
                className="px-6 py-2 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
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
                  className={`w-8 h-8 rounded text-xs font-bold flex items-center justify-center transition-all ${bgColor} ${
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
    </div>
  );
}
