"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { University, Subject, SessionHistoryItem, UserStats } from "types";
import toast from "react-hot-toast";

interface Subscription {
  subscription_status: string;
}

const subjectColours: Record<string, string> = {
  Biology: "#1A7A4A",
  Chemistry: "#8B2252",
  Physics: "#7B4F1A",
  Government: "#1E3A5F",
  Literature: "#C4522A",
  "Use of English": "#2166B2",
  "C.R.S.": "#D97B20",
  "I.R.S.": "#B0287A",
};

export default function DashboardPage() {
  const router = useRouter();
  const { profile, logout } = useAuth();
  const [universities, setUniversities] = useState<University[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [userName, setUserName] = useState<string>("");

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      console.log("[Dashboard] Token in storage:", token ? `${token.slice(0, 20)}...` : "MISSING");
      try {
        // Get user name
        try {
          const meRes = await api.get("/api/auth/me");
          setUserName(meRes.data.data.profile.full_name);
        } catch {
          // Use profile from context if available
          if (profile?.full_name) {
            setUserName(profile.full_name);
          }
        }

        // Get universities
        const uniRes = await api.get("/api/universities");
        setUniversities(uniRes.data.data || []);

        // Get subjects
        const subjectsRes = await api.get("/api/subjects?universityId=" + (uniRes.data.data?.[0]?.id || ""));
        setSubjects(subjectsRes.data.data || []);

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
  }, []);

  const handleSelectUniversity = (university: University) => {
    if (!university.is_available) return;
    setSelectedUniversity(university);

    // Scroll to subjects section
    setTimeout(() => {
      const element = document.getElementById("subjects-section");
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    // Fetch subjects for this university
    api
      .get(`/api/subjects?universityId=${university.id}`)
      .then(res => setSubjects(res.data.data || []))
      .catch(() => toast.error("Failed to load subjects"));
  };

  const handleSelectSubject = (subject: Subject) => {
    if (!selectedUniversity) return;
    router.push(
      `/practice/topics?subjectId=${subject.id}&universityId=${selectedUniversity.id}`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const subscriptionBadge =
    subscription?.subscription_status === "active"
      ? { label: "Pro", colour: "bg-green-100 text-green-800" }
      : { label: `Free (${10 - (sessions.length % 10)}/10)`, colour: "bg-amber-100 text-amber-800" };

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
          {stats && (
            <div className="grid grid-cols-4 gap-4">
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
            </div>
          )}
        </div>

        {/* Universities Section */}
        <div className="mb-12">
          <h3 className="text-xl font-bold text-navy mb-6">Select University</h3>
          <div className="grid grid-cols-3 gap-6">
            {universities.map(uni => (
              <div
                key={uni.id}
                onClick={() => handleSelectUniversity(uni)}
                className={`rounded-lg p-6 cursor-pointer transition-all ${
                  uni.is_available
                    ? "bg-white shadow hover:shadow-lg border-2 border-forest"
                    : "bg-gray-200 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-navy mb-2">{uni.name}</h4>
                    <p className="text-sm text-gray-600">{uni.short_code}</p>
                  </div>
                  {!uni.is_available && (
                    <div className="text-right">
                      <p className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-semibold mb-2">
                        Coming Soon
                      </p>
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm0 2a3 3 0 013 3v2H7V7a3 3 0 013-3z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

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
                  <div className="text-sm opacity-90">
                    <p>Topics: N/A</p>
                    <p>Questions: N/A</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
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
                            session.percentage >= 50 ? "text-green-600" : "text-red-600"
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
