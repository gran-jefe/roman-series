"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LockedFeature } from "@/components/LockedFeature";
import api from "@/lib/api";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";
import { Lock, Calendar, AlertCircle } from "lucide-react";
import { useContentProtection } from "@/hooks/useContentProtection";

interface RecalledQuestion {
  id: string;
  subject: string;
  year: number;
  batch: string | null;
  section_label: string | null;
  question_number: number;
  body: string;

  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;

  answer: string | null;
  has_options: boolean;
  note: string | null;
}

interface Subject {
  id: string;
  name: string;
  colour_token: string;
}



export default function RecalledQuestionsPage() {
  useContentProtection();
  const { profile, loading } = useAuth();
  const [questions, setQuestions] = useState<RecalledQuestion[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const isElite = profile?.subscription_status === "elite";

  useEffect(() => {
    if (!loading) {
      setPageLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [subjectsRes] = await Promise.all([
          api.get("/api/subjects"),
        ]);
        setSubjects(subjectsRes.data.data || []);
      } catch (error) {
        console.error("Failed to fetch filter data:", error);
      }
    };

    if (isElite) {
      fetchFilters();
    }
  }, [isElite]);

  const fetchQuestions = async () => {
    if (!isElite) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.append("subject_id", selectedSubject);
      // if (selectedUniversity) params.append("university_id", selectedUniversity);
      if (selectedYear) params.append("year", selectedYear);

      const response = await api.get(`/api/recalled-questions?${params.toString()}`);

      if (response.data.status === "success") {
        setQuestions(response.data.data.questions);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to fetch recalled questions";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch questions when filters change
  useEffect(() => {
    if (isElite) {
      fetchQuestions();
    }
  }, [selectedSubject, selectedYear, isElite]);

  if (pageLoading) {
    return <PageLoader />;
  }

  // Show locked feature for non-Elite users
  if (!isElite) {
    return (
      <LockedFeature
        featureName="Authentic and Updated UI-POSTUTME Questions (2019-2026)"
        description="Access to questions confirmed to have appeared in past UI Post-Utme exams, including June 2026 questions for underage candidates. "
        currentPlan={profile?.subscription_status || "explorer"}
        icon="⭐"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
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
                  Recalled Questions 🎯
                </h1>
                <p className="text-white/70 text-sm sm:text-base mt-1">
                  Authentic UI Post-UTME questions from 2019-2025
                </p>
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-400/20 border border-green-400/50 rounded-full">
              <Lock className="w-4 h-4 text-green-300" />
              <span className="text-sm font-bold text-green-300">
                Elite Exclusive
              </span>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="mb-8 p-4 sm:p-5 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900 text-sm">
              No official answers
            </p>
            <p className="text-amber-800 text-sm mt-0.5">
              These questions have no official answers yet. Study them to
              understand question patterns and exam style — they&apos;re
              authentic questions recalled by students.
            </p>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-10 hover:shadow-lg hover:border-forest/30 transition-all">
          <h2 className="text-lg sm:text-xl font-black text-navy mb-6">
            Filter Questions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Subject Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-all"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* University Filter */}
            {/* <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">
                University
              </label>
              <select
                value={selectedUniversity}
                onChange={(e) => setSelectedUniversity(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-all"
              >
                <option value="">All Universities</option>
                {universities.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.name}
                  </option>
                ))}
              </select>
            </div> */}

            {/* Year Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-all"
              >
                <option value="">All Years</option>
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div>
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest"></div>
              </div>
              <p className="text-gray-600 mt-4 font-medium">
                Loading authentic questions...
              </p>
            </div>
          ) : questions.length === 0 ? (
            <div className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-gray-600 text-lg">
                No recalled questions found. Try adjusting your filters or check
                back soon!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, idx) => (
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
                      {question.year && (
                        <div className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg">
                          <Calendar className="w-4 h-4 text-gray-600" />
                          <span className="text-xs font-bold text-gray-700">
                            {question.year}
                          </span>
                        </div>
                      )}
                    
                    </div>
                  </div>

                  {/* Question Body */}
                  <p className="text-navy font-medium text-base leading-relaxed mb-5">
                    {question.body}
                  </p>

                  {question.has_options && (
                    <div className="space-y-2 mb-5">
                      {[
                        { label: "A", body: question.option_a },
                        { label: "B", body: question.option_b },
                        { label: "C", body: question.option_c },
                        { label: "D", body: question.option_d },
                      ].map((option) => (
                        <div
                          key={option.label}
                          className="p-3.5 rounded-xl border-2 border-gray-200 bg-gray-50/30"
                        >
                          <div className="flex items-start gap-3">
                            <span className="font-black text-navy text-sm">
                              {option.label}.
                            </span>

                            <span className="text-gray-700 text-sm">
                              {option.body}
                            </span>

                            {question.answer === option.label && (
                              <span className="ml-auto text-xs font-black text-green-600">
                                ✓ Correct
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Explanation */}
                  {question.note && (
                    <div className="bg-blue-50/50 border-l-4 border-blue-400 p-4 rounded-lg">
                      <p className="text-xs font-bold text-blue-900 mb-1.5">
                        💡 Explanation
                      </p>
                      <p className="text-sm text-blue-800 leading-relaxed">
                        {question.note}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

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
