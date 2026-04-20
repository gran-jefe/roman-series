"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import type {
  SubjectWithCount,
  SessionHistoryItem,
  UserStats,
  University,
} from "types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading, logout } = useAuth();

  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionHistoryItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<string>("all");
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
        const [subjectsRes, historyRes, statsRes, unisRes] =
          await Promise.allSettled([
            api.get(
              `/api/subjects${
                profile.target_university_id && selectedUniversity === "all"
                  ? `?universityId=${profile.target_university_id}`
                  : selectedUniversity !== "all"
                    ? `?universityId=${selectedUniversity}`
                    : ""
              }`
            ),
            api.get("/api/sessions/history"),
            api.get("/api/stats/me"),
            api.get("/api/universities"),
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
        if (unisRes.status === "fulfilled") {
          setUniversities(unisRes.value.data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
  }, [loading, user, profile, selectedUniversity]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  };

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
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

  const SUBJECT_COLOUR_HEX: Record<string, string> = {
    Biology: "#1A7A4A",
    Government: "#1E3A5F",
    Chemistry: "#8B2252",
    Literature: "#C4522A",
    CRS: "#D97B20",
    IRS: "#B0287A",
    English: "#2166B2",
    Physics: "#7B4F1A",
  };

  const getSubjectColourClass = (subjectName: string): string => {
    return SUBJECT_COLOUR_CLASSES[subjectName] || "bg-navy";
  };

  const getSubjectColourHex = (subjectName: string): string => {
    return SUBJECT_COLOUR_HEX[subjectName] || "#0D1B2A";
  };

  // Calculate average score for a subject
  const getSubjectAverage = (subjectId: string): number => {
    const subject = stats?.avg_score_by_subject?.find(
      (s) => s.subject_id === subjectId
    );
    return subject?.avg_percentage ?? 0;
  };

  const overallAverage =
    stats?.avg_score_by_subject && stats.avg_score_by_subject.length > 0
      ? Math.round(
          stats.avg_score_by_subject.reduce(
            (sum, s) => sum + s.avg_percentage,
            0
          ) / stats.avg_score_by_subject.length
        )
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-navy text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-forest rounded-full" />
            <h1 className="text-xl font-bold">Roman Series</h1>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/leaderboard"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Leaderboard
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Upgrade
            </Link>
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
      <main className="max-w-7xl mx-auto px-4 py-8">
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

        {/* Free User Banner */}
        {profile?.subscription_status === "free" && (
          <div className="mb-8 bg-amber-50 border-l-4 border-amber-400 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">
                  Free Plan Limit Reached
                </h3>
                <p className="text-sm text-amber-800">
                  You've used 10 of your free questions. Upgrade to unlimited access across all subjects and universities.
                </p>
              </div>
              <Link
                href="/pricing"
                className="px-6 py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition-opacity whitespace-nowrap ml-4"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-forest">
              {stats?.total_sessions || 0}
            </div>
            <p className="text-gray-600 text-sm mt-2">Total Sessions</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-forest">
              {overallAverage}%
            </div>
            <p className="text-gray-600 text-sm mt-2">Average Score</p>
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
        </div>

        {/* Performance Section */}
        {stats?.avg_score_by_subject && stats.avg_score_by_subject.length > 0 && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-navy">Your Performance</h3>
            </div>

            {/* Subject bars */}
            <div className="space-y-4">
              {stats.avg_score_by_subject.map((subject) => (
                <div key={subject.subject_id}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {subject.subject_name}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {subject.avg_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${subject.avg_percentage}%`,
                        backgroundColor: getSubjectColourHex(
                          subject.subject_name
                        ),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* University Filter */}
        {universities.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-navy mb-3">
              Filter by University
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedUniversity("all")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedUniversity === "all"
                    ? "bg-forest text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:border-forest"
                }`}
              >
                All Universities
              </button>
              {universities.map((uni) => (
                <button
                  key={uni.id}
                  onClick={() => setSelectedUniversity(uni.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedUniversity === uni.id
                      ? "bg-forest text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:border-forest"
                  }`}
                >
                  {uni.short_code}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subject Grid */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-navy mb-4">
            Select a Subject to Practice
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {subjects.length > 0 ? (
              subjects.map((subject) => {
                const avgScore = getSubjectAverage(subject.id);
                return (
                  <button
                    key={subject.id}
                    onClick={() =>
                      router.push(`/practice/setup?subjectId=${subject.id}`)
                    }
                    className={`${getSubjectColourClass(
                      subject.name
                    )} text-white rounded-lg shadow-md p-6 hover:scale-105 transition-transform duration-200 text-left relative`}
                  >
                    {avgScore > 0 && (
                      <div className="absolute top-3 right-3 bg-white bg-opacity-90 text-navy rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold">
                        {avgScore}%
                      </div>
                    )}
                    <h4 className="text-lg font-bold mb-2">{subject.name}</h4>
                    <p className="text-sm opacity-90">
                      {avgScore > 0
                        ? `${subject.question_count} questions`
                        : "No attempts yet"}
                    </p>
                    {avgScore === 0 && (
                      <div className="mt-3 h-1 bg-white bg-opacity-30 rounded-full" />
                    )}
                  </button>
                );
              })
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
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: getSubjectColourHex(
                                session.subject_name || ""
                              ),
                            }}
                          />
                          {session.subject_name || "N/A"}
                        </div>
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
                        {formatDate(session.started_at)}
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
            <EmptyState message="No sessions yet. Start your first practice!" />
          )}
        </div>
      </main>
    </div>
  );
}
