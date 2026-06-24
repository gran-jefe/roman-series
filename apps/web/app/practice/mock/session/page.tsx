"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useContentProtection } from "@/hooks/useContentProtection";
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
  useContentProtection();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, profile } = useAuth();
  const { checkMockExamAccess } = useFeatureAccess();
  const mockExamAccess = checkMockExamAccess();
  const [sessionData, setSessionData] = useState<StartSessionResponse | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // Will be set from API response
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number>(90 * 60); // Default 90 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [hardMode, setHardMode] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const hasSubmittedRef = useRef(false);
  const answersRef = useRef<Answer[]>([]);
  const sessionIdRef = useRef<string | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Initialize hard mode from URL params early
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "hard") {
      setHardMode(true);
    }
    // Only run once when component mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check subscription and initialize mock session
  useEffect(() => {
    const startMockSession = async () => {
      try {
        const mode = searchParams.get("mode");

        // Guard: check if user has mock exam access
        if (!mockExamAccess.hasAccess) {
          toast.error(mockExamAccess.reason || "Mock exams are not available on your plan");
          router.push("/pricing");
          return;
        }

        // Guard: check if user is subscribed
        if (!profile?.subscription_status || !["explorer", "scholar", "elite"].includes(profile.subscription_status)) {
          toast.error("Please log in to start a mock exam");
          router.push("/login");
          return;
        }

        // Check if there's a saved session in progress
        const savedSessionId = sessionStorage.getItem("mock_session_id_in_progress");

        if (savedSessionId) {
          // Resume saved session
          const savedQuestions = sessionStorage.getItem(`mock_questions_${savedSessionId}`);
          const savedAnswers = sessionStorage.getItem(`mock_answers_${savedSessionId}`);
          const savedCurrentQuestion = sessionStorage.getItem(`mock_current_question_${savedSessionId}`);
          const savedTime = sessionStorage.getItem(`mock_time_remaining_${savedSessionId}`);
          const savedSessionData = sessionStorage.getItem(`mock_session_data_${savedSessionId}`);
          const savedMode = sessionStorage.getItem(`mock_mode_${savedSessionId}`);

          if (savedQuestions && savedAnswers && savedSessionData) {
            setSessionId(savedSessionId);
            setQuestions(JSON.parse(savedQuestions));
            setAnswers(JSON.parse(savedAnswers));
            setCurrentQuestion(parseInt(savedCurrentQuestion || "0"));
            setSessionData(JSON.parse(savedSessionData));
            setTimeRemaining(parseInt(savedTime || "0"));
            if (savedMode === "hard") setHardMode(true);
            setPageLoading(false);
            return;
          }
        }

        const response = await api.post("/api/sessions/mock/start", { mode: mode || undefined });
        const newSessionId = response.data.data.session_id;
        setSessionData(response.data.data);
        setQuestions(response.data.data.questions);
        setSessionId(newSessionId);

        // Save session data for resume
        sessionStorage.setItem("mock_session_id_in_progress", newSessionId);
        sessionStorage.setItem(`mock_session_data_${newSessionId}`, JSON.stringify(response.data.data));
        sessionStorage.setItem(`mock_questions_${newSessionId}`, JSON.stringify(response.data.data.questions));
        if (mode === "hard") {
          sessionStorage.setItem(`mock_mode_${newSessionId}`, "hard");
        }

        // Set time limit from API response (in minutes, convert to seconds)
        const calculatedTimeLimitSeconds = (response.data.data.time_limit_minutes || 90) * 60;
        setTimeLimitSeconds(calculatedTimeLimitSeconds);
        setTimeRemaining(calculatedTimeLimitSeconds);
        sessionStorage.setItem(`mock_time_remaining_${newSessionId}`, calculatedTimeLimitSeconds.toString());

        // Initialize answers array
        const emptyAnswers = response.data.data.questions.map((q: Question) => ({
          question_id: q.id,
          selected_option_id: null,
        }));
        setAnswers(emptyAnswers);
        sessionStorage.setItem(`mock_answers_${newSessionId}`, JSON.stringify(emptyAnswers));
        setPageLoading(false);
      } catch (error) {
        console.error("Failed to start mock session:", error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorResponse = (error as any)?.response;
        if (errorResponse?.status === 402) {
          const errorMessage = errorResponse?.data?.message || "Mock exam limit reached";
          toast.error(errorMessage);

          // Only redirect to pricing if it's truly about subscription, not monthly limit
          if (errorMessage.includes("paid") || errorMessage.includes("upgrade")) {
            router.push("/pricing");
          } else {
            // Monthly limit or other 402 errors - go back to dashboard
            router.push("/dashboard");
          }
        } else {
          toast.error("Failed to start mock exam");
          router.push("/dashboard");
        }
      }
    };

    if (!loading && user) {
      startMockSession();
    }
    // Only run when user data is loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  // Submit session handler - defined before auto-submit effect
  const handleSubmitSession = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const timeTaken = timeLimitSeconds - timeRemaining;

      // Use latest answers from ref, fallback to sessionStorage
      let finalAnswers = answersRef.current;
      if (!finalAnswers || finalAnswers.length === 0) {
        const saved = sessionStorage.getItem(`mock_answers_${sessionIdRef.current}`);
        if (saved) {
          try {
            finalAnswers = JSON.parse(saved);
          } catch (e) {
            console.error("Failed to parse saved answers:", e);
          }
        }
      }

      const res = await api.post(`/api/sessions/${sessionIdRef.current}/submit`, {
        answers: finalAnswers,
        time_taken_seconds: Math.max(timeTaken, 0),
      });

      // Store questions data for results page
      if (questions.length > 0) {
        sessionStorage.setItem(
          `session_questions_${sessionId}`,
          JSON.stringify(questions)
        );
      }

      // Store results in sessionStorage so results page can access them
      if (res.data.data) {
        sessionStorage.setItem(
          `session_results_${sessionId}`,
          JSON.stringify(res.data.data)
        );
      }

      // Clear the saved session from sessionStorage
      sessionStorage.removeItem("mock_session_id_in_progress");
      sessionStorage.removeItem(`mock_session_data_${sessionId}`);
      sessionStorage.removeItem(`mock_questions_${sessionId}`);
      sessionStorage.removeItem(`mock_answers_${sessionId}`);
      sessionStorage.removeItem(`mock_current_question_${sessionId}`);
      sessionStorage.removeItem(`mock_time_remaining_${sessionId}`);
      setTimeUp(false);

      router.push(`/practice/results?sessionId=${sessionId}`);
    } catch (error) {
      console.error("Failed to submit session:", error);
      toast.error("Failed to submit exam. Please try again.");
      setIsSubmitting(false);
    }
  }, [sessionId, timeRemaining, isSubmitting, router, questions, timeLimitSeconds]);

  // Save current question to sessionStorage
  useEffect(() => {
    if (sessionId) {
      sessionStorage.setItem(`mock_current_question_${sessionId}`, currentQuestion.toString());
    }
  }, [currentQuestion, sessionId]);

  // Save answers to sessionStorage
  useEffect(() => {
    if (sessionId && answers.length > 0) {
      sessionStorage.setItem(`mock_answers_${sessionId}`, JSON.stringify(answers));
    }
  }, [answers, sessionId]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Save time remaining to sessionStorage periodically
  useEffect(() => {
    if (sessionId && timeRemaining >= 0) {
      sessionStorage.setItem(`mock_time_remaining_${sessionId}`, timeRemaining.toString());
    }
  }, [timeRemaining, sessionId]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining === 0 && !hasSubmittedRef.current &&
        sessionId && !pageLoading && questions.length > 0) {
      hasSubmittedRef.current = true;
      setTimeUp(true);
      handleSubmitSession();
    }
  }, [timeRemaining, sessionId, pageLoading, questions.length, handleSubmitSession]);


  const handleSelectOption = (optionId: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion].selected_option_id = optionId;
    setAnswers(newAnswers);
  };

  const handleToggleFlag = async () => {
    if (!sessionId || !currentQ) return;

    const isFlagged = flaggedQuestions.has(currentQ.id);

    try {
      if (isFlagged) {
        // Unflag
        await api.delete(`/api/flagging/flag/${currentQ.id}`);
        setFlaggedQuestions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(currentQ.id);
          return newSet;
        });
        toast.success("Question unflagged");
      } else {
        // Flag
        await api.post("/api/flagging/flag", {
          question_id: currentQ.id,
          session_id: sessionId,
          reason: "Flagged during mock exam",
        });
        setFlaggedQuestions((prev) => new Set(prev).add(currentQ.id));
        toast.success("Question flagged for review");
      }
    } catch (error) {
      console.error("Failed to toggle flag:", error);
      toast.error("Failed to flag question");
    }
  };

  // Load flagged questions on mount
  useEffect(() => {
    const loadFlaggedQuestions = async () => {
      try {
        const res = await api.get("/api/flagging/flags");
        const ids: string[] = (res.data.data || []).map((f: { question_id: string }) => f.question_id);
        setFlaggedQuestions(new Set(ids));
      } catch (error) {
        console.error("Failed to load flagged questions:", error);
      }
    };

    if (!loading && user) {
      loadFlaggedQuestions();
    }
  }, [user, loading]);

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
  const questionsPerSubject = 25;
  const subjectIndex = Math.floor(currentQuestion / questionsPerSubject);
  const subjects = (sessionData?.subjects || []) as Subject[];
  const currentSubject = subjects[subjectIndex]?.name || "Question";
  const questionInSubject = (currentQuestion % questionsPerSubject) + 1;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-blush flex flex-col">
      {/* Top Navigation Bar with Time */}
      <div className="bg-navy text-white shadow-lg z-40">
        <div className="px-2 md:px-4 py-2 md:py-4 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <div className="min-w-0">
              <h1 className="text-sm md:text-xl font-bold truncate">Mock PUTME</h1>
              <p className="text-xs md:text-sm text-gray-300 truncate">
                {currentSubject} • Q{questionInSubject}/25
              </p>
            </div>
            <span className={`text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap flex-shrink-0 ${hardMode ? "bg-red-600" : "invisible"}`}>
              HARD MODE
            </span>
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
        <div className="hidden lg:flex lg:w-96 bg-white border-r border-gray-300 overflow-y-auto p-4 flex-col flex-shrink-0">
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
                        {idx * questionsPerSubject + qIdx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area - Flex Column */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Sticky Subject Tab Bar - All Screen Sizes */}
          <div className="sticky top-0 z-30 bg-white border-b border-gray-200 overflow-x-auto scrollbar-hide flex-shrink-0">
          <div className="flex min-w-max">
            {subjects.map((subject: Subject, idx: number) => {
              const startQ = idx * questionsPerSubject;
              const endQ = startQ + questionsPerSubject;
              const subjectAnswers = answers.slice(startQ, endQ);
              const answeredCount = subjectAnswers.filter(
                (a) => a.selected_option_id !== null
              ).length;
              const isActive = Math.floor(currentQuestion / questionsPerSubject) === idx;

              return (
                <button
                  key={subject.id}
                  onClick={() => {
                    // Jump to first unanswered in this subject
                    const firstUnanswered = subjectAnswers.findIndex(
                      (a) => a.selected_option_id === null
                    );
                    const targetQ = firstUnanswered >= 0 ? startQ + firstUnanswered : startQ;
                    setCurrentQuestion(targetQ);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2
                             whitespace-nowrap transition-all ${
                    isActive
                      ? "border-forest text-forest font-semibold"
                      : "border-transparent text-gray-500 hover:text-navy"
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: subject.colour_token || "#666" }}
                  />
                  <span className="text-sm">{subject.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      answeredCount === questionsPerSubject
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {answeredCount}/{questionsPerSubject}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mini Question Palette for Current Subject on Mobile */}
        <div className="lg:hidden bg-white border-b border-gray-100 px-3 py-2 max-h-28 overflow-y-auto flex-shrink-0">
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: questionsPerSubject }).map((_, qIdx) => {
              const qNumber = subjectIndex * questionsPerSubject + qIdx;
              const isAnswered = answers[qNumber]?.selected_option_id !== null;
              const isCurrent = currentQuestion === qNumber;
              const isFlagged = flaggedQuestions.has(questions[qNumber]?.id);

              return (
                <button
                  key={qNumber}
                  onClick={() => setCurrentQuestion(qNumber)}
                  className={`w-8 h-8 text-xs font-bold rounded transition-all ${
                    isCurrent
                      ? "bg-navy text-white ring-2 ring-forest"
                      : isFlagged
                      ? "bg-crs text-white"
                      : isAnswered
                      ? "bg-forest text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  {qIdx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Question Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            {/* Question */}
            <div className="mb-8 select-none">
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
        <div className="max-w-7xl mx-auto flex gap-2 md:gap-4">
          {/* Left Arrow (Mobile) */}
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            className="md:hidden p-3 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            title="Previous question"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            className="hidden md:block px-6 py-2 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>

          <button
            onClick={handleToggleFlag}
            className={`px-4 md:px-6 py-2 rounded-lg font-medium transition-colors ${
              flaggedQuestions.has(currentQ.id)
                ? "bg-crs text-white hover:bg-opacity-90"
                : "border border-gray-300 text-navy hover:bg-gray-50"
            }`}
            title={flaggedQuestions.has(currentQ.id) ? "Unflag this question" : "Flag for review"}
          >
            {flaggedQuestions.has(currentQ.id) ? "✓ Flagged" : "Flag"}
          </button>

          <button
            onClick={() => setShowSubmitDialog(true)}
            disabled={isSubmitting}
            className="px-4 md:px-6 py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "..." : "Submit"}
          </button>

          <button
            onClick={handleNextQuestion}
            disabled={currentQuestion === questions.length - 1}
            className="hidden md:block px-6 py-2 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>

          {/* Right Arrow (Mobile) */}
          <button
            onClick={handleNextQuestion}
            disabled={currentQuestion === questions.length - 1}
            className="md:hidden p-3 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            title="Next question"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        </div>
        {/* End of Main Content Area Flex Column */}
      </div>

      {/* Mobile spacing for fixed bottom nav */}
      <div className="h-16 md:h-0" />

      {/* Time's Up Overlay */}
      {timeUp && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <p className="text-2xl font-bold text-ember mb-2">⏰ Time&apos;s Up!</p>
            <p className="text-gray-600 mb-4">Submitting your exam answers...</p>
            <svg
              className="animate-spin h-8 w-8 text-forest mx-auto"
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
        </div>
      )}

      {/* Submit Confirmation Dialog */}
      {showSubmitDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-navy mb-4">
              Submit Mock Exam?
            </h3>

            <div className="space-y-2 mb-6 text-sm text-gray-700">
              <p>
                <strong>Answered:</strong> {answersRef.current.filter(a => a.selected_option_id !== null).length} of {questions.length} questions
              </p>
              <p>
                <strong>Unanswered:</strong> {questions.length - answersRef.current.filter(a => a.selected_option_id !== null).length} questions
              </p>
              <p>
                <strong>Flagged:</strong> {flaggedQuestions.size} questions
              </p>
              <p>
                <strong>Time taken:</strong> {formatTime(timeLimitSeconds - timeRemaining)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitDialog(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  setShowSubmitDialog(false);
                  handleSubmitSession();
                }}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Loader */}
      {isSubmitting && (
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
            <p className="text-lg font-semibold text-navy">Submitting your exam...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we save your answers</p>
          </div>
        </div>
      )}
    </div>
  );
}
