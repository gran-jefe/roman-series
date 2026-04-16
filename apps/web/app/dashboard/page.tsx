"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import type {
  SubjectWithCount,
  SessionHistoryItem,
  UserStats,
} from "types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading, logout } = useAuth();

  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionHistoryItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // Check auth and redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Fetch dashboard data
  useEffect(() => {
    if (loading || !user || !profile) {
      return;
    }

    const fetchData = async () => {
      try {
        const [subjectsRes, historyRes, statsRes] = await Promise.allSettled([
          api.get(
            `/api/subjects${
              profile.target_university_id
                ? `?universityId=${profile.target_university_id}`
                : ""
            }`
          ),
          api.get("/api/sessions/history"),
          api.get("/api/stats/me"),
        ]);

        if (subjectsRes.status === "fulfilled") {
          setSubjects(subjectsRes.value.data.data || []);
        }
        if (historyRes.status === "fulfilled") {
          setRecentSessions(historyRes.value.data.data?.slice(0, 5) || []);
        }
        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value.data.data || null);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
  }, [loading, user, profile]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Subject color class mapping
  const SUBJECT_COLOUR_CLASSES: Record<string, string> = {
    Biology: "bg-biology",
    Government: "bg-government",
    Chemistry: "bg-chemistry",
    Literature: "bg-literature",
    CRS: "bg-crs",
    IRS: "bg-irs",
    English: "bg-english",
    Physics: "bg-physics",
  };

  const getSubjectColourClass = (subjectName: string): string => {
    return SUBJECT_COLOUR_CLASSES[subjectName] || "bg-navy";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-navy text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-forest rounded-full" />
            <h1 className="text-xl font-bold">Roman Series</h1>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-sm text-gray-300">
              Welcome, {profile?.full_name || "Student"}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-forest hover:bg-opacity-90 rounded-lg text-sm font-medium transition-opacity"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-navy mb-2">
            Welcome back, {profile?.full_name || "Student"}!
          </h2>
          <p className="text-gray-600">
            You're logged in and ready to start preparing for your Post-UTME
            exams.
          </p>
          {profile?.target_university_id && (
            <div className="mt-4 inline-block">
              <span className="inline-block bg-deep-blue text-white px-3 py-1 rounded-full text-sm font-medium">
                Target University Selected
              </span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-forest">
              {stats?.total_sessions || 0}
            </div>
            <p className="text-gray-600 text-sm mt-2">Total Sessions</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-english">
              {stats?.best_score_percentage || 0}%
            </div>
            <p className="text-gray-600 text-sm mt-2">Best Score</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-chemistry">
              {stats?.total_questions_answered || 0}
            </div>
            <p className="text-gray-600 text-sm mt-2">Questions Answered</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-literature">
              {stats?.avg_score_by_subject && stats.avg_score_by_subject.length > 0
                ? Math.round(
                    stats.avg_score_by_subject.reduce(
                      (sum, s) => sum + s.avg_percentage,
                      0
                    ) / stats.avg_score_by_subject.length
                  )
                : 0}
              %
            </div>
            <p className="text-gray-600 text-sm mt-2">Avg Score</p>
          </div>
        </div>

        {/* Subject Grid */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-navy mb-4">
            Select a Subject to Practice
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {subjects.length > 0 ? (
              subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() =>
                    router.push(`/practice/setup?subjectId=${subject.id}`)
                  }
                  className={`${getSubjectColourClass(
                    subject.name
                  )} text-white rounded-lg shadow-md p-6 hover:scale-105 transition-transform duration-200 text-left`}
                >
                  <h4 className="text-lg font-bold mb-2">{subject.name}</h4>
                  <p className="text-sm opacity-90">
                    {subject.question_count} questions
                  </p>
                </button>
              ))
            ) : (
              <div className="col-span-full bg-white rounded-lg shadow p-8 text-center text-gray-600">
                No subjects available yet. Please check back later.
              </div>
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        <div>
          <h3 className="text-2xl font-bold text-navy mb-4">Recent Sessions</h3>
          {recentSessions.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                      University
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map((session) => (
                    <tr key={session.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {session.subject_name || "N/A"}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {session.university_name || "N/A"}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            session.percentage >= 50
                              ? "bg-green-100 text-forest"
                              : "bg-red-100 text-ember"
                          }`}
                        >
                          {session.percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {new Date(session.started_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <Link
                          href={`/practice/results?sessionId=${session.id}`}
                          className="text-forest hover:underline font-medium"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              No sessions yet. Start practicing to see your history here!
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
