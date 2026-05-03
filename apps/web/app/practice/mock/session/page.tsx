"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";
import type { StartSessionResponse, SubmitAnswerRequest } from "types";

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
  const { user, loading } = useAuth();
  const [sessionData, setSessionData] = useState<StartSessionResponse | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(90 * 60); // 90 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Initialize mock session
  useEffect(() => {
    const startMockSession = async () => {
      try {
        const response = await api.post("/api/sessions/mock/start", {});
        setSessionData(response.data.data);
        setQuestions(response.data.data.questions);
        setSessionId(response.data.data.session_id);

        // Initialize answers array
        const emptyAnswers = response.data.data.questions.map((q: Question) => ({
          question_id: q.id,
          selected_option_id: null,
        }));
        setAnswers(emptyAnswers);
        setPageLoading(false);
      } catch (error) {
        console.error("Failed to start mock session:", error);
        toast.error("Failed to start mock exam");
        router.push("/dashboard");
      }
    };

    if (!loading && user) {
      startMockSession();
    }
  }, [user, loading, router]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmitSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  const handleSubmitSession = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Submit all answers
      const submitPromises = answers.map((answer) =>
        api.post("/api/sessions/submit-answer", {
          session_id: sessionId,
          ...answer,
        })
      );

      await Promise.all(submitPromises);

      // Complete the session
      await api.post(`/api/sessions/${sessionId}/submit`, {
        time_taken_seconds: (90 * 60) - timeRemaining,
      });

      router.push(`/practice/results?sessionId=${sessionId}`);
    } catch (error) {
      console.error("Failed to submit session:", error);
      toast.error("Failed to submit exam. Please try again.");
      setIsSubmitting(false);
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
  const subjects = ["Biology", "Chemistry", "Physics", "Government"];
  const currentSubject = subjects[subjectIndex];
  const questionInSubject = (currentQuestion % questionsPerSubject) + 1;

  return (
    <div className="min-h-screen bg-blush flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-navy text-white shadow-lg sticky top-0 z-40">
        <div className="px-2 md:px-4 py-2 md:py-4 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-sm md:text-xl font-bold truncate">Mock UTME</h1>
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
        {/* Sidebar - Question Navigation */}
        <div className="w-72 bg-white border-r border-gray-300 overflow-y-auto p-4">
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
          <div className="grid grid-cols-2 gap-3">
            {subjects.map((subject, idx) => (
              <div key={subject} className="bg-gray-50 p-2 rounded border border-gray-200">
                <p className="text-xs font-semibold text-navy mb-2 text-center">{subject}</p>
                <div className="grid grid-cols-5 gap-0.5">
                  {Array.from({ length: questionsPerSubject }).map((_, qIdx) => {
                    const qNumber = idx * questionsPerSubject + qIdx;
                    const isAnswered = answers[qNumber].selected_option_id !== null;
                    const isCurrent = currentQuestion === qNumber;

                    return (
                      <button
                        key={qNumber}
                        onClick={() => setCurrentQuestion(qNumber)}
                        className={`w-5 h-5 text-xs font-bold rounded transition-all ${
                          isCurrent
                            ? "bg-navy text-white ring-1 ring-forest"
                            : isAnswered
                            ? "bg-forest text-white"
                            : "bg-gray-300 text-gray-600"
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
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            className="px-3 md:px-6 py-1.5 md:py-2 bg-gray-200 text-gray-900 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors text-xs md:text-base"
          >
            Prev
          </button>

          <div className="text-xs md:text-sm text-gray-600 font-medium">
            {currentQuestion + 1} / {questions.length}
          </div>

          <div className="flex gap-2">
            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={handleSubmitSession}
                disabled={isSubmitting}
                className="px-3 md:px-8 py-1.5 md:py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 transition-opacity text-xs md:text-base"
              >
                {isSubmitting ? "..." : "Submit"}
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-3 md:px-6 py-1.5 md:py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition-opacity text-xs md:text-base"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile spacing for fixed bottom nav */}
      <div className="h-16 md:h-0" />
    </div>
  );
}
