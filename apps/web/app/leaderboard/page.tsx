"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import type { Subject, University } from "types";
import { TableRowSkeleton } from "@/components/skeletons";
import {
  Trophy,
  Crown,
  Medal,
  ChevronLeft,
  Sparkles,
  GraduationCap,
  BookOpen,
  Filter,
  CheckCircle2,
  Award,
} from "lucide-react";

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

  const isCurrentUser = (userId: string): boolean => {
    return user?.id === userId;
  };

  const topThree = leaderboard.slice(0, 3);
  const remainingRankings = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-[#FAF7F4] text-slate-800">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Navigation Breadcrumb */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0D1B2A] transition mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider mb-2 border border-amber-200">
            <Trophy className="w-3.5 h-3.5 text-amber-600" /> High-Performance Honour Roll
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#0D1B2A] tracking-tight">
            National Aspirant Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            See how your practice test scores compare with top UTME & Post-UTME candidates nationwide.
          </p>
        </div>

        {/* Filters Bento */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm mb-8">
          <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#1A7A4A]" /> Filter Aspirants
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2.5 text-xs font-semibold text-slate-800 bg-[#FAF7F4] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
              >
                <option value="">All Subjects (Overall Rank)</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target University
              </label>
              <select
                value={selectedUniversity}
                onChange={(e) => setSelectedUniversity(e.target.value)}
                className="w-full px-4 py-2.5 text-xs font-semibold text-slate-800 bg-[#FAF7F4] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
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

        {/* Top 3 Podium (if data exists and not loading) */}
        {!pageLoading && topThree.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8 items-end">
            {/* 2nd Place (Silver) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 text-center shadow-sm order-1">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2 shadow-inner">
                <Medal className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">#2 Rank</p>
              <h4 className="text-xs sm:text-base font-black text-[#0D1B2A] truncate mt-1">
                {topThree[1].full_name}
              </h4>
              <p className="text-lg sm:text-2xl font-black text-[#0D1B2A] mt-1">
                {topThree[1].average_score}%
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                {topThree[1].total_sessions} Drills
              </span>
            </div>

            {/* 1st Place (Gold) */}
            <div className="bg-gradient-to-b from-amber-50 to-white rounded-3xl border-2 border-amber-300 p-5 sm:p-8 text-center shadow-md relative -translate-y-2 order-2">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Crown className="w-3 h-3" /> Champion
              </div>
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2 shadow-inner">
                <Trophy className="w-7 h-7 text-amber-500" />
              </div>
              <p className="text-xs font-black text-amber-700 uppercase tracking-wider">#1 Overall</p>
              <h4 className="text-sm sm:text-lg font-black text-[#0D1B2A] truncate mt-1">
                {topThree[0].full_name}
              </h4>
              <p className="text-2xl sm:text-3xl font-black text-[#1A7A4A] mt-1">
                {topThree[0].average_score}%
              </p>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100/70 text-amber-800">
                {topThree[0].total_sessions} Drills
              </span>
            </div>

            {/* 3rd Place (Bronze) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 text-center shadow-sm order-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-2 shadow-inner">
                <Award className="w-6 h-6 text-amber-700" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">#3 Rank</p>
              <h4 className="text-xs sm:text-base font-black text-[#0D1B2A] truncate mt-1">
                {topThree[2].full_name}
              </h4>
              <p className="text-lg sm:text-2xl font-black text-[#0D1B2A] mt-1">
                {topThree[2].average_score}%
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                {topThree[2].total_sessions} Drills
              </span>
            </div>
          </div>
        )}

        {/* Full Rankings Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          {pageLoading ? (
            <div className="p-6">
              <table className="w-full">
                <tbody>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </tbody>
              </table>
            </div>
          ) : leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#FAF7F4] border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Candidate</th>
                    <th className="px-6 py-4">Institution</th>
                    <th className="px-6 py-4 text-center">Average Accuracy</th>
                    <th className="px-6 py-4 text-center">Sessions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.map((entry) => {
                    const isUser = isCurrentUser(entry.user_id);

                    return (
                      <tr
                        key={entry.user_id}
                        className={`transition ${
                          isUser
                            ? "bg-emerald-50/70 hover:bg-emerald-100/60"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="px-6 py-4 font-black text-sm">
                          <span className="inline-flex items-center gap-1.5">
                            {entry.rank === 1 && <Trophy className="w-4 h-4 text-amber-500" />}
                            {entry.rank === 2 && <Medal className="w-4 h-4 text-slate-400" />}
                            {entry.rank === 3 && <Award className="w-4 h-4 text-amber-700" />}
                            <span className={entry.rank <= 3 ? "text-slate-900" : "text-slate-500"}>
                              #{entry.rank}
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{entry.full_name}</span>
                            {entry.subscription_status === "elite" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                                <Crown className="w-3 h-3 text-purple-600" />
                                Elite
                              </span>
                            )}
                            {isUser && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                          {entry.university_code || "General"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                              entry.average_score >= 70
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : entry.average_score >= 50
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {entry.average_score}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-600 text-xs">
                          {entry.total_sessions}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs sm:text-sm">
              <p>No leaderboard records found for the selected filters. Be the first to practice!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

