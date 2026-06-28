"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import type { Topic, Subject, University, SessionHistoryItem } from "types";
import toast from "react-hot-toast";
import { CardSkeleton } from "@/components/skeletons";
import { ArrowLeft, BookOpen, Zap } from "lucide-react";

const subjectColours: Record<string, string> = {
  Biology: "#1A7A4A",
  Chemistry: "#8B2252",
  Physics: "#7B4F1A",
  Government: "#1E3A5F",
  Literature: "#C4522A",
  CRS: "#D97B20",
  IRS: "#B0287A",
};

export default function TopicsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [university, setUniversity] = useState<University | null>(null);
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const subjectId = searchParams.get("subjectId");
  const universityId = searchParams.get("universityId");

  useEffect(() => {
    const fetchData = async () => {
      if (!subjectId || !universityId) {
        router.push("/dashboard");
        return;
      }

      setLoading(true);
      try {
        // Fetch topics
        const topicsRes = await api.get(
          `/api/topics?subjectId=${subjectId}&universityId=${universityId}`
        );
        setTopics(topicsRes.data.data || []);

        // Fetch subject
        const subjectsRes = await api.get("/api/subjects");
        const subj = (subjectsRes.data.data || []).find((s: Subject) => s.id === subjectId);
        setSubject(subj || null);

        // Fetch university
        const unisRes = await api.get("/api/universities");
        const uni = (unisRes.data.data || []).find((u: University) => u.id === universityId);
        setUniversity(uni || null);

        // Fetch sessions
        const sessionsRes = await api.get("/api/sessions/history");
        setSessions(sessionsRes.data.data || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load topics");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [subjectId, universityId, router]);

  const handlePracticeTopic = (topicId: string) => {
    router.push(
      `/practice/setup?topicId=${topicId}&subjectId=${subjectId}&universityId=${universityId}`
    );
  };

  const handlePracticeAll = () => {
    router.push(
      `/practice/setup?subjectId=${subjectId}&universityId=${universityId}`
    );
  };

  const getTopicAvgScore = (topicId: string): number | null => {
    const topicSessions = sessions.filter(s => s.topic_id === topicId);
    if (topicSessions.length === 0) return null;
    return Math.round(
      topicSessions.reduce((sum, s) => sum + s.percentage, 0) / topicSessions.length
    );
  };

  const subjectColour = subject ? subjectColours[subject.name] || "#7B68EE" : "#7B68EE";

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      {/* Header */}
      <div style={{ backgroundColor: loading ? "rgb(107, 114, 128)" : subjectColour }} className="text-white py-8 sm:py-12 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl translate-x-[-20%] translate-y-1/3 pointer-events-none"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between relative z-10">
          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm mb-3 hover:opacity-80 flex items-center gap-2 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            {loading ? (
              <div className="h-8 w-48 bg-white/20 rounded-lg animate-pulse" />
            ) : (
              <h1 className="text-3xl sm:text-4xl font-black">
                {subject?.name}
              </h1>
            )}
          </div>
          <button
            onClick={handlePracticeAll}
            disabled={loading}
            className="px-6 py-2.5 bg-white text-navy rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Practice All
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : topics.length === 0 ? (
          <div className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-600 text-lg">No questions uploaded yet for this subject</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {topics.map(topic => {
              const avgScore = getTopicAvgScore(topic.id);
              return (
                <div key={topic.id} className="bg-white/95 rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-7 hover:shadow-lg hover:border-forest/30 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-navy">{topic.name}</h3>
                    </div>
                  </div>

                  {avgScore !== null ? (
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Your average</span>
                        <span className="text-sm font-bold text-forest">{avgScore}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-forest h-2 rounded-full transition-all"
                          style={{ width: `${avgScore}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-5 py-2">
                      <p className="text-sm text-gray-500">Not attempted yet</p>
                    </div>
                  )}

                  <button
                    onClick={() => handlePracticeTopic(topic.id)}
                    className="w-full py-3 rounded-xl font-bold transition text-white flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: subjectColour,
                    }}
                  >
                    <BookOpen className="w-4 h-4" />
                    Start Practice
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
