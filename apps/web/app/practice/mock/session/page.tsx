"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";
import type { StartSessionResponse, Subject } from "types";

interface Answer {
  question_id: string;
  selected_option_id: string | null;
}

interface Question {
  id: string;
  body: string;
  subject_name: string;
  subject_colour_token: string;
  options: Array<{
    id: string;
    label: string;
    body: string;
  }>;
}

export default function MockSessionPage() {
  const router = useRouter();
  const { user, loading, profile } = useAuth();
  const [sessionData, setSessionData] = useState<StartSessionResponse | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // Will be set from API response
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hasSubmittedRef = useRef(false);

  // Check subscription and initialize mock session
  useEffect(() => {
    const startMockSession = async () => {
      try {
        // Guard: check if user is subscribed
        if (profile?.subscription_status === "free") {
          toast.error("Mock exams are only available for Pro subscribers");
          router.push("/pricing");
          return;
        }

        const response = await api.post("/api/sessions/mock/start", {});
        setSessionData(response.data.data);
        setQuestions(response.data.data.questions);
        setSessionId(response.data.data.session_id);

        // Set time limit from API response (in minutes, convert to seconds)
        const timeLimitSeconds = (response.data.data.time_limit_minutes || 90) * 60;
        setTimeRemaining(timeLimitSeconds);

        // Initialize answers array
        const emptyAnswers = response.data.data.questions.map((q: Question) => ({
          question_id: q.id,
          selected_option_id: null,
        }));
        setAnswers(emptyAnswers);
        setPageLoading(false);
      } catch (error) {
        console.error("Failed to start mock session:", error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any)?.response?.status === 402) {
          toast.error("Mock exams are only available for Pro subscribers");
          router.push("/pricing");
        } else {
          toast.error("Failed to start mock exam");
          router.push("/dashboard");
        }
      }
    };

    if (!loading && user) {
      startMockSession();
    }
  }, [user, loading, router, profile]);

  // Submit session handler - defined before auto-submit effect
  const handleSubmitSession = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const timeTaken = (90 * 60) - timeRemaining;

      const res = await api.post(`/api/sessions/${sessionId}/submit`, {
        answers,
        time_taken_seconds: Math.max(timeTaken, 0),
      });

      // Store results in sessionStorage so results page can access them
      if (res.data.data) {
        sessionStorage.setItem(
          `session_results_${sessionId}`,
          JSON.stringify(res.data.data)
        );
      }

      router.push(`/practice/results?sessionId=${sessionId}`);
    } catch (error) {
      console.error("Failed to submit session:", error);
      toast.error("Failed to submit exam. Please try again.");
      setIsSubmitting(false);
    }
  }, [sessionId, answers, timeRemaining, isSubmitting, router]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining <= 0 && !hasSubmittedRef.current && sessionId) {
      hasSubmittedRef.current = true;
      handleSubmitSession();
    }
  }, [timeRemaining, sessionId, handleSubmitSession]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (optionId: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion].selected_option_id = optionId;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  if (pageLoading || !sessionData || questions.length === 0) {
    return <PageLoader message="Loading mock exam..." />;
  }

  const currentQ = questions[currentQuestion];
  const answerPercentage = Math.round(
    ((currentQuestion + 1) / questions.length) * 100
  );
  const isTimeWarning = timeRemaining < 600; // 10 minutes
  const isCritical = timeRemaining < 60; // 1 minute

  // Calculate subject and question number within subject
  const questionsPerSubject = 25;
  const subjectIndex = Math.floor(currentQuestion / questionsPerSubject);
  const subjects = (sessionData?.subjects || []) as Subject[];
  const currentSubject = subjects[subjectIndex]?.name || "Question";
  const questionInSubject = (currentQuestion % questionsPerSubject) + 1;

  return (
    <div className="min-h-screen bg-blush flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-navy text-white shadow-lg sticky top-0 z-40">
        <div className="px-2 md:px-4 py-2 md:py-4 flex items-center justify-between gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden flex items-center justify-center w-8 h-8 hover:bg-navy-dark rounded transition-colors"
            title="Toggle questions sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm md:text-xl font-bold truncate">Mock PUTME</h1>
            <p className="text-xs md:text-sm text-gray-300 truncate">
              {currentSubject} • Q{questionInSubject}/25
            </p>
          </div>
          <div
            className={`text-base md:text-2xl font-bold px-2 md:px-4 py-1 md:py-2 rounded-lg whitespace-nowrap flex-shrink-0 ${
              isCritical
                ? "bg-red-600 text-white"
                : isTimeWarning
                ? "bg-yellow-600 text-white"
                : "bg-forest text-white"
            }`}
          >
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Question Navigation (Hidden on mobile, visible on lg) */}
        <div className="hidden lg:flex lg:w-96 bg-white border-r border-gray-300 overflow-y-auto p-4 flex-col">
          <div className="mb-4">
            <p className="text-sm font-bold text-navy mb-2">Progress</p>
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-forest h-full transition-all"
                style={{ width: `${answerPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {currentQuestion + 1}/{questions.length}
            </p>
          </div>

          {/* Subject sections in 2x2 grid */}
          <div className="grid grid-cols-2 gap-4">
            {subjects.map((subject: Subject, idx: number) => (
              <div key={subject.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-sm font-semibold text-navy mb-3 text-center">{subject.name}</p>
                <div className="grid grid-cols-5 gap-1">
                  {Array.from({ length: questionsPerSubject }).map((_, qIdx) => {
                    const qNumber = idx * questionsPerSubject + qIdx;
                    const isAnswered = answers[qNumber].selected_option_id !== null;
                    const isCurrent = currentQuestion === qNumber;

                    return (
                      <button
                        key={qNumber}
                        onClick={() => setCurrentQuestion(qNumber)}
                        className={`w-7 h-7 text-sm font-bold rounded transition-all flex items-center justify-center ${
                          isCurrent
                            ? "bg-navy text-white ring-2 ring-forest"
                            : isAnswered
                            ? "bg-forest text-white"
                            : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                        }`}
                      >
                        {qIdx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Sidebar - Dropdown Modal */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50">
            <div className="absolute top-0 left-0 right-0 bg-white border-b border-gray-300 max-h-96 overflow-y-auto p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-navy">Questions</h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm font-bold text-navy mb-2">Progress</p>
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-forest h-full transition-all"
                    style={{ width: `${answerPercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {currentQuestion + 1}/{questions.length}
                </p>
              </div>

              {/* Subject sections for mobile */}
              <div className="space-y-3">
                {subjects.map((subject: Subject, idx: number) => (
                  <div key={subject.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                    <p className="text-sm font-semibold text-navy mb-3 text-center">{subject.name}</p>
                    <div className="grid grid-cols-5 gap-1">
                      {Array.from({ length: questionsPerSubject }).map((_, qIdx) => {
                        const qNumber = idx * questionsPerSubject + qIdx;
                        const isAnswered = answers[qNumber].selected_option_id !== null;
                        const isCurrent = currentQuestion === qNumber;

                        return (
                          <button
                            key={qNumber}
                            onClick={() => {
                              setCurrentQuestion(qNumber);
                              setSidebarOpen(false);
                            }}
                            className={`w-7 h-7 text-sm font-bold rounded transition-all flex items-center justify-center ${
                              isCurrent
                                ? "bg-navy text-white ring-2 ring-forest"
                                : isAnswered
                                ? "bg-forest text-white"
                                : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                            }`}
                          >
                            {qIdx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Question Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto">
            {/* Question */}
            <div className="mb-8">
              <p className="text-sm text-gray-600 mb-4">
                Question {currentQuestion + 1} of {questions.length}
              </p>
              <div
                className="p-6 rounded-lg border-l-4 mb-6"
                style={{
                  backgroundColor: currentQ.subject_colour_token + "20",
                  borderColor: currentQ.subject_colour_token,
                }}
              >
                <p className="text-lg font-semibold text-navy">{currentQ.body}</p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((option) => {
                  const isSelected =
                    answers[currentQuestion].selected_option_id === option.id;

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelectOption(option.id)}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                        isSelected
                          ? "bg-forest text-white border-forest"
                          : "bg-white border-gray-300 hover:border-forest text-gray-900"
                      }`}
                    >
                      <span className="font-bold">{option.label}.</span> {option.body}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Fixed/Sticky */}
      <div className="fixed md:relative bottom-0 left-0 right-0 bg-white border-t border-gray-300 shadow-lg p-2 md:p-4 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            className="hidden md:block px-3 md:px-6 py-1.5 md:py-2 bg-gray-200 text-gray-900 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors text-xs md:text-base"
          >
            Prev
          </button>

          {/* Mobile Previous Button */}
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            className="md:hidden px-3 py-1.5 bg-gray-200 text-gray-900 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors flex items-center justify-center"
            title="Previous question"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex gap-2 w-full md:w-auto md:order-3">
            {currentQuestion < questions.length - 1 && (
              <button
                onClick={handleNextQuestion}
                className="flex-1 md:flex-none px-3 md:px-6 py-1.5 md:py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition-opacity text-xs md:text-base"
              >
                Next
              </button>
            )}
            <button
              onClick={handleSubmitSession}
              disabled={isSubmitting}
              className="flex-1 md:flex-none px-3 md:px-8 py-1.5 md:py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 transition-opacity text-xs md:text-base"
            >
              {isSubmitting ? "..." : "Submit"}
            </button>
          </div>

          <div className="text-xs md:text-sm text-gray-600 font-medium w-full text-center md:w-auto md:order-2">
            {currentQuestion + 1} / {questions.length}
          </div>
        </div>
      </div>

      {/* Mobile spacing for fixed bottom nav */}
      <div className="h-16 md:h-0" />
    </div>
  );
}
