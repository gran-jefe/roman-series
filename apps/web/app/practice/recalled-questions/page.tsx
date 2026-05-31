"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LockedFeature } from "@/components/LockedFeature";
import api from "@/lib/api";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";

interface RecalledQuestion {
  id: string;
  subject_id: string;
  university_id: string;
  body: string;
  explanation: string;
  year: number;
  difficulty_level: string;
  recalled_question_options: Array<{
    id: string;
    label: string;
    body: string;
    is_correct: boolean;
  }>;
}

interface Subject {
  id: string;
  name: string;
  colour_token: string;
}

interface University {
  id: string;
  name: string;
  short_code: string;
}

export default function RecalledQuestionsPage() {
  const { profile, loading } = useAuth();
  const [questions, setQuestions] = useState<RecalledQuestion[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
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
        const [subjectsRes, unisRes] = await Promise.all([
          api.get("/api/subjects"),
          api.get("/api/universities"),
        ]);
        setSubjects(subjectsRes.data.data || []);
        setUniversities(unisRes.data.data || []);
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
      if (selectedUniversity) params.append("university_id", selectedUniversity);
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
  }, [selectedSubject, selectedUniversity, selectedYear, isElite]);

  if (pageLoading) {
    return <PageLoader />;
  }

  // Show locked feature for non-Elite users
  if (!isElite) {
    return (
      <LockedFeature
        featureName="Recalled UI-POSTUTME Questions"
        description="Access to questions confirmed to have appeared in past Post-UTME exams from your target university"
        currentPlan={profile?.subscription_status || "explorer"}
        icon="⭐"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">⭐</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-navy">
                Recalled UI-POSTUTME Questions
              </h1>
              <p className="text-gray-600 mt-2">
                Questions confirmed to have appeared in past Post-UTME exams
              </p>
            </div>
          </div>
          <div className="inline-block bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-semibold">
            Elite Exclusive
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-lg font-bold text-navy mb-4">Filter Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                University
              </label>
              <select
                value={selectedUniversity}
                onChange={(e) => setSelectedUniversity(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
              >
                <option value="">All Universities</option>
                {universities.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
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
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest"></div>
              </div>
              <p className="text-gray-600 mt-4">Loading questions...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <p className="text-gray-600 text-lg">
                No recalled questions found. Try adjusting your filters or check back soon!
              </p>
            </div>
          ) : (
            questions.map((question, idx) => (
              <div key={question.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-block bg-forest text-white px-3 py-1 rounded-full text-sm font-bold">
                        Q{idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {question.year}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        question.difficulty_level === 'hard' ? 'bg-red-100 text-red-800' :
                        question.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {question.difficulty_level}
                      </span>
                    </div>
                    <p className="text-base text-navy font-medium">{question.body}</p>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-2 mb-4">
                  {question.recalled_question_options.map((option) => (
                    <div
                      key={option.id}
                      className={`p-3 rounded-lg border-2 ${
                        option.is_correct
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-navy min-w-fit">{option.label}.</span>
                        <span className="text-gray-700">{option.body}</span>
                        {option.is_correct && (
                          <span className="text-green-600 font-bold ml-auto">✓ Correct</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                {question.explanation && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Explanation:</p>
                    <p className="text-sm text-blue-800">{question.explanation}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer CTA */}
        <div className="text-center mt-12">
          <Link
            href="/dashboard"
            className="inline-block text-forest font-semibold hover:underline transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
