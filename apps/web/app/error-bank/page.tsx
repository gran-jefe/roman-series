"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import type { ErrorBankQuestion } from "types";
import toast from "react-hot-toast";

// Color mapping for subjects
const SUBJECT_COLORS: Record<string, string> = {
  "Biology": "#1A7A4A",
  "Government": "#1E3A5F",
  "Chemistry": "#8B2252",
  "Literature": "#C4522A",
  "CRS": "#D97B20",
  "IRS": "#B0287A",
  "English": "#2166B2",
  "Physics": "#7B4F1A",
};

const getSubjectColor = (subjectName: string): string => {
  return SUBJECT_COLORS[subjectName] || "#666666";
};

export default function ErrorBankPage() {
  const router = useRouter();
  const { user, loading, profile } = useAuth();
  const { checkErrorBankAccess } = useFeatureAccess();
  const [questions, setQuestions] = useState<ErrorBankQuestion[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const errorBankAccess = checkErrorBankAccess();
  const isLimited = errorBankAccess.currentLimit && errorBankAccess.currentLimit > 0;
  const limitedQuestions = isLimited
    ? questions.slice(0, errorBankAccess.currentLimit)
    : questions;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    const fetchErrorBank = async () => {
      try {
        const res = await api.get("/api/sessions/wrong-questions");
        setQuestions(res.data.data?.questions || []);
      } catch (error) {
        console.error("Failed to fetch error bank:", error);
        toast.error("Failed to load error bank");
      } finally {
        setPageLoading(false);
      }
    };

    if (!loading && user) {
      fetchErrorBank();
    }
  }, [user, loading, router]);

  if (pageLoading) {
    return <PageLoader message="Loading error bank..." />;
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
      
        <main className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-600 mb-4">No questions in your error bank yet</p>
          <Link href="/dashboard" className="text-forest hover:underline">
            Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  // Check if user has access to error bank
  if (!errorBankAccess.hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <main className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-600 mb-4">{errorBankAccess.reason}</p>
          <Link href="/pricing" className="text-forest font-medium hover:underline">
            Get Elite Access
          </Link>
        </main>
      </div>
    );
  }

  // Group by subject (using limited questions if applicable)
  const bySubject = new Map<string, ErrorBankQuestion[]>();
  limitedQuestions.forEach(q => {
    if (!bySubject.has(q.subject_name)) {
      bySubject.set(q.subject_name, []);
    }
    bySubject.get(q.subject_name)!.push(q);
  });

  // Get unique subjects with their color
  const subjects = Array.from(bySubject.entries()).map(([name, qs]) => ({
    name,
    count: qs.length,
    colour: getSubjectColor(name),
  }));

  // Filter questions based on selected subject
  const displayedQuestions = selectedSubject
    ? limitedQuestions.filter(q => q.subject_name === selectedSubject)
    : limitedQuestions;

  // Filter by subject for display
  const displayBySubject = new Map<string, ErrorBankQuestion[]>();
  displayedQuestions.forEach(q => {
    if (!displayBySubject.has(q.subject_name)) {
      displayBySubject.set(q.subject_name, []);
    }
    displayBySubject.get(q.subject_name)!.push(q);
  });

  return (
    <div className="min-h-screen bg-gray-50">
    

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-navy mb-2">Error Bank</h1>
          <p className="text-gray-600">
            {displayedQuestions.length} of {questions.length} question{questions.length !== 1 ? 's' : ''} to review
          </p>
          {isLimited && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Explorer Plan:</strong> You can view your {errorBankAccess.currentLimit} most recent errors.{" "}
                <button
                  onClick={() => setShowUpgradePrompt(true)}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Get Elite Access
                </button>{" "}
                to access unlimited error history.
              </p>
            </div>
          )}
        </div>

        {/* Subject Filter Buttons */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedSubject(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedSubject === null
                ? "bg-forest text-white shadow-md"
                : "bg-white text-navy border-2 border-gray-300 hover:border-forest"
            }`}
          >
            All Subjects ({questions.length})
          </button>
          {subjects.map(subject => (
            <button
              key={subject.name}
              onClick={() => setSelectedSubject(subject.name)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedSubject === subject.name
                  ? "text-white shadow-md"
                  : "border-2 text-gray-700 hover:border-opacity-100"
              }`}
              style={{
                backgroundColor:
                  selectedSubject === subject.name
                    ? subject.colour
                    : "white",
                borderColor:
                  selectedSubject === subject.name
                    ? subject.colour
                    : subject.colour + "40",
              }}
            >
              {subject.name} ({subject.count})
            </button>
          ))}
        </div>

        {/* Retry All Button */}
        <button
          onClick={() => {
            router.push(`/practice/error-bank?questions=${displayedQuestions.map(q => q.id).join(',')}`);
          }}
          className="w-full mb-8 px-6 py-4 bg-forest text-white rounded-lg font-semibold hover:bg-opacity-90 transition-opacity text-lg"
        >
          Practice {selectedSubject ? selectedSubject : "All"} ({displayedQuestions.length} question{displayedQuestions.length !== 1 ? 's' : ''})
        </button>

        {/* By Subject Sections */}
        {displayBySubject.size === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No questions in {selectedSubject}</p>
          </div>
        ) : (
        <div className="space-y-8">
          {Array.from(displayBySubject.entries()).map(([subjectName, subjectQuestions]) => (
            <div key={subjectName}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: getSubjectColor(subjectName) }}
                />
                <h2 className="text-2xl font-bold text-navy">
                  {subjectName} ({subjectQuestions.length})
                </h2>
              </div>

              {/* Retry Subject Button */}
              <button
                onClick={() => {
                  router.push(
                    `/practice/error-bank?questions=${subjectQuestions.map(q => q.id).join(',')}`
                  );
                }}
                className="mb-4 px-4 py-2 rounded-lg font-medium transition-opacity"
                style={{
                  backgroundColor: getSubjectColor(subjectName) + "20",
                  color: getSubjectColor(subjectName),
                  border: `2px solid ${getSubjectColor(subjectName)}`,
                }}
              >
                Retry {subjectName} ({subjectQuestions.length} questions)
              </button>

              {/* Questions List */}
              <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                          Question
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                          Times Wrong
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                          Last Seen
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectQuestions.map((q, idx) => (
                        <tr key={q.id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="max-w-md truncate">{q.body}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 font-semibold">
                              {q.times_wrong}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(q.last_seen_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </main>

      {/* Upgrade Prompt */}
      {showUpgradePrompt && (
        <UpgradePrompt
          title="Unlock Full Error Bank"
          message="Explorer users can view their 10 most recent errors. Elite access unlocks your entire error history, helping you focus on your weakest areas."
          feature="Unlimited Error History"
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
}
