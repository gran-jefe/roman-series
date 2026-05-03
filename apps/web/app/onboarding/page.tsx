"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";
import type { Subject } from "types";

const subjectColours: Record<string, string> = {
  Biology: "#1A7A4A",
  Chemistry: "#8B2252",
  Physics: "#7B4F1A",
  Government: "#1E3A5F",
  Literature: "#C4522A",
  CRS: "#D97B20",
  IRS: "#B0287A",
  English: "#2166B2",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Guard: redirect if already has subject combination
  useEffect(() => {
    if (!loading && profile?.subject_combination?.length) {
      router.push("/dashboard");
    }
  }, [profile, loading, router]);

  // Guard: redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch all subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get("/api/subjects");
        setSubjects(res.data.data || []);
        setPageLoading(false);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
        toast.error("Failed to load subjects");
        setPageLoading(false);
      }
    };

    if (!loading && user) {
      fetchSubjects();
    }
  }, [user, loading]);

  const toggleSubject = (subjectId: string) => {
    setSelected((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((id) => id !== subjectId);
      } else if (prev.length < 4) {
        return [...prev, subjectId];
      }
      return prev;
    });
  };

  const handleContinue = async () => {
    if (selected.length !== 4) {
      toast.error("Please select exactly 4 subjects");
      return;
    }

    setSubmitting(true);
    try {
      await api.patch("/api/profiles/subject-combination", {
        subject_combination: selected,
      });

      toast.success("Subject combination saved!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to save subject combination:", error);
      toast.error("Failed to save subject combination");
      setSubmitting(false);
    }
  };

  if (pageLoading || loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-blush">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-navy mb-4">Select Your Subjects</h1>
          <p className="text-lg text-gray-600 mb-2">
            Choose exactly 4 subjects to focus your prep
          </p>
          <p className="text-sm text-gray-500">
            You can change this later, but this determines which questions you'll see
          </p>
        </div>

        {/* Selection Counter */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow p-4 inline-block">
            <p className="text-center">
              <span className="text-3xl font-bold text-forest">{selected.length}</span>
              <span className="text-gray-600 ml-2">/ 4 subjects selected</span>
            </p>
          </div>
        </div>

        {/* Subject Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {subjects.map((subject) => {
            const isSelected = selected.includes(subject.id);
            const canSelect = !isSelected && selected.length < 4;

            return (
              <button
                key={subject.id}
                onClick={() => toggleSubject(subject.id)}
                disabled={!isSelected && !canSelect}
                className={`relative p-6 rounded-lg transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? "ring-4 ring-offset-2 ring-forest shadow-lg scale-105"
                    : canSelect
                    ? "hover:shadow-md hover:scale-102"
                    : "opacity-50 cursor-not-allowed"
                }`}
                style={{
                  backgroundColor: subjectColours[subject.name] || "#7B68EE",
                }}
              >
                <div className="text-white text-center">
                  <h3 className="font-bold text-lg mb-2">{subject.name}</h3>
                  {isSelected && (
                    <div className="flex justify-center">
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            disabled={selected.length !== 4 || submitting}
            className={`px-12 py-3 rounded-lg font-medium text-white transition-opacity ${
              selected.length === 4 && !submitting
                ? "bg-forest hover:bg-opacity-90"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {submitting ? "Saving..." : "Continue to Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
