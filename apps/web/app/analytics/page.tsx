"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import type { AnalyticsOverview, TopicPerformance, PeerRanking, SessionHistoryItem, PredictionResult } from "types";
import toast from "react-hot-toast";

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [topics, setTopics] = useState<TopicPerformance[]>([]);
  const [peers, setPeers] = useState<PeerRanking | null>(null);
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const [overviewRes, topicsRes, peersRes, sessionsRes, predictionRes] = await Promise.all([
          api.get("/api/analytics/overview"),
          api.get("/api/analytics/topics"),
          api.get("/api/analytics/peers"),
          api.get("/api/sessions/history"),
          api.get("/api/analytics/prediction"),
        ]);

        setOverview(overviewRes.data.data);
        setTopics(topicsRes.data.data || []);
        setPeers(peersRes.data.data);
        setSessions(sessionsRes.data.data || []);
        setPrediction(predictionRes.data.data);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        toast.error("Failed to load analytics");
      } finally {
        setPageLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchAnalytics();
    }
  }, [user, authLoading, router]);

  if (pageLoading) {
    return <PageLoader message="Loading analytics..." />;
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-blush">
        <nav className="bg-navy text-white shadow-lg sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-forest flex items-center justify-center font-bold text-white text-sm">
                RS
              </div>
              <h1 className="text-lg font-bold">Roman Series</h1>
            </Link>
            <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white">
              Back to Dashboard
            </Link>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-gray-600 mb-4">No analytics data yet. Take some practice tests to get started!</p>
          <Link href="/dashboard" className="text-forest hover:underline font-medium">
            Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  const filteredTopics = selectedSubject
    ? topics.filter(t => t.subject_name === selectedSubject)
    : topics;

  const uniqueSubjects = Array.from(
    new Set(topics.map(t => t.subject_name))
  ).sort();

  const weakestTopic = filteredTopics.length > 0
    ? filteredTopics.reduce((min, t) => t.avg_percentage < min.avg_percentage ? t : min)
    : null;

  const strongestTopic = filteredTopics.length > 0
    ? filteredTopics.reduce((max, t) => t.avg_percentage > max.avg_percentage ? t : max)
    : null;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-blush">
      {/* Navbar */}
      <nav className="bg-navy text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest flex items-center justify-center font-bold text-white text-sm">
              RS
            </div>
            <h1 className="text-lg font-bold">Roman Series</h1>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white">
            Back to Dashboard
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-navy mb-2">Performance Analytics</h1>
          <p className="text-gray-600 text-sm">Your detailed performance insights and progress tracking</p>
        </div>

        {/* Overview Cards */}
        <div className="mb-12 grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Streak */}
          <div className="bg-white rounded-lg shadow-sm border-t-4 border-forest p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Streak</p>
            <p className="text-4xl font-bold text-navy mb-1">🔥 {overview.current_streak_days}</p>
            <p className="text-xs text-gray-500">days • Best: {overview.longest_streak_days}</p>
          </div>

          {/* Total Time */}
          <div className="bg-white rounded-lg shadow-sm border-t-4 border-forest p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Practice Time</p>
            <p className="text-3xl font-bold text-navy">{formatTime(overview.total_time_practiced_seconds)}</p>
            <p className="text-xs text-gray-500">{overview.avg_time_per_question_seconds}s per Q</p>
          </div>

          {/* Avg Score */}
          <div className="bg-white rounded-lg shadow-sm border-t-4 border-forest p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Avg Score</p>
            <p className="text-4xl font-bold text-navy">{overview.avg_score_overall}%</p>
            <p className="text-xs text-gray-500">{overview.total_sessions} sessions</p>
          </div>

          {/* Best Score */}
          <div className="bg-white rounded-lg shadow-sm border-t-4 border-forest p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Best Score</p>
            <p className="text-4xl font-bold text-navy">{overview.best_score_percentage}%</p>
            <p className="text-xs text-gray-500">Personal best</p>
          </div>

          {/* Questions */}
          <div className="bg-white rounded-lg shadow-sm border-t-4 border-forest p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Questions</p>
            <p className="text-4xl font-bold text-navy">{overview.total_questions_answered}</p>
            <p className="text-xs text-gray-500">answered</p>
          </div>
        </div>

        {/* Admission Prediction Section */}
        {prediction && prediction.status !== "no_data" && prediction.cutoff && (
          <div className="mb-12 bg-white rounded-lg shadow-md border-t-4 border-forest p-8">
            <h2 className="text-2xl font-bold text-navy mb-6">Admission Prediction</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {/* University & Course */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Target Course</p>
                <p className="text-lg font-bold text-navy">{prediction.cutoff.course}</p>
                <p className="text-xs text-gray-500 mt-1">Year {prediction.cutoff.year}</p>
              </div>

              {/* UTME Score */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Your UTME Score</p>
                <p className="text-2xl font-bold text-navy">{prediction.utme_score}/400</p>
                <p className={`text-xs font-semibold mt-1 ${
                  prediction.utme_qualifies ? "text-green-600" : "text-amber-600"
                }`}>
                  {prediction.utme_qualifies ? "✓ Qualifies" : "Below Cutoff"}
                </p>
              </div>

              {/* Post-UTME Target */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Post-UTME Target</p>
                <p className="text-2xl font-bold text-navy">{prediction.required_putme_score}%</p>
                <p className="text-xs text-gray-500 mt-1">to reach cutoff</p>
              </div>

              {/* Current Average */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Your Current Avg</p>
                <p className={`text-2xl font-bold ${
                  prediction.current_practice_avg >= prediction.required_putme_score
                    ? "text-green-600"
                    : "text-amber-600"
                }`}>
                  {prediction.current_practice_avg}%
                </p>
                <p className={`text-xs font-semibold mt-1 ${
                  prediction.current_practice_avg >= prediction.required_putme_score
                    ? "text-green-600"
                    : "text-amber-600"
                }`}>
                  {prediction.current_practice_avg >= prediction.required_putme_score
                    ? "✓ On Track"
                    : `⚠ ${prediction.required_putme_score - prediction.current_practice_avg}% gap`}
                </p>
              </div>
            </div>

            {/* Prediction Bar */}
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Predicted Score</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-3 bg-gray-300 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-forest transition-all"
                      style={{ width: `${Math.min((prediction.predicted_total / prediction.cutoff.combined_cutoff) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-navy">
                    {prediction.predicted_total.toFixed(1)}/{prediction.cutoff.combined_cutoff}
                  </p>
                  <p className="text-xs text-gray-500">
                    {prediction.predicted_total >= prediction.cutoff.combined_cutoff
                      ? "✓ On track for admission"
                      : "⚠ Below cutoff"}
                  </p>
                </div>
              </div>
            </div>

            {/* Advice */}
            {prediction.current_practice_avg < prediction.required_putme_score && (
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-amber-900 mb-1">📌 Recommendation</p>
                <p className="text-sm text-amber-800">
                  You need to improve your practice score from {prediction.current_practice_avg}% to {prediction.required_putme_score}% to reach the admission cutoff of {prediction.cutoff.combined_cutoff}/100.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column - Topic Performance */}
          <div className="lg:col-span-2 space-y-8">
            {/* Topic Performance Table */}
            <div>
              <h2 className="text-2xl font-bold text-navy mb-4">Topic Performance</h2>

              {/* Subject Filter */}
              {uniqueSubjects.length > 1 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedSubject(null)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedSubject === null
                        ? "bg-forest text-white shadow-md"
                        : "bg-white text-navy border-2 border-gray-300 hover:border-forest"
                    }`}
                  >
                    All Subjects ({topics.length})
                  </button>
                  {uniqueSubjects.map(subject => {
                    const subjectTopics = topics.filter(t => t.subject_name === subject);
                    const sampleTopic = subjectTopics[0];
                    return (
                      <button
                        key={subject}
                        onClick={() => setSelectedSubject(subject)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all border-2 ${
                          selectedSubject === subject
                            ? "text-white shadow-md"
                            : "text-gray-700 hover:border-opacity-100"
                        }`}
                        style={{
                          backgroundColor:
                            selectedSubject === subject
                              ? sampleTopic?.subject_colour_token
                              : "white",
                          borderColor:
                            selectedSubject === subject
                              ? sampleTopic?.subject_colour_token
                              : sampleTopic?.subject_colour_token + "40",
                        }}
                      >
                        {subject} ({subjectTopics.length})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Topics Table */}
              {filteredTopics.length > 0 ? (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Topic</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Questions</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Correct</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTopics.map((topic, idx) => (
                          <tr key={topic.topic_id} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: topic.subject_colour_token }}
                                />
                                <div>
                                  <p className="font-medium text-navy">{topic.topic_name}</p>
                                  <p className="text-xs text-gray-500">{topic.sessions_count} sessions</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-navy">{topic.total_answered}</td>
                            <td className="px-6 py-4 text-sm text-navy">{topic.correct}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full transition-all"
                                    style={{
                                      width: `${topic.avg_percentage}%`,
                                      backgroundColor: topic.subject_colour_token,
                                    }}
                                  />
                                </div>
                                <span className="w-12 text-right font-semibold text-navy">{topic.avg_percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <p className="text-gray-500">No topic data available yet</p>
                </div>
              )}
            </div>

            {/* Speed & Time Section */}
            <div>
              <h2 className="text-2xl font-bold text-navy mb-4">Speed & Time Analysis</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-md border-t-4 border-forest p-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Avg Time per Question</p>
                  <p className="text-3xl font-bold text-navy">{overview.avg_time_per_question_seconds}s</p>
                </div>
                <div className="bg-white rounded-lg shadow-md border-t-4 border-forest p-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Practice Time</p>
                  <p className="text-3xl font-bold text-navy">{formatTime(overview.total_time_practiced_seconds)}</p>
                </div>
              </div>

              {/* Recent Sessions */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="border-b px-6 py-4">
                  <h3 className="font-semibold text-navy">Recent Sessions</h3>
                </div>
                <div className="divide-y">
                  {sessions.slice(0, 5).map(session => (
                    <div key={session.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: session.subject_colour_token || "#666" }}
                          />
                          <span className="font-medium text-navy">{session.subject_name || "—"}</span>
                          {session.topic_name && <span className="text-xs text-gray-500">• {session.topic_name}</span>}
                        </div>
                        <span
                          className={`font-bold ${
                            session.percentage >= 50 ? "text-forest" : "text-red-600"
                          }`}
                        >
                          {session.percentage}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{session.total_questions} questions</span>
                        <span>{new Date(session.started_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Peer Ranking & Insights */}
          <div className="lg:col-span-1 space-y-6">
            {/* Peer Ranking */}
            {peers && (
              <div className="bg-white rounded-lg shadow-md border-t-4 border-forest p-6">
                <h3 className="text-lg font-bold text-navy mb-4">Your Rank</h3>
                <div className="text-center mb-6 p-4 bg-blush rounded-lg">
                  <p className="text-4xl font-bold text-navy mb-1">#{peers.rank}</p>
                  <p className="text-sm text-gray-600">of {peers.total_peers} peers</p>
                  <p className="text-xs text-gray-500 mt-2">Same course • {peers.my_avg}% avg</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Top Performers</p>
                  {peers.peers.slice(0, 5).map(peer => (
                    <div key={`${peer.rank}-${peer.name_initial}`} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-500">#{peer.rank}</span>
                        <span className={`text-sm font-medium ${peer.is_me ? "text-forest font-bold" : "text-navy"}`}>
                          {peer.name_initial}. {peer.is_me && "👈 You"}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-navy">{peer.avg_score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights Cards */}
            {strongestTopic && (
              <div className="bg-white rounded-lg shadow-md border-t-4 p-6" style={{ borderTopColor: strongestTopic.subject_colour_token }}>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Strongest Topic</p>
                <p className="text-xl font-bold text-navy mb-1">{strongestTopic.topic_name}</p>
                <p className="text-sm font-semibold mb-3" style={{ color: strongestTopic.subject_colour_token }}>
                  {strongestTopic.avg_percentage}% • {strongestTopic.subject_name}
                </p>
                <p className="text-xs text-gray-500">Keep this momentum! 🚀</p>
              </div>
            )}

            {weakestTopic && (
              <div className="bg-white rounded-lg shadow-md border-t-4 border-ember p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Needs Focus</p>
                <p className="text-xl font-bold text-navy mb-1">{weakestTopic.topic_name}</p>
                <p className="text-sm font-semibold text-ember mb-3">{weakestTopic.avg_percentage}% • {weakestTopic.subject_name}</p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full px-4 py-2 bg-ember text-white rounded-lg font-medium hover:shadow-md transition-all text-sm"
                >
                  Practice This Topic
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
