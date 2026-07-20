"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import type { SessionHistoryItem } from "types";
import toast from "react-hot-toast";
import { Activity, ChevronLeft } from "lucide-react";

export default function SessionsHistoryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    const fetchSessions = async () => {
      try {
        const res = await api.get("/api/sessions/history");
        setSessions(res.data.data || []);
      } catch (error) {
        console.error("Failed to fetch session history:", error);
        toast.error("Failed to load practice sessions");
      } finally {
        setPageLoading(false);
      }
    };

    if (!loading && user) {
      fetchSessions();
    }
  }, [user, loading, router]);

  if (loading || pageLoading) {
    return <PageLoader message="Loading practice sessions..." />;
  }

  const getSessionType = (session: SessionHistoryItem) => {
    if (session.is_mock) return "Mock";
    if (session.is_hard_mode) return "Hard Mode";
    if (session.is_recalled) return "Recalled";
    return session.subject_name || "Individual";
  };

  const types = Array.from(new Set(sessions.map(getSessionType)));
  const displayedSessions = selectedType
    ? sessions.filter((s) => getSessionType(s) === selectedType)
    : sessions;

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-forest flex items-center gap-1 mb-4"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black text-navy flex items-center gap-2">
            <Activity className="w-7 h-7" /> Practice Sessions
          </h1>
          <p className="text-gray-600 mt-2">
            {displayedSessions.length} of {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-500 text-sm">
              No practice sessions yet. Start practicing to see your history here.
            </p>
          </div>
        ) : (
          <>
            {/* Type Filter */}
            <div className="mb-6 flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedType(null)}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  selectedType === null
                    ? "bg-forest text-white shadow-md"
                    : "bg-white text-navy border-2 border-gray-300 hover:border-forest"
                }`}
              >
                All ({sessions.length})
              </button>
              {types.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    selectedType === type
                      ? "bg-forest text-white shadow-md"
                      : "bg-white text-navy border-2 border-gray-300 hover:border-forest"
                  }`}
                >
                  {type} ({sessions.filter((s) => getSessionType(s) === type).length})
                </button>
              ))}
            </div>

            <div className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      University
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      Score
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      Questions
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSessions.map((session) => {
                    const sessionType = getSessionType(session);
                    const isMock = session.is_mock;

                    return (
                      <tr
                        key={session.id}
                        onClick={() =>
                          session.completed &&
                          router.push(`/practice/results?sessionId=${session.id}`)
                        }
                        className={`border-b hover:bg-gray-50 transition-colors ${
                          session.completed ? "cursor-pointer" : ""
                        }`}
                        title={session.completed ? "View correction" : "Session not completed"}
                      >
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center text-gray-900 gap-2">
                            {!isMock && (
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: session.subject_colour_token || "#666",
                                }}
                              />
                            )}
                            <span className="font-medium">{sessionType}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {session.university_short_code || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {session.completed ? (
                            <span
                              className={`font-semibold ${
                                session.percentage >= 50 ? "text-forest" : "text-red-600"
                              }`}
                            >
                              {session.percentage}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {session.total_questions || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(session.started_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              session.completed
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {session.completed ? "Completed" : "Incomplete"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
