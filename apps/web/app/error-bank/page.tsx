"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import type { ErrorBankQuestion } from "types";
import toast from "react-hot-toast";

export default function ErrorBankPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [questions, setQuestions] = useState<ErrorBankQuestion[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

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
        <nav className="bg-navy text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-forest rounded-full" />
              <h1 className="text-xl font-bold">Roman Series</h1>
            </Link>
            <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white">
              Back to Dashboard
            </Link>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-600 mb-4">No questions in your error bank yet</p>
          <Link href="/dashboard" className="text-forest hover:underline">
            Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  // Group by subject
  const bySubject = new Map<string, ErrorBankQuestion[]>();
  questions.forEach(q => {
    if (!bySubject.has(q.subject_name)) {
      bySubject.set(q.subject_name, []);
    }
    bySubject.get(q.subject_name)!.push(q);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-navy text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-forest rounded-full" />
            <h1 className="text-xl font-bold">Roman Series</h1>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white">
            Back to Dashboard
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-navy mb-2">Error Bank</h1>
          <p className="text-gray-600">
            {questions.length} question{questions.length !== 1 ? 's' : ''} to review
          </p>
        </div>

        {/* Retry All Button */}
        <button
          onClick={() => {
            router.push(`/practice/error-bank?questions=${questions.map(q => q.id).join(',')}`);
          }}
          className="w-full mb-8 px-6 py-4 bg-forest text-white rounded-lg font-semibold hover:bg-opacity-90 transition-opacity text-lg"
        >
          Practice All ({questions.length} questions)
        </button>

        {/* By Subject Sections */}
        <div className="space-y-8">
          {Array.from(bySubject.entries()).map(([subjectName, subjectQuestions]) => (
            <div key={subjectName}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: subjectQuestions[0]?.subject_colour_token || "#666" }}
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
                  backgroundColor: (subjectQuestions[0]?.subject_colour_token || "#666") + "20",
                  color: subjectQuestions[0]?.subject_colour_token || "#666",
                  border: `2px solid ${subjectQuestions[0]?.subject_colour_token || "#666"}`,
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
      </main>
    </div>
  );
}
