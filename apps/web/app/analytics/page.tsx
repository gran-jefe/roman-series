"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import type { AnalyticsOverview, TopicPerformance, SessionHistoryItem, PredictionResult } from "types";
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

const getMasteryLabel = (percentage: number): { label: string; color: string } => {
  if (percentage < 40) {
    return { label: "Beginner", color: "bg-red-100 text-red-700" };
  } else if (percentage < 60) {
    return { label: "Developing", color: "bg-amber-100 text-amber-700" };
  } else if (percentage < 80) {
    return { label: "Proficient", color: "bg-blue-100 text-blue-700" };
  } else {
    return { label: "Mastered", color: "bg-green-100 text-green-700" };
  }
};

interface LeaderboardData {
  rankings: Array<{
    rank: number;
    name_initial: string;
    avg_score: number;
    sessions_count: number;
    is_current_user: boolean;
  }>;
  window: "weekly" | "overall";
  scope: "global" | "cohort";
  is_truncated: boolean;
  current_user_rank: number | null;
  total_participants: number;
  resets_at: string | null;
  percentile?: {
    percentile: number;
    message: string;
  };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { checkAnalyticsAccess } = useFeatureAccess();
  const analyticsAccess = checkAnalyticsAccess();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [topics, setTopics] = useState<TopicPerformance[]>([]);
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [nextGenerationAt, setNextGenerationAt] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [leaderboardWindow, setLeaderboardWindow] = useState<"weekly" | "overall">("overall");
  const [leaderboardScope, setLeaderboardScope] = useState<"global" | "cohort">("global");
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [speedData] = useState<Array<{ topic_id: string; topic_name: string; subject_name: string; avg_seconds: number; total_answered: number }> | null>(null);
  const [studyPlan, setStudyPlan] = useState<Array<{
    priority: number;
    topic_name: string;
    subject_name: string;
    current_mastery: number;
    target_mastery: number;
    urgency: "critical" | "high" | "medium" | "low";
    reason: string;
    study_actions: string[];
    estimated_hours: number;
    quick_tip: string;
  }> | null>(null);
  const [studyPlanSummary, setStudyPlanSummary] = useState<{ generated_at: string; next_available_at: string; from_cache?: boolean } | null>(null);
  const [studyPlanLoading, setStudyPlanLoading] = useState(false);
  const [nextPlanAvailable, setNextPlanAvailable] = useState<Date | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const requests = [
          api.get("/api/analytics/overview"),
          api.get("/api/analytics/topics"),
          api.get("/api/sessions/history"),
          api.get("/api/analytics/prediction"),
        ];

        // Load study plan for elite users
        if (profile?.subscription_status === "elite") {
          requests.push(api.get("/api/analytics/study-plan"));
        }

        const results = await Promise.all(requests);

        setOverview(results[0].data.data);
        setTopics(results[1].data.data || []);
        setSessions(results[2].data.data || []);
        setPrediction(results[3].data.data);

        // Handle study plan if elite
        if (profile?.subscription_status === "elite" && results[4]) {
          const studyPlanData = results[4].data.data;
          if (studyPlanData?.study_plan) {
            setStudyPlan(studyPlanData.study_plan);
            setStudyPlanSummary(studyPlanData.summary);
            if (studyPlanData.summary?.next_available_at) {
              setNextPlanAvailable(new Date(studyPlanData.summary.next_available_at));
            }
          }
        }
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
  }, [user, authLoading, router, profile?.subscription_status]);

  // Fetch leaderboard data when window or scope changes
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!user || !profile) return;

      try {
        const response = await api.get(`/api/leaderboard/top-students?window=${leaderboardWindow}${profile.subscription_status === "elite" ? `&scope=${leaderboardScope}` : ""}`);
        setLeaderboard(response.data.data);
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
        toast.error("Failed to load leaderboard");
      }
    };

    if (user && profile) {
      fetchLeaderboard();
    }
  }, [user, profile, leaderboardWindow, leaderboardScope]);

  if (pageLoading) {
    return <PageLoader message="Loading analytics..." />;
  }

  // Check analytics access
  if (!analyticsAccess.hasAccess) {
    return (
      <div className="min-h-screen bg-blush">
        
        <main className="max-w-7xl mx-auto px-6 py-12 text-center">
          <div className="bg-white rounded-lg shadow p-12 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-navy mb-4">Analytics Locked</h2>
            <p className="text-gray-600 mb-6">{analyticsAccess.reason}</p>
            <Link
              href="/pricing"
              className="inline-block px-6 py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition"
            >
              Upgrade to Scholar
            </Link>
          </div>
        </main>
      </div>
    );
  }

  
  if (!overview) {
    return (
      <div className="min-h-screen bg-blush">
       
        <main className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-gray-600 mb-4">
            No analytics data yet. Take some practice tests to get started!
          </p>
          <Link
            href="/dashboard"
            className="text-forest hover:underline font-medium"
          >
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

  const formatCooldown = (expiresAt: string): string => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return "";
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const handleGenerateReport = async () => {
    try {
      setReportLoading(true);
      const res = await api.get("/api/analytics/report");
      setReport(res.data.data.report);
      setFromCache(res.data.data.from_cache);
      setNextGenerationAt(res.data.data.expires_at);
      setShowReport(true);
      const cacheMsg = res.data.data.from_cache ? "(from cache)" : "✨ Fresh!";
      toast.success(`Report generated ${cacheMsg}`);
    } catch (error) {
      console.error("Failed to generate report:", error);
      const errorMessage = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
        || (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.error
        || "Failed to generate report. Please try again.";
      toast.error(errorMessage);
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      const response = await fetch(`${apiUrl}/api/analytics/report/download`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/pdf",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `roman-series-report-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast.error("Failed to download report. Please try again.");
    }
  };

  const canGenerateReport = !nextGenerationAt || new Date(nextGenerationAt) <= new Date();
  const cooldownRemaining = nextGenerationAt ? formatCooldown(nextGenerationAt) : "";

  return (
    <div className="min-h-screen bg-blush">
      {/* Navbar */}
     

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-12 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-navy mb-2">Performance Analytics</h1>
            <p className="text-gray-600 text-sm">Your detailed performance insights and progress tracking</p>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={reportLoading || !canGenerateReport}
            className="px-6 py-3 bg-forest text-white rounded-lg font-medium hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap sm:flex-shrink-0"
          >
            {reportLoading ? "Generating..." : canGenerateReport ? "Generate Report" : `Available in ${cooldownRemaining}`}
          </button>
        </div>

        {/* Report Panel */}
        {showReport && report && (
          <div className="mb-12 bg-white rounded-lg shadow-md border-t-4 border-forest p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-navy">Your Personalised Study Report</h2>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full w-fit ${
                    fromCache
                      ? "bg-gray-200 text-gray-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {fromCache ? "📦 From Cache" : "✨ Fresh"}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Generated on {new Date().toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl sm:flex-shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 p-4 sm:p-6 bg-blush rounded-lg max-h-96 overflow-y-auto">
              {report.split("\n\n").map((paragraph: string, idx: number) => (
                <p key={idx} className="text-gray-700 leading-relaxed mb-4">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleDownloadPDF}
                className="flex-1 px-6 py-3 bg-forest text-white rounded-lg font-medium hover:shadow-md transition-all"
              >
                📥 Download as PDF
              </button>
              <button
                onClick={() => setShowReport(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Overview Cards */}
        <div className="mb-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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
          <div className="mb-12">
            <div className="bg-gradient-to-br from-forest/5 to-blue-50 rounded-lg shadow-lg border border-forest/10 p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-navy mb-2">🎓 Admission Prediction</h2>
                <p className="text-xs text-gray-600">
                  Based on <span className="font-semibold">{prediction.cutoff.year} admission cutoff</span> for <span className="font-semibold">{prediction.cutoff.course}</span>
                </p>
              </div>

              {/* Key Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {/* Your UTME Score */}
                <div className={`p-5 rounded-lg border-l-4 ${prediction.utme_qualifies ? "bg-green-50 border-green-400" : "bg-amber-50 border-amber-400"}`}>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Your UTME Score</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-navy">{prediction.utme_score}</p>
                      <p className="text-xs text-gray-600">/400</p>
                    </div>
                    <span className={`text-lg font-bold ${prediction.utme_qualifies ? "text-green-600" : "text-amber-600"}`}>
                      {prediction.utme_qualifies ? "✓" : "✗"}
                    </span>
                  </div>
                </div>

                {/* Your Practice Score */}
                <div className={`p-5 rounded-lg border-l-4 ${(prediction.current_practice_avg ?? 0) >= Math.min(prediction.required_putme_score ?? 50, 50) ? "bg-green-50 border-green-400" : "bg-blue-50 border-blue-400"}`}>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Your Practice Average</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-navy">{prediction.current_practice_avg ?? 0}</p>
                      <p className="text-xs text-gray-600">%</p>
                    </div>
                    <span className={`text-lg font-bold ${(prediction.current_practice_avg ?? 0) >= Math.min(prediction.required_putme_score ?? 50, 50) ? "text-green-600" : "text-blue-600"}`}>
                      {(prediction.current_practice_avg ?? 0) >= Math.min(prediction.required_putme_score ?? 50, 50) ? "✓" : "→"}
                    </span>
                  </div>
                </div>

                {/* Post-UTME Target */}
                <div className="p-5 rounded-lg border-l-4 bg-indigo-50 border-indigo-400">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Post-UTME Target</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-navy">{Math.max(prediction.required_putme_score ?? 50, 50)}</p>
                      <p className="text-xs text-gray-600">% minimum</p>
                    </div>
                  </div>
                  {typeof prediction.raw_required_putme_score === "number" &&
                    prediction.raw_required_putme_score < 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Your UTME score alone already clears this course&apos;s cutoff. UI still
                        requires a minimum of 50% in Post-UTME for admission, so aim for that.
                      </p>
                    )}
                  {typeof prediction.raw_required_putme_score === "number" &&
                    prediction.raw_required_putme_score >= 0 &&
                    prediction.raw_required_putme_score < 50 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Your calculated target is {prediction.raw_required_putme_score}%, but UI
                        requires a minimum of 50% in Post-UTME for admission.
                      </p>
                    )}
                </div>
              </div>

              {/* Prediction Progress */}
              <div className="relative">
                <div className={`bg-white rounded-lg p-6 border-2 border-forest/10 ${profile?.subscription_status === "explorer" ? "blur-sm" : ""}`}>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-navy">Your Predicted Score</p>
                      <p className={`text-sm font-bold px-3 py-1 rounded-full ${
                        (prediction.predicted_total ?? 0) >= (prediction.cutoff?.combined_cutoff ?? 0)
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {(prediction.predicted_total ?? 0) >= (prediction.cutoff?.combined_cutoff ?? 0) ? "✓ On Track" : "⚠ Below Cutoff"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-forest to-emerald-600 transition-all duration-500"
                          style={{ width: `${Math.min(((prediction.predicted_total ?? 0) / (prediction.cutoff?.combined_cutoff ?? 100)) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-bold text-navy">{(prediction.predicted_total ?? 0).toFixed(1)}</span>
                        <span className="text-sm font-bold text-gray-500">Target: {prediction.cutoff?.combined_cutoff ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Explorer Lock Overlay */}
                {profile?.subscription_status === "explorer" && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-white font-semibold mb-3">Full prediction unlocked in Scholar plan</p>
                      <button
                        onClick={() => router.push("/pricing")}
                        className="px-6 py-2 bg-forest text-white rounded-lg font-medium hover:shadow-md transition"
                      >
                        Upgrade
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">ℹ️ Disclaimer:</span> This prediction uses the <span className="font-semibold">{prediction.cutoff.year} admission cutoff</span>. Actual cutoffs may vary annually. Use this as a guide, not a guarantee.
                </p>
              </div>
            </div>

            {/* Alerts Section */}
            <div className="mt-6 space-y-4">
              {!prediction.utme_qualifies && prediction.utme_qualifies !== undefined && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-900">⚠ UTME Below Minimum (200)</p>
                  <p className="text-sm text-red-800 mt-1">Your score of {prediction.utme_score} doesn&apos;t qualify. You need 200+ for admission eligibility.</p>
                </div>
              )}

              {!prediction.putme_qualifies && prediction.putme_qualifies !== undefined && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-900">⚠ Practice Score Below Minimum (50%)</p>
                  <p className="text-sm text-red-800 mt-1">Current practice score: {prediction.current_practice_avg ?? 0}%. You need 50%+ in Post-UTME to qualify.</p>
                </div>
              )}

              {(prediction.utme_qualifies ?? false) && (prediction.putme_qualifies ?? false) && (prediction.current_practice_avg ?? 0) < (prediction.required_putme_score ?? 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-amber-900">📌 Improve Your Score</p>
                  <p className="text-sm text-amber-800 mt-1">Increase your practice score from {prediction.current_practice_avg ?? 0}% to {prediction.required_putme_score}% to reach the cutoff.</p>
                </div>
              )}

              {(prediction.utme_qualifies ?? false) && (prediction.putme_qualifies ?? false) && (prediction.current_practice_avg ?? 0) >= (prediction.required_putme_score ?? 0) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-green-900">✓ On Track for Admission</p>
                  <p className="text-sm text-green-800 mt-1">Your scores meet the requirements. Keep practicing to maintain your edge!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
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
                              ? getSubjectColor(subject)
                              : "white",
                          borderColor:
                            selectedSubject === subject
                              ? getSubjectColor(subject)
                              : getSubjectColor(subject) + "40",
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
                <div className="bg-white rounded-lg shadow-md relative">
                  <div className="absolute inset-y-0 right-0 pointer-events-none bg-gradient-to-l from-white to-transparent w-8 z-10" />
                  <div className="absolute inset-x-0 top-0 pointer-events-none bg-gradient-to-b from-white to-transparent h-8 z-10" />
                  <div className="overflow-x-auto overflow-y-auto max-h-96">
                    <table className="w-full min-w-full">
                      <thead className="bg-gray-50 border-b sticky top-0 z-20 h-16">
                        <tr>
                          <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs sm:text-xs md:text-sm font-semibold text-gray-500 uppercase">Topic</th>
                          <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs sm:text-xs md:text-sm font-semibold text-gray-500 uppercase whitespace-nowrap">Questions</th>
                          <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs sm:text-xs md:text-sm font-semibold text-gray-500 uppercase">Correct</th>
                          <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs sm:text-xs md:text-sm font-semibold text-gray-500 uppercase">Score</th>
                          <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs sm:text-xs md:text-sm font-semibold text-gray-500 uppercase">Mastery</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTopics.map((topic) => (
                          <tr key={topic.topic_id} className="border-b hover:bg-gray-50">
                            <td className="px-2 sm:px-3 md:px-4 py-3 sm:py-4 max-w-xs">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <div
                                  className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: getSubjectColor(topic.subject_name) }}
                                />
                                <div className="min-w-0">
                                  <p className="font-medium text-navy text-xs sm:text-sm truncate">{topic.topic_name}</p>
                                  <p className="text-xs text-gray-500 truncate">{topic.sessions_count} sessions</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-navy whitespace-nowrap">{topic.total_answered}</td>
                            <td className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-navy whitespace-nowrap">{topic.correct}</td>
                            <td className="px-2 sm:px-4 md:px-6 py-3 sm:py-4">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden min-w-12">
                                  <div
                                    className="h-full transition-all"
                                    style={{
                                      width: `${topic.avg_percentage}%`,
                                      backgroundColor: getSubjectColor(topic.subject_name),
                                    }}
                                  />
                                </div>
                                <span className="w-8 sm:w-12 text-right font-semibold text-navy text-xs sm:text-sm flex-shrink-0">{topic.avg_percentage}%</span>
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-xs">
                              {profile?.subscription_status !== "explorer" ? (
                                <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${getMasteryLabel(topic.avg_percentage).color}`}>
                                  {getMasteryLabel(topic.avg_percentage).label}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
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

              {/* Locked Features for Explorer Users */}
              {profile?.subscription_status === "explorer" && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md border-2 border-blue-200 p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">🔒</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-navy mb-2">Unlock Detailed Analytics</h3>
                      <p className="text-sm text-gray-700 mb-4">
                        Upgrade to Scholar to access Speed Analysis, Topic Mastery Tracking, Performance History, and more insights to boost your preparation.
                      </p>
                      <button
                        onClick={() => router.push("/pricing")}
                        className="px-4 py-2 bg-forest text-white rounded-lg text-sm font-medium hover:shadow-md transition"
                      >
                        View Plans
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Speed & Time Section */}
            <div className="relative">
              <div className={profile?.subscription_status === "explorer" ? "blur-sm pointer-events-none" : ""}>
                <h2 className="text-2xl font-bold text-navy mb-4">Speed & Time Analysis</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-lg shadow-md border-t-4 border-forest p-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Avg Time per Question</p>
                    <p className="text-3xl font-bold text-navy">{overview.avg_time_per_question_seconds}s</p>
                  </div>
                  <div className="bg-white rounded-lg shadow-md border-t-4 border-forest p-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Practice Time</p>
                    <p className="text-3xl font-bold text-navy">{formatTime(overview.total_time_practiced_seconds)}</p>
                  </div>
                </div>

                {/* Speed by Subject */}
                {overview?.speed_by_subject && overview.speed_by_subject.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="font-semibold text-navy mb-4">Speed by Subject</h3>
                    <div className="space-y-4">
                      {overview.speed_by_subject.map((subject) => {
                        const color = subject.avg_time_per_question_seconds < 30 ? "bg-green-500" : subject.avg_time_per_question_seconds < 60 ? "bg-amber-500" : "bg-red-500";
                        return (
                          <div key={subject.subject_id}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-navy">{subject.subject_name}</span>
                              <span className="text-sm font-semibold text-navy">{subject.avg_time_per_question_seconds}s/q</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min((subject.avg_time_per_question_seconds / 90) * 100, 100)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Slowest Topics */}
                {speedData && speedData.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="font-semibold text-navy mb-4">Slowest Topics</h3>
                    <div className="space-y-3">
                      {speedData.slice(0, 3).map((topic, idx) => (
                        <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                            style={{ backgroundColor: getSubjectColor(topic.subject_name) }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-navy truncate">{topic.topic_name}</p>
                            <p className="text-xs text-gray-500">{topic.subject_name}</p>
                          </div>
                          <span className="text-sm font-semibold text-navy flex-shrink-0">{topic.avg_seconds}s</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lock Overlay for Explorer */}
              {profile?.subscription_status === "explorer" && (
                <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-white font-semibold mb-3">Speed Analysis locked for Explorer</p>
                    <button
                      onClick={() => router.push("/pricing")}
                      className="px-6 py-2 bg-forest text-white rounded-lg font-medium hover:shadow-md transition"
                    >
                      Upgrade to Scholar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Performance History */}
            <div className="relative">
              <div className={`bg-white rounded-lg shadow-md overflow-hidden ${profile?.subscription_status === "explorer" ? "blur-sm pointer-events-none" : ""}`}>
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
                            style={{ backgroundColor: getSubjectColor(session.subject_name || "") }}
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

              {/* Lock Overlay for Explorer */}
              {profile?.subscription_status === "explorer" && (
                <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-white font-semibold mb-3">Performance History locked for Explorer</p>
                    <button
                      onClick={() => router.push("/pricing")}
                      className="px-6 py-2 bg-forest text-white rounded-lg font-medium hover:shadow-md transition"
                    >
                      Upgrade to Scholar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Study Plan Section - Elite only */}
            {profile?.subscription_status === "elite" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-navy mb-1">Your AI Study Plan</h3>
                    <p className="text-xs text-gray-500">Personalized topic study order based on your weakest areas</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setStudyPlanLoading(true);
                        try {
                          const res = await api.get("/api/analytics/study-plan");
                          setStudyPlan(res.data.data?.study_plan || []);
                          const summary = res.data.data?.summary;
                          setStudyPlanSummary(summary);
                          if (summary?.next_available_at) {
                            setNextPlanAvailable(new Date(summary.next_available_at));
                          }
                        } catch {
                          toast.error("Failed to generate study plan");
                        } finally {
                          setStudyPlanLoading(false);
                        }
                      }}
                      disabled={studyPlanLoading || (nextPlanAvailable ? nextPlanAvailable > new Date() : false)}
                      className="px-4 py-2 bg-forest text-white rounded text-sm font-medium hover:bg-opacity-90 transition disabled:opacity-50"
                    >
                      {studyPlanLoading ? "Generating..." : nextPlanAvailable && nextPlanAvailable > new Date() ? "Available next week" : "Generate Plan"}
                    </button>
                    {studyPlan && studyPlan.length > 0 && (
                      <button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem("access_token");
                            if (!token) {
                              toast.error("Please log in again");
                              return;
                            }

                            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
                            const response = await fetch(
                              `${apiUrl}/api/analytics/study-plan/download`,
                              {
                                method: "GET",
                                headers: {
                                  "Authorization": `Bearer ${token}`,
                                  "Accept": "application/pdf",
                                },
                              }
                            );

                            if (!response.ok) {
                              const error = await response.json().catch(() => ({})) as { message?: string };
                              throw new Error(error.message || `Failed: ${response.statusText}`);
                            }

                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = `study-plan-${Date.now()}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            toast.success("Study plan downloaded!");
                          } catch (error) {
                            console.error("Download error:", error);
                            toast.error("Failed to download study plan. Please try again.");
                          }
                        }}
                        className="px-4 py-2 bg-navy text-white rounded text-sm font-medium hover:bg-opacity-90 transition"
                      >
                        Download PDF
                      </button>
                    )}
                  </div>
                </div>
                {studyPlan && studyPlan.length > 0 ? (
                  <div className="space-y-4">
                    {studyPlan.map((item: {
                      priority: number;
                      topic_name: string;
                      subject_name: string;
                      current_mastery: number;
                      target_mastery: number;
                      urgency: "critical" | "high" | "medium" | "low";
                      reason: string;
                      study_actions: string[];
                      estimated_hours: number;
                      quick_tip: string;
                    }) => {
                      const urgencyColors: Record<string, string> = {
                        critical: "bg-red-100 text-red-700 border-red-300",
                        high: "bg-orange-100 text-orange-700 border-orange-300",
                        medium: "bg-amber-100 text-amber-700 border-amber-300",
                        low: "bg-blue-100 text-blue-700 border-blue-300"
                      };
                      const progressColors: Record<string, string> = {
                        critical: "bg-red-500",
                        high: "bg-orange-500",
                        medium: "bg-amber-500",
                        low: "bg-blue-500"
                      };
                      return (
                        <div key={item.priority} className="p-4 bg-white rounded border-l-4 shadow-sm hover:shadow-md transition" style={{ borderLeftColor: getSubjectColor(item.subject_name) }}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <span className="text-lg font-bold text-navy">#{item.priority}</span>
                              <p className="font-semibold text-navy text-sm mt-1">{item.topic_name}</p>
                              <p className="text-xs text-gray-500">{item.subject_name}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${urgencyColors[item.urgency] || urgencyColors.low}`}>
                              {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}
                            </span>
                          </div>

                          {/* Mastery Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-gray-600">Mastery Progress</span>
                              <span className="text-xs font-bold text-navy">{item.current_mastery}% → {item.target_mastery}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${progressColors[item.urgency] || progressColors.low}`}
                                style={{ width: `${Math.min(item.current_mastery, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Reason */}
                          <p className="text-sm text-gray-700 mb-3 leading-relaxed">{item.reason}</p>

                          {/* Study Actions */}
                          {item.study_actions && item.study_actions.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Study Actions:</p>
                              <ul className="space-y-1">
                                {item.study_actions.map((action: string, idx: number) => (
                                  <li key={idx} className="text-xs text-gray-700 flex gap-2">
                                    <span className="text-forest font-bold">✓</span>
                                    <span>{action}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Estimated Hours & Quick Tip */}
                          <div className="flex gap-3">
                            {item.estimated_hours && (
                              <div className="flex-1 p-2 bg-blue-50 rounded border border-blue-200">
                                <p className="text-xs font-semibold text-blue-900">Estimated Time</p>
                                <p className="text-sm font-bold text-blue-700">{item.estimated_hours}h</p>
                              </div>
                            )}
                            {item.quick_tip && (
                              <div className="flex-1 p-2 bg-green-50 rounded border border-green-200">
                                <p className="text-xs font-semibold text-green-900">💡 Exam Tip</p>
                                <p className="text-xs text-green-700">{item.quick_tip}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Generate a study plan to see your personalized learning roadmap</p>
                )}
              </div>
            )}

            {/* Time-Pressure Diagnostics - Elite only */}
            {profile?.subscription_status === "elite" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-navy mb-4">Speed vs Accuracy</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Session</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Speed</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sessions.slice(0, 10).map((session, idx) => {
                        const speed = session.time_taken_seconds ? Math.round(session.time_taken_seconds / session.total_questions) : 0;
                        const accuracy = Math.round((session.score / session.total_questions) * 100);
                        const isTimePressure = speed < 30 && accuracy < 60;
                        return (
                          <tr key={idx} className={isTimePressure ? "bg-red-50" : ""}>
                            <td className="px-4 py-2 text-navy font-medium">#{idx + 1}</td>
                            <td className="px-4 py-2 text-navy">{speed}s/q</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-navy font-medium">{accuracy}%</span>
                                {isTimePressure && <span className="text-xs text-red-600 font-semibold">⚠ Time Pressure</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Leaderboard & Insights */}
          <div className="lg:col-span-1 space-y-6">
            {/* Leaderboard Section */}
            {leaderboard && profile?.subscription_status === "explorer" && (
              <div className="bg-white rounded-lg shadow-md border-t-4 border-forest p-6 relative">
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-white font-semibold mb-3 text-lg">🏆 See Your Ranking</p>
                    <p className="text-gray-300 text-sm mb-4">Unlock the full leaderboard and see where you rank among all aspirants.</p>
                    <button
                      onClick={() => router.push("/pricing")}
                      className="px-6 py-2 bg-forest text-white rounded-lg font-medium hover:shadow-md transition"
                    >
                      Upgrade Now
                    </button>
                  </div>
                </div>
                <div className="blur-sm pointer-events-none">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-navy">Top Performers</h3>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 rounded text-sm font-medium bg-forest text-white">All Time</button>
                      <button className="px-3 py-1 rounded text-sm font-medium bg-gray-100 text-gray-700">This Week</button>
                    </div>
                  </div>
                  <div className="text-center mb-6 p-4 bg-blush rounded-lg">
                    <p className="text-4xl font-bold text-navy mb-1">—</p>
                    <p className="text-sm text-gray-600">of 1000+ participants</p>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-500">#{idx}</span>
                          <span className="text-sm font-medium text-navy">User</span>
                        </div>
                        <span className="text-sm font-semibold text-navy">90%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {leaderboard && profile?.subscription_status !== "explorer" && (
              <div className="relative">
                <div className="bg-white rounded-lg shadow-md border-t-4 border-forest p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-navy">
                      {leaderboardScope === "cohort" && profile?.target_course
                        ? `Top ${profile.target_course} Aspirants`
                        : "Top Performers"}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLeaderboardWindow("overall")}
                        className={`px-3 py-1 rounded text-sm font-medium transition ${
                          leaderboardWindow === "overall"
                            ? "bg-forest text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        All Time
                      </button>
                      <button
                        onClick={() => setLeaderboardWindow("weekly")}
                        className={`px-3 py-1 rounded text-sm font-medium transition ${
                          leaderboardWindow === "weekly"
                            ? "bg-forest text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        This Week
                      </button>
                    </div>
                  </div>

                  {/* Elite User Scope Toggle */}
                  {profile?.subscription_status === "elite" && (
                    <div className="mb-6 pb-6 border-b">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Ranking Scope</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setLeaderboardScope("global")}
                          className={`px-3 py-1 rounded text-sm font-medium transition ${
                            leaderboardScope === "global"
                              ? "bg-forest text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          title="Compare your score with all students platform-wide"
                        >
                          All Aspirants
                        </button>
                        <button
                          onClick={() => setLeaderboardScope("cohort")}
                          className={`px-3 py-1 rounded text-sm font-medium transition ${
                            leaderboardScope === "cohort"
                              ? "bg-forest text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          title={`Compare your score with other ${profile?.target_course} applicants`}
                        >
                          My Course
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {leaderboardScope === "cohort" && profile?.target_course
                          ? `📍 Comparing with other ${profile.target_course} applicants`
                          : "📍 Comparing with all students platform-wide"}
                      </p>
                    </div>
                  )}

                  {/* Current User Rank Display */}
                  {leaderboard.current_user_rank !== null && (
                    <div className="text-center mb-6 p-4 bg-blush rounded-lg">
                      <p className="text-4xl font-bold text-navy mb-1">#{leaderboard.current_user_rank}</p>
                      <p className="text-sm text-gray-600">
                        {leaderboardScope === "cohort" && profile?.target_course
                          ? `among ${profile.target_course} aspirants`
                          : `of ${leaderboard.total_participants} participants`}
                      </p>
                      {profile?.subscription_status === "elite" && leaderboard.percentile && (
                        <p className="text-xs text-forest font-semibold mt-2">📊 {leaderboard.percentile.message}</p>
                      )}
                    </div>
                  )}

                  {/* Rankings List */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                      {leaderboardScope === "cohort" ? "Your Course" : "Global"} Leaderboard
                    </p>
                    {leaderboard.rankings.slice(0, 10).map((entry) => (
                      <div
                        key={`${entry.rank}-${entry.name_initial}`}
                        className={`flex items-center justify-between p-2 rounded ${
                          entry.is_current_user ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-500">#{entry.rank}</span>
                          <span className={`text-sm font-medium ${entry.is_current_user ? "text-forest font-bold" : "text-navy"}`}>
                            {entry.name_initial} {entry.is_current_user && "👈 You"}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-navy">{entry.avg_score}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Insights Cards */}
            {strongestTopic && (
              <div className="bg-white rounded-lg shadow-md border-t-4 p-6" style={{ borderTopColor: getSubjectColor(strongestTopic.subject_name) }}>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Strongest Topic</p>
                <p className="text-xl font-bold text-navy mb-1">{strongestTopic.topic_name}</p>
                <p className="text-sm font-semibold mb-3 text-gray-500" style={{ color: getSubjectColor(strongestTopic.subject_name) }}>
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

      {/* Upgrade Prompt */}
      {showUpgradePrompt && (
        <UpgradePrompt
          title="Unlock Advanced Analytics"
          message="Scholar and Elite plans unlock advanced analytics with deeper insights, performance trends, percentile rankings, and cohort comparisons to help you track your progress."
          feature="Advanced Analytics & Insights"
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
}
