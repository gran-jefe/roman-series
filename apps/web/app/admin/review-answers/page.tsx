"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface Option {
  id: string;
  label: string;
  body: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  number: number;
  body: string;
  answer_letter: string | null;
  topic_id: string;
  topics: {
    name: string;
    subject_id: string;
    subjects: {
      id: string;
      name: string;
    };
  };
  options: Option[];
}

interface ExpandedQuestion {
  [key: string]: boolean;
}

const BATCH_SIZE = 10;

const QuestionSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
    <div className="space-y-3 mb-4">
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>
    <div className="space-y-2 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-12 bg-gray-100 rounded-lg" />
      ))}
    </div>
    <div className="flex gap-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex-1 h-10 bg-gray-200 rounded-lg" />
      ))}
    </div>
  </div>
);

export default function ReviewAnswersPage() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [displayedQuestions, setDisplayedQuestions] = useState<Question[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [settingAnswer, setSettingAnswer] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ExpandedQuestion>({});
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialQuestions();
  }, []);

  const fetchInitialQuestions = async () => {
    setInitialLoading(true);
    try {
      const res = await api.get("/api/admin/questions/unanswered");
      const questions = res.data.data || [];
      setAllQuestions(questions);
      setDisplayedQuestions(questions.slice(0, BATCH_SIZE));
      setAnsweredCount(0);
      setHasMore(questions.length > BATCH_SIZE);
    } catch (error) {
      console.error("Failed to fetch unanswered questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setInitialLoading(false);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    // Simulate network delay for smooth skeleton animation
    setTimeout(() => {
      const currentCount = displayedQuestions.length;
      const newQuestions = allQuestions.slice(
        currentCount,
        currentCount + BATCH_SIZE
      );
      setDisplayedQuestions((prev) => [...prev, ...newQuestions]);
      setHasMore(currentCount + BATCH_SIZE < allQuestions.length);
      setLoadingMore(false);
    }, 400);
  }, [displayedQuestions.length, allQuestions, loadingMore, hasMore]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const handleSetAnswer = async (questionId: string, answerLetter: string) => {
    setSettingAnswer(questionId);
    try {
      await api.patch(`/api/admin/questions/${questionId}/answer`, {
        answer_letter: answerLetter,
      });

      setAllQuestions((prev) => prev.filter((q) => q.id !== questionId));
      setDisplayedQuestions((prev) => prev.filter((q) => q.id !== questionId));
      setAnsweredCount((prev) => prev + 1);
      toast.success(`✓ Set answer to ${answerLetter}`);
    } catch (error) {
      console.error("Failed to set answer:", error);
      toast.error("Failed to set answer");
    } finally {
      setSettingAnswer(null);
    }
  };

  const totalQuestions = allQuestions.length + answeredCount;
  const progressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2">Review Answers</h1>
          <p className="text-gray-600">
            Manually set answer letters for questions
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-navy">
              Progress: {answeredCount} / {totalQuestions}
            </p>
            <p className="text-lg font-bold text-forest">{progressPercent}%</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-forest h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {displayedQuestions.length === 0 && totalQuestions > 0 && (
            <p className="text-sm text-green-600 mt-3 font-semibold">
              ✓ All questions answered!
            </p>
          )}
        </div>

        {/* Initial Loading */}
        {initialLoading && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <QuestionSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Questions List */}
        {!initialLoading && displayedQuestions.length > 0 && (
          <div className="space-y-4">
            {displayedQuestions.map((question) => (
              <div
                key={question.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                {/* Breadcrumb */}
                <div className="text-sm text-gray-600 mb-3">
                  <span className="font-semibold">
                    {question.topics.subjects.name}
                  </span>
                  {" / "}
                  <span>{question.topics.name}</span>
                  {" / Q"}
                  {question.number}
                </div>

                {/* Question Body */}
                <div className="mb-4">
                  <p className="text-gray-900 line-clamp-3 mb-2">
                    {question.body}
                  </p>
                  {question.body.length > 150 && (
                    <button
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [question.id]: !prev[question.id],
                        }))
                      }
                      className="text-sm text-forest font-medium hover:underline"
                    >
                      {expanded[question.id] ? "Show less" : "Show more"}
                    </button>
                  )}
                  {expanded[question.id] && (
                    <p className="text-gray-900 mt-2">{question.body}</p>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-2 mb-6">
                  {question.options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="font-semibold text-navy w-6 flex-shrink-0">
                        {option.label}.
                      </span>
                      <span className="text-gray-900 flex-1">
                        {option.body}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Answer Buttons */}
                <div className="flex gap-2">
                  {question.options.map((option) => (
                    <button
                      key={option.label}
                      onClick={() =>
                        handleSetAnswer(question.id, option.label)
                      }
                      disabled={settingAnswer === question.id}
                      className="flex-1 px-4 py-2 bg-forest text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 transition"
                    >
                      {settingAnswer === question.id ? "..." : option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Loading More Skeletons */}
            {loadingMore && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <QuestionSkeleton key={`skeleton-${i}`} />
                ))}
              </div>
            )}

            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="h-10" />

            {/* All Loaded Message */}
            {!hasMore && displayedQuestions.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No more questions to load</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!initialLoading && displayedQuestions.length === 0 && totalQuestions === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">
              No unanswered questions found!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
