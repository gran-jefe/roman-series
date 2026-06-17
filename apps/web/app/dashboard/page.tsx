"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatCardSkeleton, SessionRowSkeleton } from "@/components/skeletons";
import { PageLoader } from "@/components/PageLoader";
import { ProfileCompletionModal } from "@/components/ProfileCompletionModal";
import { useMockExamLimit } from "@/hooks/useMockExamLimit";
import type { University, Subject, SessionHistoryItem, UserStats, ErrorBankQuestion, PredictionResult } from "types";
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

  // Fetch essential data first (blocks page render until done)
  useEffect(() => {
    const fetchEssentialData = async () => {
      const token = localStorage.getItem("access_token");
      console.log("[Dashboard] Token in storage:", token ? `${token.slice(0, 20)}...` : "MISSING");
      try {
        // Get user profile
        let userProfile = profile;
        try {
          const meRes = await api.get("/api/auth/me");
          userProfile = meRes.data.data.profile;
          setUserName(meRes.data.data.profile.full_name);
          setTargetCourse(meRes.data.data.profile.target_course || "");
        } catch {
          // Use profile from context if available
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
        } catch {
          // Subscription endpoint error - continue without it
        }
      })();

      // Fetch user stats
      (async () => {
        try {
          const statsRes = await api.get("/api/stats/me");
          setStats(statsRes.data.data);
        } catch {
          // Stats endpoint error - continue without it
        }
      })();

      // Fetch session history
      (async () => {
        try {
          const sessionRes = await api.get("/api/sessions/history");
          setSessions(sessionRes.data.data || []);
        } catch {
          // Sessions endpoint error - continue without it
        } finally {
          setSessionsLoaded(true);
        }
      })();

      // Fetch error bank questions
      (async () => {
        try {
          const errorRes = await api.get("/api/sessions/wrong-questions");
          setErrorBank(errorRes.data.data?.questions || []);
        } catch {
          // Error bank endpoint error - continue without it
        }
      })();

      // Fetch prediction
      (async () => {
        try {
          const predRes = await api.get("/api/analytics/prediction");
          setPrediction(predRes.data.data);
        } catch {
          // Prediction endpoint error - continue without it
        }
      })();
    }
  }, [essentialLoading]);

  const handleSelectSubject = (subject: Subject) => {
    if (!selectedUniversity) return;
    router.push(
      `/practice/topics?subjectId=${subject.id}&universityId=${selectedUniversity.id}`
    );
  };

  // Show loader only for essential data (profile, university, subjects)
  if (essentialLoading) {
    return <PageLoader message="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-blush">
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Header Band */}
        <div className="mb-8 bg-navy text-white rounded-lg p-8 shadow-md">
          <h2 className="text-4xl font-bold mb-2">
            Welcome back, {userName ? userName.split(" ")[0] : "User"}
          </h2>
          {selectedUniversity && (
            <p className="text-gray-300 text-sm">
              Preparing for <span className="font-semibold text-white">{selectedUniversity.name}</span>
              {targetCourse && <span className="text-gray-400"> • {targetCourse}</span>}
            </p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats ? (
              <>
                {/* Total Sessions */}
                <div className="bg-white rounded-lg shadow-sm border-t-4 border-forest p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Sessions</p>
                      <p className="text-3xl font-bold text-navy">{stats.total_sessions}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blush flex items-center justify-center">
                      <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Average Score */}
                <div className="bg-white rounded-lg shadow-sm border-t-4 border-forest p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Average Score</p>
                      <p className="text-3xl font-bold text-navy">
                        {stats.avg_score_by_subject.length > 0
                          ? Math.round(
                              stats.avg_score_by_subject.reduce((sum, s) => sum + s.avg_percentage, 0) /
                                stats.avg_score_by_subject.length
                            )
                          : 0}
                        %
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blush flex items-center justify-center">
                      <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Best Score */}
                <div className="bg-white rounded-lg shadow-sm border-t-4 border-forest p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Best Score</p>
                      <p className="text-3xl font-bold text-navy">{stats.best_score_percentage}%</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blush flex items-center justify-center">
                      <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Questions Answered */}
                <div className="bg-white rounded-lg shadow-sm border-t-4 border-forest p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Questions Answered</p>
                      <p className="text-3xl font-bold text-navy">{stats.total_questions_answered}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blush flex items-center justify-center">
                      <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
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


        {/* Main Grid: 2/3 + 1/3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Mock Exam Section */}
            {selectedUniversity && (
              <div>
                <h3 className="text-xl font-bold text-navy mb-4">Mock PUTME Exam</h3>
                <div className="rounded-lg shadow-md p-4 md:p-8 border-t-4 border-forest bg-white hover:shadow-lg transition-all">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-xl md:text-2xl font-bold text-navy mb-2 md:mb-3">Full Mock Exam</h4>
                      <p className="text-sm md:text-base text-gray-600 mb-4">Take a complete UTME-style mock exam with {subjects.length} subjects and {subjects.length * 25} questions</p>

                      {subscription?.subscription_status === "explorer" && mockExamLimit.hasExhausted && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                          <p className="text-sm font-semibold text-red-900">🔒 Mock Exam Limit Reached</p>
                          <p className="text-xs text-red-800 mt-1">You&apos;ve used all {mockExamLimit.mockLimit} free mock exams. Upgrade to Scholar (3/week) or Elite (unlimited) for more attempts.</p>
                        </div>
                      )}

                      {subscription?.subscription_status === "explorer" && !mockExamLimit.hasExhausted && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                          <p className="text-sm font-semibold text-blue-900">📅 Explorer Plan: 2 mock exams (lifetime)</p>
                          <p className="text-xs text-blue-800 mt-1">You&apos;ve completed {mockExamLimit.completedMocks} of {mockExamLimit.mockLimit}. Upgrade to Scholar (₦2,500) for 3 exams/week or Elite (₦3,500) for unlimited.</p>
                        </div>
                      )}

                      {subscription?.subscription_status === "scholar" && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                          <p className="text-sm font-semibold text-blue-900">📅 Scholar Plan: 3 mock exams per week</p>
                          <p className="text-xs text-blue-800 mt-1">You have unlimited weekly attempts. Upgrade to Elite (₦3,500) for unlimited anytime, plus hard mode and advanced analytics.</p>
                        </div>
                      )}

                      {subscription?.subscription_status === "elite" && (
                        <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-4">
                          <p className="text-sm font-semibold text-purple-900">⭐ Elite Plan: Unlimited mock exams</p>
                          <p className="text-xs text-purple-800 mt-1">Take as many mock exams as you want, including hard mode with advanced difficulty and time-pressure diagnostics.</p>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2 md:gap-6 mb-6">
                        <div className="text-center md:text-left">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Subjects</p>
                          <p className="text-2xl md:text-3xl font-bold text-navy">{subjects.length}</p>
                          <p className="text-xs text-gray-500 hidden md:block">{subjects.map(s => s.name).join(", ")}</p>
                          <p className="text-xs text-gray-500 md:hidden">Subjects</p>
                        </div>
                        <div className="text-center md:text-left">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Questions</p>
                          <p className="text-2xl md:text-3xl font-bold text-navy">{subjects.length * 25}</p>
                          <p className="text-xs text-gray-500">25 each</p>
                        </div>
                        <div className="text-center md:text-left">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Duration</p>
                          <p className="text-2xl md:text-3xl font-bold text-navy">90</p>
                          <p className="text-xs text-gray-500">minutes</p>
                        </div>
                      </div>
                    </div>
                    {mockExamLimit.hasExhausted ? (
                      <button
                        onClick={() => {
                          router.push("/pricing");
                        }}
                        className="w-full sm:w-auto px-6 py-3 md:py-2 rounded-lg font-medium whitespace-nowrap transition-all bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-md"
                      >
                        Upgrade Now ⭐
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          router.push("/practice/mock/session");
                        }}
                        disabled={mockExamLimit.isLoading}
                        className="w-full sm:w-auto px-6 py-3 md:py-2 rounded-lg font-medium whitespace-nowrap transition-all bg-forest text-white hover:shadow-md disabled:opacity-50"
                      >
                        {mockExamLimit.isLoading ? "Loading..." : "Start Exam"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recalled Questions Section */}
            <div>
              <div className="rounded-lg shadow-md p-4 md:p-8 border-t-4 border-purple-600 bg-white hover:shadow-lg transition-all">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-xl md:text-2xl font-bold text-navy">Recalled UI-POSTUTME Questions</h4>
                      <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded">Elite Only</span>
                    </div>
                    <p className="text-sm md:text-base text-gray-600 mb-4">Questions confirmed to have appeared in past Post-UTME exams. Practice with authentic exam content from your target university.</p>
                    {subscription?.subscription_status !== "elite" && (
                      <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-4">
                        <p className="text-sm font-semibold text-purple-900">⭐ Elite Exclusive Feature</p>
                        <p className="text-xs text-purple-800 mt-1">Upgrade to Elite (₦5,000/6 months) to unlock access to our database of recalled exam questions and gain advanced analytics.</p>
                      </div>
                    )}
                    {subscription?.subscription_status === "elite" && (
                      <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                        <p className="text-sm font-semibold text-green-900">✓ You have full access to this feature!</p>
                      </div>
                    )}
                  </div>
                  {subscription?.subscription_status === "elite" ? (
                    <button
                      onClick={() => {
                        router.push("/practice/recalled-questions");
                      }}
                      className="w-full sm:w-auto px-6 py-3 md:py-2 rounded-lg font-medium whitespace-nowrap transition-all bg-purple-600 text-white hover:shadow-md"
                    >
                      View Questions
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        router.push("/pricing");
                      }}
                      className="w-full sm:w-auto px-6 py-3 md:py-2 rounded-lg font-medium whitespace-nowrap transition-all bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-md"
                    >
                      Upgrade Now ⭐
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Hard Mode Mock Exam Section */}
            <div>
              <div className={`rounded-lg shadow-md p-4 md:p-8 border-t-4 bg-white hover:shadow-lg transition-all ${subscription?.subscription_status === "elite" ? "border-red-600" : "border-gray-300"}`}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-xl md:text-2xl font-bold text-navy">Hard Mode Mock Exam</h4>
                      <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">Elite Only</span>
                    </div>
                    <p className="text-sm md:text-base text-gray-600 mb-4">Push yourself with the toughest questions from your subject pool. Practice under realistic exam pressure conditions.</p>

                    <div className="grid grid-cols-3 gap-2 md:gap-6 mb-6">
                      <div className="text-center md:text-left">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Subjects</p>
                        <p className="text-2xl md:text-3xl font-bold text-navy">{subjects.length}</p>
                        <p className="text-xs text-gray-500">Hard difficulty</p>
                      </div>
                      <div className="text-center md:text-left">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Questions</p>
                        <p className="text-2xl md:text-3xl font-bold text-navy">{subjects.length * 25}</p>
                        <p className="text-xs text-gray-500">25 each</p>
                      </div>
                      <div className="text-center md:text-left">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Duration</p>
                        <p className="text-2xl md:text-3xl font-bold text-navy">60</p>
                        <p className="text-xs text-gray-500">minutes</p>
                      </div>
                    </div>

                    {subscription?.subscription_status !== "elite" && (
                      <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                        <p className="text-sm font-semibold text-red-900">⭐ Elite Exclusive Feature</p>
                        <p className="text-xs text-red-800 mt-1">Upgrade to Elite (₦5,000/6 months) to unlock hard mode exams with advanced difficulty filtering and time-pressure diagnostics.</p>
                      </div>
                    )}
                  </div>
                  {subscription?.subscription_status === "elite" ? (
                    <button
                      onClick={() => {
                        router.push("/practice/mock/session?mode=hard");
                      }}
                      className="w-full sm:w-auto px-6 py-3 md:py-2 rounded-lg font-medium whitespace-nowrap transition-all bg-red-600 text-white hover:shadow-md hover:bg-red-700"
                    >
                      Start Hard Exam
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        router.push("/pricing");
                      }}
                      className="w-full sm:w-auto px-6 py-3 md:py-2 rounded-lg font-medium whitespace-nowrap transition-all bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-md"
                    >
                      Upgrade Now ⭐
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Subjects Section */}
            {selectedUniversity && (
              <div id="subjects-section" className="animate-fadeIn">
                <h3 className="text-xl font-bold text-navy mb-4">
                  Practice Subjects
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {subjects.map(subject => (
                    <div
                      key={subject.id}
                      onClick={() => handleSelectSubject(subject)}
                      className="rounded-lg p-6 text-white cursor-pointer shadow-sm hover:shadow-lg transition-all transform hover:scale-105 min-h-[120px] flex flex-col justify-between"
                      style={{ backgroundColor: subjectColours[subject.name] || "#7B68EE" }}
                    >
                      <div>
                        <h4 className="font-bold text-lg mb-1">{subject.name}</h4>
                        <p className="text-sm text-white opacity-90">Tap to start practice</p>
                      </div>
                      <div className="text-right">
                        <svg className="w-5 h-5 inline-block opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (1/3) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Target University Card */}
            {selectedUniversity && (
              <div className="bg-white rounded-lg shadow-md border-t-4 border-forest p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Target University</h3>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-navy mb-1">{selectedUniversity.name}</h4>
                    <p className="text-xs font-semibold text-gray-500 mb-3 uppercase">{selectedUniversity.short_code}</p>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Course</p>
                      <p className="text-sm font-medium text-navy">{profile?.target_course}</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blush flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🎓</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Bank Card */}
            <div className={`rounded-lg shadow-md border-t-4 p-6 ${
              errorBank.length > 0
                ? "bg-white border-ember"
                : "bg-white border-gray-300"
            }`}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Error Bank</h3>
              {errorBank.length > 0 ? (
                <>
                  <p className="text-4xl font-bold text-navy mb-2">{errorBank.length}</p>
                  <p className="text-sm text-gray-600 mb-4">Questions to review</p>
                  <button
                    onClick={() => router.push("/error-bank")}
                    className="w-full bg-ember text-white px-4 py-2 rounded-lg font-medium hover:shadow-md transition-all text-sm"
                  >
                    Review Now
                  </button>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-navy mb-2">0</p>
                  <p className="text-sm text-gray-600">No mistakes yet — keep practicing! 🎉</p>
                </>
              )}
            </div>

            {/* Motivation Card */}
            {stats && (
              <div className="bg-white rounded-lg shadow-md border-t-4 border-forest p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Your Progress</h3>

                <div className="mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="text-xs text-gray-500">Current Streak</p>
                    <p className="text-lg font-bold text-navy">Keep it up!</p>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-blush rounded-lg">
                  <p className="text-xs font-semibold text-forest mb-2 uppercase">Motivational Message</p>
                  <p className="text-sm text-navy font-medium">
                    {stats.avg_score_by_subject.length === 0
                      ? "Start your first practice session!"
                      : (() => {
                          const avgScore =
                            stats.avg_score_by_subject.length > 0
                              ? Math.round(
                                  stats.avg_score_by_subject.reduce((sum, s) => sum + s.avg_percentage, 0) /
                                    stats.avg_score_by_subject.length
                                )
                              : 0;
                          if (avgScore < 40) return "Keep going — practice makes perfect! 💪";
                          if (avgScore < 60) return "Good progress! Focus on weak topics.";
                          if (avgScore < 80) return "You're getting there! Push for 80%. 🎯";
                          return "Outstanding! You're exam-ready! 🌟";
                        })()}
                  </p>
                </div>

                <button
                  onClick={() => router.push("/analytics")}
                  className="w-full px-4 py-2 bg-forest text-white rounded-lg font-medium hover:shadow-md transition-all text-sm"
                >
                  View Full Analytics
                </button>
              </div>
            )}

            {/* Prediction Card */}
            {prediction && prediction.status !== "no_data" && (
              <div className={`bg-white rounded-lg shadow-md border-t-4 p-6 ${
                prediction.status === "on_track" ? "border-green-500" : "border-amber-500"
              }`}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Admission Target</h3>

                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Your UTME Score</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-2xl font-bold text-navy">{prediction.utme_score}</p>
                      <p className="text-sm text-gray-500">/400</p>
                      {prediction.utme_qualifies && (
                        <span className="text-xs font-semibold text-green-600 ml-auto">✓ Qualifies</span>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-500 mb-1">Target Post-UTME Score</p>
                    <p className="text-2xl font-bold text-navy">{prediction.required_putme_score}%</p>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-500 mb-1">Your Current Average</p>
                    <p className={`text-lg font-bold ${
                      (prediction.current_practice_avg ?? 0) >= (prediction.required_putme_score ?? 0)
                        ? "text-green-600"
                        : "text-amber-600"
                    }`}>
                      {prediction.current_practice_avg ?? 0}%
                    </p>
                    {(prediction.current_practice_avg ?? 0) < (prediction.required_putme_score ?? 0) && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠ Need {(prediction.required_putme_score ?? 0) - (prediction.current_practice_avg ?? 0)}% more
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => router.push("/analytics")}
                  className="w-full px-4 py-2 bg-forest text-white rounded-lg font-medium hover:shadow-md transition-all text-sm"
                >
                  View Detailed Prediction
                </button>
              </div>
            )}

            {prediction?.status === "no_data" && (
              <div className="bg-white rounded-lg shadow-md border-t-4 border-gray-300 p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Admission Target</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Complete your profile with UTME score to see your admission prediction
                </p>
                <button
                  onClick={() => router.push("/profile")}
                  className="w-full px-4 py-2 bg-forest text-white rounded-lg font-medium hover:shadow-md transition-all text-sm"
                >
                  Set UTME Score
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        {!sessionsLoaded ? (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-navy">Recent Practice Sessions</h3>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Topic</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">University</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
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
        ) : sessions.length > 0 ? (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-navy">Recent Practice Sessions</h3>
              <span className="text-sm text-gray-500">{sessions.length} total</span>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Topic</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">University</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 5).map(session => (
                    <tr key={session.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center text-gray-900 gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: session.subject_colour_token || "#666" }}
                          />
                          <span className="font-medium">{session.subject_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {session.topic_name || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {session.university_short_code}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`font-semibold ${
                            session.percentage >= 50 ? "text-forest" : "text-red-600"
                          }`}
                        >
                          {session.percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(session.started_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <h3 className="text-xl font-bold text-navy mb-6">Recent Practice Sessions</h3>
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 text-sm">No practice sessions yet. Start with a subject above to begin!</p>
            </div>
          </div>
        )}
      </main>

      {showCompletionModal && (
        <ProfileCompletionModal onComplete={() => setShowCompletionModal(false)} />
      )}

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
