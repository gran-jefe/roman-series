"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LockedFeature } from "@/components/LockedFeature";
import { canAccessBiologyFocus } from "@/lib/subscription";
import api from "@/lib/api";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";
import { Lock } from "lucide-react";
import { useContentProtection } from "@/hooks/useContentProtection";
import { ContentWatermark } from "@/components/ContentWatermark";

interface QBankQuestion {
  id: string;
  section_name: string;
  question_number: number;
  body: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  option_e: string | null;
  answer: string;
  explanation: string | null;
}

type Tab = "concentration" | "qbank";

export default function BiologyFocusPage() {
  useContentProtection();
  const { profile, loading } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("concentration");

  const [markdown, setMarkdown] = useState("");
  const [contentLoading, setContentLoading] = useState(false);

  const [questions, setQuestions] = useState<QBankQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState("");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const hasAccess = canAccessBiologyFocus(profile?.subscription_status);

  useEffect(() => {
    if (!loading) {
      setPageLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    const fetchContent = async () => {
      setContentLoading(true);
      try {
        const response = await api.get("/api/biology-focus/content");
        if (response.data.status === "success") {
          setMarkdown(response.data.data.content);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to load study guide");
      } finally {
        setContentLoading(false);
      }
    };

    if (hasAccess) {
      fetchContent();
    }
  }, [hasAccess]);

  useEffect(() => {
    const fetchQuestions = async () => {
      setQuestionsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedSection) params.append("section_name", selectedSection);

        const response = await api.get(`/api/biology-focus/questions?${params.toString()}`);
        if (response.data.status === "success") {
          setQuestions(response.data.data.questions);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to load question bank");
      } finally {
        setQuestionsLoading(false);
      }
    };

    if (hasAccess) {
      fetchQuestions();
    }
  }, [hasAccess, selectedSection]);

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const sections = Array.from(new Set(questions.map((q) => q.section_name))).sort();

  if (pageLoading) {
    return <PageLoader />;
  }

  if (!hasAccess) {
    return (
      <LockedFeature
        featureName="Biology: Plant Morphology Focus"
        description="A dedicated study guide and 90-question bank covering one of the most challenging Biology topics in the UI Post-UTME."
        currentPlan={profile?.subscription_status || "explorer"}
        icon="⭐"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <ContentWatermark />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Header */}
        <div className="mb-10 bg-gradient-to-r from-navy to-navy/90 text-white rounded-3xl p-8 sm:p-12 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-forest/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-forest/15 rounded-full blur-2xl translate-x-[-20%] translate-y-1/3 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">🔐</span>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black">
                  Biology: Plant Morphology Focus<sup className="text-sm align-super">™</sup> 🌿
                </h1>
                <p className="text-white/70 text-sm sm:text-base mt-1">
                  Master one of the most challenging Biology topics — based on real UI
                  Post-UTME question patterns.
                </p>
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-400/20 border border-green-400/50 rounded-full">
              <Lock className="w-4 h-4 text-green-300" />
              <span className="text-sm font-bold text-green-300">Elite Exclusive</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setTab("concentration")}
            className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all ${
              tab === "concentration"
                ? "bg-navy text-white shadow-md"
                : "bg-white text-navy border border-gray-200 hover:border-navy/40"
            }`}
          >
            Area of Concentration
          </button>
          <button
            onClick={() => setTab("qbank")}
            className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all ${
              tab === "qbank"
                ? "bg-navy text-white shadow-md"
                : "bg-white text-navy border border-gray-200 hover:border-navy/40"
            }`}
          >
            Question Bank
          </button>
        </div>

        {tab === "concentration" ? (
          <div className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            {contentLoading ? (
              <div className="text-center py-16">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest"></div>
                </div>
                <p className="text-gray-600 mt-4 font-medium">Loading study guide...</p>
              </div>
            ) : markdown ? (
              <div className="biology-focus-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-gray-600 text-center py-12">
                Study guide content coming soon.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Section Filter Pills */}
            {sections.length > 0 && (
              <div className="mb-8 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSection("")}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    selectedSection === ""
                      ? "bg-forest text-white shadow-md"
                      : "bg-white text-navy border border-gray-200 hover:border-forest/40"
                  }`}
                >
                  All Sections
                </button>
                {sections.map((name) => (
                  <button
                    key={name}
                    onClick={() => setSelectedSection(name)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      selectedSection === name
                        ? "bg-forest text-white shadow-md"
                        : "bg-white text-navy border border-gray-200 hover:border-forest/40"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            {/* Questions List */}
            {questionsLoading ? (
              <div className="text-center py-16">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest"></div>
                </div>
                <p className="text-gray-600 mt-4 font-medium">Loading question bank...</p>
              </div>
            ) : questions.length === 0 ? (
              <div className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <p className="text-gray-600 text-lg">
                  No questions found. Try a different section or check back soon!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, idx) => {
                  const isRevealed = revealed.has(question.id);
                  const options = [
                    { label: "A", body: question.option_a },
                    { label: "B", body: question.option_b },
                    { label: "C", body: question.option_c },
                    { label: "D", body: question.option_d },
                    { label: "E", body: question.option_e },
                  ].filter((o) => o.body);

                  return (
                    <div
                      key={question.id}
                      className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-7 hover:shadow-lg hover:border-forest/30 transition-all"
                    >
                      {/* Question Header */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-navy text-white font-black text-sm">
                            {idx + 1}
                          </span>
                          <div className="px-2.5 py-1 bg-gray-100 rounded-lg">
                            <span className="text-xs font-bold text-gray-700">
                              {question.section_name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Question Body (roman-numeral statements render as-is via whitespace-pre-line) */}
                      <p className="text-navy font-medium text-base leading-relaxed mb-5 whitespace-pre-line">
                        {question.body}
                      </p>

                      <div className="space-y-2 mb-5">
                        {options.map((option) => {
                          const isCorrect = question.answer === option.label;
                          return (
                            <div
                              key={option.label}
                              className={`p-3.5 rounded-xl border-2 transition-colors ${
                                isRevealed && isCorrect
                                  ? "border-green-400 bg-green-50"
                                  : "border-gray-200 bg-gray-50/30"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span className="font-black text-navy text-sm">
                                  {option.label}.
                                </span>
                                <span className="text-gray-700 text-sm">{option.body}</span>
                                {isRevealed && isCorrect && (
                                  <span className="ml-auto text-xs font-black text-green-600">
                                    ✓ Correct
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Show Answer Toggle */}
                      <button
                        onClick={() => toggleReveal(question.id)}
                        className="text-sm font-bold text-forest hover:underline transition-colors"
                      >
                        {isRevealed ? "Hide Answer" : "Show Answer"}
                      </button>

                      {isRevealed && question.explanation && (
                        <div className="mt-4 bg-blue-50/50 border-l-4 border-blue-400 p-4 rounded-lg">
                          <p className="text-xs font-bold text-blue-900 mb-1.5">💡 Explanation</p>
                          <p className="text-sm text-blue-800 leading-relaxed">
                            {question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Footer CTA */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <Link
            href="/dashboard"
            className="text-forest font-black text-sm hover:underline transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
