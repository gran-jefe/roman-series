"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatCardSkeleton, SessionRowSkeleton } from "@/components/skeletons";
import { PageLoader } from "@/components/PageLoader";
import { ProfileCompletionModal } from "@/components/ProfileCompletionModal";
import { AnnouncementCarousel } from "@/components/AnnouncementCarousel";
import { useMockExamLimit } from "@/hooks/useMockExamLimit";
import type { University, Subject, SessionHistoryItem, UserStats, ErrorBankQuestion, PredictionResult } from "types";
import toast from "react-hot-toast";
import {
  Calendar,
  BarChart3,
  Zap,
  CheckCircle,
  ChevronRight,
  Target,
  BookOpen,
  AlertCircle as ErrorIcon,
  TrendingUp,
  Flame,
  Activity,
  Award,
  Sparkles,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  GraduationCap,
  Crown,
} from "lucide-react";
import Link from "next/link";

interface Subscription {
  subscription_status: string;
}

interface SubjectWithCounts extends Subject {
  topic_count?: number;
  question_count?: number;
}

const subjectColours: Record<string, { bg: string; border: string; text: string; light: string }> = {
  Biology: { bg: "bg-emerald-600", border: "border-emerald-200", text: "text-emerald-700", light: "bg-emerald-50" },
  Chemistry: { bg: "bg-rose-600", border: "border-rose-200", text: "text-rose-700", light: "bg-rose-50" },
  Physics: { bg: "bg-amber-700", border: "border-amber-200", text: "text-amber-800", light: "bg-amber-50" },
  Government: { bg: "bg-slate-700", border: "border-slate-200", text: "text-slate-800", light: "bg-slate-50" },
  Literature: { bg: "bg-orange-600", border: "border-orange-200", text: "text-orange-700", light: "bg-orange-50" },
  CRS: { bg: "bg-yellow-600", border: "border-yellow-200", text: "text-yellow-800", light: "bg-yellow-50" },
  IRS: { bg: "bg-pink-600", border: "border-pink-200", text: "text-pink-700", light: "bg-pink-50" },
  English: { bg: "bg-blue-600", border: "border-blue-200", text: "text-blue-700", light: "bg-blue-50" },
  Mathematics: { bg: "bg-indigo-600", border: "border-indigo-200", text: "text-indigo-700", light: "bg-indigo-50" },
  Commerce: { bg: "bg-teal-600", border: "border-teal-200", text: "text-teal-700", light: "bg-teal-50" },
  Accounting: { bg: "bg-purple-600", border: "border-purple-200", text: "text-purple-700", light: "bg-purple-50" },
  Economics: { bg: "bg-sky-600", border: "border-sky-200", text: "text-sky-700", light: "bg-sky-50" },
};

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const mockExamLimit = useMockExamLimit(profile?.subscription_status);
  const [subjects, setSubjects] = useState<SubjectWithCounts[]>([]);
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [errorBank, setErrorBank] = useState<ErrorBankQuestion[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [targetCourse, setTargetCourse] = useState<string>("");

  // Loading state for essential data only
  const [essentialLoading, setEssentialLoading] = useState(true);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  // Guard: redirect admins to /admin
  useEffect(() => {
    if (profile?.role === "admin") {
      router.push("/admin");
    }
  }, [profile, router]);

  // Fetch essential data first (blocks page render until done)
  useEffect(() => {
    const fetchEssentialData = async () => {
      try {
        let userProfile = profile;
        try {
          const meRes = await api.get("/api/auth/me");
          userProfile = meRes.data.data.profile;
          setUserName(meRes.data.data.profile.full_name);
          setTargetCourse(meRes.data.data.profile.target_course || "");
        } catch {
          if (profile?.full_name) {
            setUserName(profile.full_name);
          }
          if (profile?.target_course) {
            setTargetCourse(profile.target_course);
          }
        }

        // Guard: redirect to onboarding if no subject combination
        if (!userProfile?.subject_combination?.length) {
          router.push("/onboarding");
          return;
        }

        // Show completion modal if both course and score are missing
        if (!userProfile?.target_course && !userProfile?.utme_score) {
          setShowCompletionModal(true);
        }

        // Get user's target university
        if (userProfile?.target_university_id) {
          const uniRes = await api.get("/api/universities");
          const allUniversities = uniRes.data.data || [];
          const userUni = allUniversities.find(
            (uni: University) => uni.id === userProfile.target_university_id
          );

          if (userUni) {
            setSelectedUniversity(userUni);

            const subjectsRes = await api.get(
              `/api/subjects?universityId=${userProfile.target_university_id}`
            );
            const allSubjects = subjectsRes.data.data || [];
            const userSubjects = allSubjects.filter((s: Subject) =>
              userProfile.subject_combination?.includes(s.id)
            );
            setSubjects(userSubjects);
          }
        }
      } catch (error) {
        console.error("Failed to fetch essential data:", error);
        toast.error("Failed to load dashboard");
      } finally {
        setEssentialLoading(false);
      }
    };

    fetchEssentialData();
  }, [profile, router]);

  // Fetch optional data in parallel (non-blocking)
  useEffect(() => {
    if (!essentialLoading) {
      // Fetch subscription status
      (async () => {
        try {
          const subRes = await api.get("/api/payments/status");
          setSubscription(subRes.data.data);
        } catch {}
      })();

      // Fetch user stats
      (async () => {
        try {
          const statsRes = await api.get("/api/stats/me");
          setStats(statsRes.data.data);
        } catch {}
      })();

      // Fetch session history
      (async () => {
        try {
          const sessionRes = await api.get("/api/sessions/history");
          setSessions(sessionRes.data.data || []);
        } catch {
        } finally {
          setSessionsLoaded(true);
        }
      })();

      // Fetch error bank questions
      (async () => {
        try {
          const errorRes = await api.get("/api/sessions/wrong-questions");
          setErrorBank(errorRes.data.data?.questions || []);
        } catch {}
      })();

      // Fetch prediction
      (async () => {
        try {
          const predRes = await api.get("/api/analytics/prediction");
          setPrediction(predRes.data.data);
        } catch {}
      })();
    }
  }, [essentialLoading]);

  const handleSelectSubject = (subject: Subject) => {
    if (!selectedUniversity) return;
    router.push(
      `/practice/topics?subjectId=${subject.id}&universityId=${selectedUniversity.id}`
    );
  };

  // Show loader only for essential data
  if (essentialLoading) {
    return <PageLoader message="Loading your dashboard..." />;
  }

  const avgScore =
    stats && stats.avg_score_by_subject.length > 0
      ? Math.round(
          stats.avg_score_by_subject.reduce((sum, s) => sum + s.avg_percentage, 0) /
            stats.avg_score_by_subject.length
        )
      : 0;

  const currentStatus = subscription?.subscription_status || "explorer";

  return (
    <div className="min-h-screen bg-[#FAF7F4] text-slate-800">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <AnnouncementCarousel />

        {/* Welcome & Readiness Hero Header */}
        <div className="mb-8 bg-gradient-to-br from-[#0D1B2A] via-[#12263F] to-[#1A3353] text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#1A7A4A]/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-[#C4522A]/15 rounded-full blur-2xl translate-y-1/2 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-emerald-300 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                UTME & Post-UTME 2026/2027 Season Active
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
                Welcome back, {userName ? userName.split(" ")[0] : "Candidate"}!
              </h1>
              {selectedUniversity ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/80 text-sm sm:text-base">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-[#1A7A4A]" />
                    {selectedUniversity.name}
                  </span>
                  {targetCourse && (
                    <span className="text-white/60">• Course: <strong className="text-white">{targetCourse}</strong></span>
                  )}
                </div>
              ) : (
                <p className="text-white/70 text-sm">
                  Complete your study profile to unlock customized university benchmarks.
                </p>
              )}
            </div>

            {/* Quick Readiness Badge / Upgrade CTA */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <div className="text-right">
                <p className="text-xs uppercase font-bold text-white/60 tracking-wider">Plan Status</p>
                <div className="text-sm sm:text-base font-extrabold capitalize text-white flex items-center justify-end gap-1.5">
                  {currentStatus === "elite" ? (
                    <span className="text-purple-300 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-purple-400" />
                      Elite Access
                    </span>
                  ) : currentStatus === "scholar" ? (
                    <span className="text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Scholar Tier
                    </span>
                  ) : (
                    <span>Explorer (Free)</span>
                  )}
                </div>
              </div>
              {currentStatus !== "elite" && (
                <Link
                  href="/pricing"
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#C4522A] to-amber-600 hover:brightness-110 text-white font-bold text-xs shadow-sm transition"
                >
                  Upgrade →
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 4-Card Bento Metrics Grid */}
        <div className="mb-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {stats ? (
              <>
                {/* Total Sessions */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-[#1A7A4A]/40 transition group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sessions</span>
                    <div className="w-10 h-10 rounded-xl bg-[#0D1B2A]/5 flex items-center justify-center text-[#1A7A4A] group-hover:scale-105 transition">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-4xl font-black text-[#0D1B2A] tracking-tight">
                    {stats.total_sessions}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">completed drills</p>
                </div>

                {/* Average Score */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-[#1A7A4A]/40 transition group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Accuracy</span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-4xl font-black text-[#1A7A4A] tracking-tight">
                    {avgScore}%
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">across all subjects</p>
                </div>

                {/* Best Score */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-[#1A7A4A]/40 transition group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Personal Best</span>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-105 transition">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-4xl font-black text-[#0D1B2A] tracking-tight">
                    {stats.best_score_percentage}%
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">high score record</p>
                </div>

                {/* Questions Answered */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-[#1A7A4A]/40 transition group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Solved</span>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-105 transition">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-4xl font-black text-[#0D1B2A] tracking-tight">
                    {stats.total_questions_answered}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">questions attempted</p>
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

        {/* Main Grid: 2/3 Content + 1/3 Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            
            {/* Full Mock CBT Exam Launcher */}
            {selectedUniversity && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm hover:shadow-md hover:border-[#1A7A4A]/40 transition relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2 border border-emerald-200">
                      <Target className="w-3.5 h-3.5 text-emerald-600" />
                      Official Simulation
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0D1B2A]">
                      Full Mock UTME / Post-UTME Exam
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Comprehensive simulation under authentic examination conditions ({subjects.length} subjects • {subjects.length * 25} questions).
                    </p>
                  </div>

                  {/* Plan Limit Pill */}
                  <div>
                    {currentStatus === "explorer" && (
                      <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Explorer: 1 free mock
                      </span>
                    )}
                    {currentStatus === "scholar" && (
                      <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Scholar: 3 mocks/week
                      </span>
                    )}
                    {currentStatus === "elite" && (
                      <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        <Crown className="w-3 h-3 text-purple-600" />
                        Elite: Unlimited
                      </span>
                    )}
                  </div>
                </div>

                {/* Quota Exhaustion / Status Banner */}
                {currentStatus === "explorer" && mockExamLimit.hasExhausted && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-sm text-amber-900">
                    <p className="font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      You have used your free mock exam!
                    </p>
                    <p className="text-xs text-amber-800 mt-1">
                      Upgrade to <strong>Scholar (₦2,500)</strong> for 3 mocks/week or <strong>Elite (₦3,500)</strong> for unlimited mocks all season.
                    </p>
                  </div>
                )}

                {/* Exam Attributes Grid */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-[#FAF7F4] rounded-2xl border border-slate-100 mb-6 text-center">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Subjects</p>
                    <p className="text-xl sm:text-2xl font-black text-[#0D1B2A]">{subjects.length}</p>
                    <p className="text-[11px] text-slate-500 truncate max-w-[120px] mx-auto">
                      {subjects.map((s) => s.name).join(", ")}
                    </p>
                  </div>
                  <div className="border-x border-slate-200">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Questions</p>
                    <p className="text-xl sm:text-2xl font-black text-[#0D1B2A]">{subjects.length * 25}</p>
                    <p className="text-[11px] text-slate-500">25 per subject</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Duration</p>
                    <p className="text-xl sm:text-2xl font-black text-[#0D1B2A]">90</p>
                    <p className="text-[11px] text-slate-500">minutes</p>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="flex items-center justify-end">
                  {mockExamLimit.hasExhausted ? (
                    <button
                      onClick={() => router.push("/pricing")}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-[#C4522A] hover:bg-[#b04520] text-white shadow-sm transition"
                    >
                      Upgrade Plan for More Mocks →
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push("/practice/mock/session")}
                      disabled={mockExamLimit.isLoading}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black bg-[#1A7A4A] hover:bg-[#15633c] text-white shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <Target className="w-5 h-5" />
                      {mockExamLimit.isLoading ? "Preparing Exam..." : "Start Timed Mock Exam"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Elite Special Modules: Recalled Questions & Hard Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Recalled Questions */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      Elite Exclusive
                    </span>
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-black text-[#0D1B2A] mb-2">
                    Recalled Past Questions
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Authentic exam questions recalled by students from recent cycles, annotated with complete solutions.
                  </p>
                </div>
                {currentStatus === "elite" ? (
                  <button
                    onClick={() => router.push("/practice/recalled-questions")}
                    className="w-full py-2.5 px-4 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white text-xs transition"
                  >
                    Open Recalled Pool →
                  </button>
                ) : (
                  <button
                    onClick={() => router.push("/pricing")}
                    className="w-full py-2.5 px-4 rounded-xl font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs border border-purple-200 transition"
                  >
                    Unlock with Elite (₦3,500)
                  </button>
                )}
              </div>

              {/* Hard Mode Mock */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      Stress Mode
                    </span>
                    <Zap className="w-4 h-4 text-rose-600" />
                  </div>
                  <h3 className="text-lg font-black text-[#0D1B2A] mb-2">
                    Hard Mode Exam (60 Min)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Test your speed under reduced time limits with high-difficulty analytical questions.
                  </p>
                </div>
                {currentStatus === "elite" ? (
                  <button
                    onClick={() => router.push("/practice/mock/session?mode=hard")}
                    className="w-full py-2.5 px-4 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white text-xs transition"
                  >
                    Launch Hard Mode →
                  </button>
                ) : (
                  <button
                    onClick={() => router.push("/pricing")}
                    className="w-full py-2.5 px-4 rounded-xl font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs border border-rose-200 transition"
                  >
                    Unlock with Elite (₦3,500)
                  </button>
                )}
              </div>
            </div>

            {/* Practice Subjects Section */}
            {selectedUniversity && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-[#0D1B2A] flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#1A7A4A]" />
                      Your Registered Subjects
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select a subject to drill specific topics or start untimed practice
                    </p>
                  </div>
                  <Link
                    href="/practice/topics"
                    className="text-xs font-bold text-[#1A7A4A] hover:underline flex items-center gap-1"
                  >
                    All Topics <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {subjects.map((subject) => {
                    const theme = subjectColours[subject.name] || {
                      bg: "bg-[#0D1B2A]",
                      border: "border-slate-200",
                      text: "text-slate-800",
                      light: "bg-slate-50",
                    };

                    return (
                      <div
                        key={subject.id}
                        onClick={() => handleSelectSubject(subject)}
                        className={`group p-4 sm:p-5 rounded-2xl border ${theme.border} ${theme.light} hover:shadow-md cursor-pointer transition flex items-center justify-between`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${theme.bg} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                            {subject.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-[#1A7A4A] transition">
                              {subject.name}
                            </h4>
                            <p className="text-xs text-slate-500">
                              Tap to choose topics
                            </p>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 group-hover:text-[#1A7A4A] group-hover:translate-x-0.5 transition shadow-sm">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (1/3 Sidebar) */}
          <div className="lg:col-span-1 space-y-6">

            {/* Error Bank Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ErrorIcon className="w-4 h-4 text-[#C4522A]" /> Error Bank
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">
                  Targeted Revision
                </span>
              </div>
              {errorBank.length > 0 ? (
                <>
                  <p className="text-3xl font-black text-[#C4522A] tracking-tight mb-1">
                    {errorBank.length}
                  </p>
                  <p className="text-xs text-slate-600 mb-4 font-medium">
                    missed questions waiting to be mastered
                  </p>
                  <button
                    onClick={() => router.push("/error-bank")}
                    className="w-full bg-[#C4522A] hover:bg-[#b04520] text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm transition"
                  >
                    Clear Missed Questions →
                  </button>
                </>
              ) : (
                <>
                  <p className="text-3xl font-black text-[#1A7A4A] mb-1">0</p>
                  <p className="text-xs text-slate-500 mb-4">
                    Zero unreviewed errors! Keep up the momentum.
                  </p>
                  <button
                    onClick={() => router.push("/practice/topics")}
                    className="w-full bg-[#FAF7F4] hover:bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl font-bold text-xs border border-slate-200 transition"
                  >
                    Practice More Questions
                  </button>
                </>
              )}
            </div>

            {/* Target University & Department Benchmarks */}
            {selectedUniversity && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <GraduationCap className="w-4 h-4 text-slate-500" />
                  Target Department
                </span>
                <div className="mb-4">
                  <h4 className="text-base font-black text-[#0D1B2A]">{selectedUniversity.name}</h4>
                  <p className="text-xs font-bold text-[#1A7A4A] uppercase mt-0.5">
                    {selectedUniversity.short_code} • {profile?.target_course || "Undergraduate Candidate"}
                  </p>
                </div>

                {prediction && !prediction.locked && prediction.status !== "no_data" && (
                  <div className="p-4 bg-[#FAF7F4] rounded-2xl border border-slate-100 space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">UTME Score:</span>
                      <strong className="text-slate-900 font-extrabold">{prediction.utme_score ?? 0} / 400</strong>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500">Required Post-UTME:</span>
                      <strong className="text-emerald-700 font-extrabold">
                        {Math.max(prediction.required_putme_score ?? 50, 50)}%
                      </strong>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500">Current Average:</span>
                      <strong className={((prediction.current_practice_avg ?? 0) >= (prediction.required_putme_score ?? 0)) ? "text-emerald-600 font-extrabold" : "text-amber-600 font-extrabold"}>
                        {prediction.current_practice_avg ?? 0}%
                      </strong>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => router.push("/analytics")}
                  className="w-full mt-4 text-xs font-bold text-[#1A7A4A] hover:bg-emerald-50 py-2 rounded-xl transition border border-emerald-200"
                >
                  View Full Admission Forecast →
                </button>
              </div>
            )}

            {/* Streak & Study Tips */}
            <div className="bg-gradient-to-br from-[#0D1B2A] to-[#1A3353] text-white rounded-3xl p-6 shadow-md border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-white/60">Study Streak</p>
                  <p className="text-sm font-extrabold text-white">Consistent practice builds speed</p>
                </div>
              </div>
              <p className="text-xs text-white/80 leading-relaxed mb-4">
                Solving at least 20 questions each day improves your question recognition time by over 40% before exam day.
              </p>
              <button
                onClick={() => router.push("/practice/topics")}
                className="w-full py-2.5 rounded-xl bg-white text-[#0D1B2A] hover:bg-white/90 font-extrabold text-xs transition"
              >
                Quick 10-Question Drill
              </button>
            </div>
          </div>
        </div>

        {/* Recent Practice Sessions */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-black text-[#0D1B2A] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#1A7A4A]" />
              Recent Practice Sessions
            </h3>
            {sessions.length > 0 && (
              <Link
                href="/sessions"
                className="text-xs font-bold text-[#1A7A4A] hover:underline flex items-center gap-1"
              >
                View Full History <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {!sessionsLoaded ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <table className="w-full">
                <tbody>
                  <SessionRowSkeleton />
                  <SessionRowSkeleton />
                  <SessionRowSkeleton />
                </tbody>
              </table>
            </div>
          ) : sessions.length > 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#FAF7F4] border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Session Type</th>
                      <th className="px-6 py-3.5">Institution</th>
                      <th className="px-6 py-3.5">Score</th>
                      <th className="px-6 py-3.5">Questions</th>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessions.slice(0, 5).map((session) => {
                      const sessionType = session.is_mock
                        ? "Mock Exam"
                        : session.is_hard_mode
                        ? "Hard Mode"
                        : session.is_recalled
                        ? "Recalled"
                        : session.subject_name || "Individual Drill";

                      return (
                        <tr
                          key={session.id}
                          className="hover:bg-slate-50/80 transition"
                        >
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {sessionType}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                            {session.university_short_code || "General"}
                          </td>
                          <td className="px-6 py-4 font-black">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                                session.percentage >= 60
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : session.percentage >= 50
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {session.percentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600">
                            {session.total_questions || "—"} Qs
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {new Date(session.started_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {session.completed ? (
                              <Link
                                href={`/practice/results?sessionId=${session.id}`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#1A7A4A] hover:underline"
                              >
                                Review <ArrowUpRight className="w-3 h-3" />
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-400">Incomplete</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center shadow-sm">
              <p className="text-slate-500 text-sm font-medium">
                No practice sessions recorded yet. Pick a subject above to launch your first session!
              </p>
            </div>
          )}
        </div>
      </main>

      {showCompletionModal && (
        <ProfileCompletionModal
          onComplete={() => setShowCompletionModal(false)}
        />
      )}
    </div>
  );
}
