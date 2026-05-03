"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatCardSkeleton, SessionRowSkeleton } from "@/components/skeletons";
import { PageLoader } from "@/components/PageLoader";
import type { University, Subject, SessionHistoryItem, UserStats, ErrorBankQuestion } from "types";
import toast from "react-hot-toast";

interface Subscription {
  subscription_status: string;
}

interface SubjectWithCounts extends Subject {
  topic_count?: number;
  question_count?: number;
}

const subjectColours: Record<string, string> = {
  Biology: "#1A7A4A",
  Chemistry: "#8B2252",
  Physics: "#7B4F1A",
  Government: "#1E3A5F",
  Literature: "#C4522A",
  CRS: "#D97B20",
  IRS: "#B0287A",
};

export default function DashboardPage() {
  const router = useRouter();
  const { profile, logout } = useAuth();
  const [subjects, setSubjects] = useState<SubjectWithCounts[]>([]);
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [errorBank, setErrorBank] = useState<ErrorBankQuestion[]>([]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      console.log("[Dashboard] Token in storage:", token ? `${token.slice(0, 20)}...` : "MISSING");
      try {
        // Get user profile
        let userProfile = profile;
        try {
          const meRes = await api.get("/api/auth/me");
          userProfile = meRes.data.data.profile;
          setUserName(meRes.data.data.profile.full_name);
        } catch {
          // Use profile from context if available
          if (profile?.full_name) {
            setUserName(profile.full_name);
          }
        }

        // Guard: redirect to onboarding if no subject combination
        if (!userProfile?.subject_combination?.length) {
          router.push("/onboarding");
          return;
        }

        // Get user's target university
        if (userProfile?.target_university_id) {
          // Fetch all universities to find the user's selected one
          const uniRes = await api.get("/api/universities");
          const allUniversities = uniRes.data.data || [];
          const userUni = allUniversities.find(
            (uni: University) => uni.id === userProfile.target_university_id
          );

          if (userUni) {
            setSelectedUniversity(userUni);

            // Get subjects for user's university
            const subjectsRes = await api.get(
              `/api/subjects?universityId=${userProfile.target_university_id}`
            );
            const allSubjects = subjectsRes.data.data || [];
            // Filter to only show user's selected subjects
            const userSubjects = allSubjects.filter((s: Subject) =>
              userProfile.subject_combination?.includes(s.id)
            );
            setSubjects(userSubjects);
          }
        }

        // Get user stats
        try {
          const statsRes = await api.get("/api/stats/me");
          setStats(statsRes.data.data);
        } catch {
          // Stats endpoint error - continue without it
        }

        // Get session history
        try {
          const sessionRes = await api.get("/api/sessions/history");
          setSessions(sessionRes.data.data || []);
        } catch {
          // Sessions endpoint error - continue without it
        }

        // Get subscription status (optional)
        try {
          const subRes = await api.get("/api/payments/status");
          setSubscription(subRes.data.data);
        } catch {
          // Subscription endpoint error - continue without it
        }

        // Get error bank questions (optional)
        try {
          const errorRes = await api.get("/api/sessions/wrong-questions");
          setErrorBank(errorRes.data.data?.questions || []);
        } catch {
          // Error bank endpoint error - continue without it
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        if (error instanceof Error) {
          console.error("Error details:", error.message);
        }
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  const handleSelectSubject = (subject: Subject) => {
    if (!selectedUniversity) return;
    router.push(
      `/practice/topics?subjectId=${subject.id}&universityId=${selectedUniversity.id}`
    );
  };

  if (loading) {
    return <PageLoader message="Loading dashboard..." />;
  }

  const subscriptionBadge =
    subscription?.subscription_status === "active"
      ? { label: "Pro", colour: "bg-green-100 text-green-800" }
      : { label: `Free (${3 - (sessions.length % 3)}/3)`, colour: "bg-amber-100 text-amber-800" };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-navy text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Roman Series</h1>
          <div className="flex items-center gap-4">
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${subscriptionBadge.colour}`}>
              {subscriptionBadge.label}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm">{profile?.full_name || "User"}</span>
              <button
                onClick={() => logout()}
                className="text-sm text-gray-200 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-navy mb-8">
            Welcome back, {userName ? userName.split(" ")[0] : "User"}
          </h2>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            {stats ? (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
                  <p className="text-2xl font-bold text-forest">{stats.total_sessions}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Average Score</p>
                  <p className="text-2xl font-bold text-forest">
                    {stats.avg_score_by_subject.length > 0
                      ? Math.round(
                          stats.avg_score_by_subject.reduce((sum, s) => sum + s.avg_percentage, 0) /
                            stats.avg_score_by_subject.length
                        )
                      : 0}
                    %
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Best Score</p>
                  <p className="text-2xl font-bold text-forest">{stats.best_score_percentage}%</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Questions Answered</p>
                  <p className="text-2xl font-bold text-forest">{stats.total_questions_answered}</p>
                </div>
              </>
            ) : (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            )}
          </div>
        </div>

        {/* University & Course Section */}
        {selectedUniversity && (
          <div className="mb-12 bg-blush rounded-lg shadow-lg p-8 border-2 border-forest">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-navy mb-4">Your Target University</h3>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-sm text-rose mb-2">University</p>
                    <p className="text-2xl font-bold text-forest mb-1">{selectedUniversity.name}</p>
                    <p className="text-sm text-gray-500">{selectedUniversity.short_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-rose mb-2">Course of Study</p>
                    <p className="text-2xl font-bold text-forest">{profile?.target_course}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <svg
                  className="w-12 h-12 text-forest mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Mock Exam Section */}
        {selectedUniversity && (
          <div className="mb-12">
            <h3 className="text-xl font-bold text-navy mb-6">Mock UTME Exam</h3>
            <div className={`rounded-lg shadow-lg p-8 border-l-4 transition-all ${
              subscription?.subscription_status === "free"
                ? "bg-gray-100 border-gray-400 opacity-60"
                : "bg-white border-forest hover:shadow-xl"
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-navy mb-2">Full Mock Exam</h4>
                  <p className="text-gray-600 mb-4">Take a complete UTME-style mock exam with 4 subjects and 100 questions</p>
                  {subscription?.subscription_status === "free" && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                      <p className="text-sm font-semibold text-amber-900">🔒 Unlock with Pro Plan</p>
                      <p className="text-xs text-amber-800 mt-1">Mock exams are available for paid subscribers. Upgrade now to access full mock UTME exams.</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Subjects</p>
                      <p className="text-2xl font-bold text-forest">{subjects.length}</p>
                      <p className="text-xs text-gray-500">{subjects.map(s => s.name).join(", ")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Questions</p>
                      <p className="text-2xl font-bold text-forest">{subjects.length * 25}</p>
                      <p className="text-xs text-gray-500">25 per subject</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Duration</p>
                      <p className="text-2xl font-bold text-forest">90 min</p>
                      <p className="text-xs text-gray-500">Standard UTME time</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (subscription?.subscription_status === "free") {
                      router.push("/pricing");
                    } else {
                      router.push("/practice/mock/session");
                    }
                  }}
                  disabled={subscription?.subscription_status === "free"}
                  className={`px-8 py-3 rounded-lg font-medium whitespace-nowrap transition-opacity ${
                    subscription?.subscription_status === "free"
                      ? "bg-gray-400 text-white cursor-not-allowed opacity-50"
                      : "bg-forest text-white hover:bg-opacity-90"
                  }`}
                >
                  {subscription?.subscription_status === "free" ? "Upgrade to Unlock" : "Start Mock Exam"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subjects Section */}
        {selectedUniversity && (
          <div id="subjects-section" className="mb-12 animate-fadeIn">
            <h3 className="text-xl font-bold text-navy mb-6">
              Select Subject — {selectedUniversity.short_code}
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {subjects.map(subject => (
                <div
                  key={subject.id}
                  onClick={() => handleSelectSubject(subject)}
                  className="rounded-lg p-6 text-white cursor-pointer shadow hover:shadow-lg transition-all"
                  style={{ backgroundColor: subjectColours[subject.name] || "#7B68EE" }}
                >
                  <h4 className="font-bold mb-2">{subject.name}</h4>
                 
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {loading ? (
          <div className="mt-12">
            <h3 className="text-xl font-bold text-navy mb-6">Recent Practice Sessions</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Subject</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Topic</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">University</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Score</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Date</th>
                  </tr>
                </thead>
                <tbody>
                  <SessionRowSkeleton />
                  <SessionRowSkeleton />
                  <SessionRowSkeleton />
                </tbody>
              </table>
            </div>
          </div>
        ) : sessions.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-navy">Recent Practice Sessions</h3>
              <a href="#" className="text-forest font-medium text-sm hover:underline">
                View All
              </a>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Subject</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Topic</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">University</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Score</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 5).map(session => (
                    <tr key={session.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm">
                        <div className="flex items-center text-gray-900 gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: session.subject_colour_token || "#666" }}
                          />
                          {session.subject_name}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {session.topic_name || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {session.university_short_code}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={`font-semibold ${
                            session.percentage >= 50 ? "text-forest" : "text-red-600"
                          }`}
                        >
                          {session.percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {new Date(session.started_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error Bank Entry Card */}
        {errorBank.length > 0 && (
          <div className="mt-12">
            <button
              onClick={() => router.push("/error-bank")}
              className="w-full bg-gradient-to-br from-ember to-red-700 rounded-lg shadow-lg p-8 text-white hover:shadow-xl transition-shadow text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-red-100 mb-2">Error Bank</p>
                  <h4 className="text-4xl font-bold mb-2">{errorBank.length}</h4>
                  <p className="text-red-50">Questions to review</p>
                </div>
                <svg className="w-16 h-16 text-red-200 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </button>
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
