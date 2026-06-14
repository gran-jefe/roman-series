"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import type { Subject, University } from "types";
import { TableRowSkeleton } from "@/components/skeletons";

interface LeaderboardEntry {
  rank: number;
  full_name: string;
  average_score: number;
  total_sessions: number;
  university_code: string | null;
  user_id: string;
  subscription_status: string | null;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedUniversity, setSelectedUniversity] = useState<string>("");
  const [pageLoading, setPageLoading] = useState(true);

  // Auth check
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Fetch leaderboard data
  useEffect(() => {
    if (loading || !user) return;

    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedSubject) params.append("subjectId", selectedSubject);
        if (selectedUniversity) params.append("universityId", selectedUniversity);

        const [leaderboardRes, subjectsRes, unisRes] = await Promise.allSettled([
          api.get(`/api/leaderboard?${params.toString()}`),
          api.get("/api/subjects"),
          api.get("/api/universities"),
        ]);

        if (leaderboardRes.status === "fulfilled") {
          setLeaderboard(leaderboardRes.value.data.data || []);
        }
        if (subjectsRes.status === "fulfilled") {
          setSubjects(subjectsRes.value.data.data || []);
        }
        if (unisRes.status === "fulfilled") {
          setUniversities(unisRes.value.data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
  }, [loading, user, selectedSubject, selectedUniversity]);

  const getRankBadge = (rank: number): string => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  const isCurrentUser = (userId: string): boolean => {
    return user?.id === userId;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-navy text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-forest rounded-full" />
            <h1 className="text-xl font-bold">Roman Series</h1>
          </Link>
          <div className="text-sm">Leaderboard</div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-navy mb-8">Leaderboard</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">
                Filter by Subject (Optional)
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy mb-2">
                Filter by University (Optional)
              </label>
              <select
                value={selectedUniversity}
                onChange={(e) => setSelectedUniversity(e.target.value)}
                className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest"
              >
                <option value="">All Universities</option>
                {universities.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {pageLoading ? (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-navy">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-navy">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-navy">
                    University
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-navy">
                    Avg Score
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-navy">
                    Sessions
                  </th>
                </tr>
              </thead>
              <tbody>
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
              </tbody>
            </table>
          ) : leaderboard.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-navy">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-navy">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-navy">
                    University
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-navy">
                    Avg Score
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-navy">
                    Sessions
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.user_id}
                    className={`border-b transition-colors ${
                      isCurrentUser(entry.user_id)
                        ? "bg-blush hover:bg-rose/20"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getRankBadge(entry.rank)}</span>
                        <span className="font-bold text-navy text-lg">
                          #{entry.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {entry.full_name}
                          {entry.subscription_status === "elite" && (
                            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                              ⭐ Elite
                            </span>
                          )}
                        </div>
                        {isCurrentUser(entry.user_id) && (
                          <div className="text-xs text-forest font-semibold">
                            You
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {entry.university_code || "—"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                        {entry.average_score}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-medium text-gray-700">
                      {entry.total_sessions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-600">
              <p>No leaderboard data yet. Come back after more users complete sessions!</p>
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition-opacity"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
