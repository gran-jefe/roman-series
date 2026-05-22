"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import type { Topic, Subject, University, SessionHistoryItem } from "types";
import toast from "react-hot-toast";
import { CardSkeleton } from "@/components/skeletons";

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ backgroundColor: loading ? "#7B68EE" : subjectColour }} className="text-white py-6 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm mb-2 hover:opacity-80 flex items-center gap-1"
            >
              ← Back
            </button>
            {loading ? (
              <div className="h-8 w-48 bg-gray-300 rounded animate-pulse" />
            ) : (
              <h1 className="text-2xl font-bold">
                {subject?.name} — {university?.short_code}
              </h1>
            )}
          </div>
          <button
            onClick={handlePracticeAll}
            disabled={loading}
            className="px-6 py-2 bg-white text-gray-900 rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50"
          >
            Practice All Topics
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {loading ? (
          <div className="grid grid-cols-2 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : topics.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">No questions uploaded yet for this subject</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {topics.map(topic => {
              const avgScore = getTopicAvgScore(topic.id);
              return (
                <div key={topic.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-navy">{topic.name}</h3>
                    </div>
                  </div>

                  {avgScore !== null ? (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Your average</span>
                        <span className="text-sm font-bold text-green-600">{avgScore}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-forest h-2 rounded-full transition-all"
                          style={{ width: `${avgScore}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 py-2">
                      <p className="text-sm text-gray-500">Not attempted</p>
                    </div>
                  )}

                  <button
                    onClick={() => handlePracticeTopic(topic.id)}
                    className="w-full py-2 rounded-lg font-medium transition"
                    style={{
                      backgroundColor: subjectColour,
                      color: "white",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                  >
                    Practice
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
