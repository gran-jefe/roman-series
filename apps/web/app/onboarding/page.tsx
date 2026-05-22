"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";
import type { Subject, CutoffMark, University } from "types";

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
  const maxSubjects = 4; // Allow up to 4 subjects for UTME exam during onboarding
  const [step, setStep] = useState<1 | 2>(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [utmeScore, setUtmeScore] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [cutoffMark, setCutoffMark] = useState<CutoffMark | null>(null);
  const [universityName, setUniversityName] = useState<string>("");

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
      } else if (prev.length < maxSubjects) {
        return [...prev, subjectId];
      }
      return prev;
    });
  };

  const handleStep1Continue = async () => {
    const minSubjects = maxSubjects <= 2 ? 2 : 3;
    const maxAllowed = maxSubjects;

    if (selected.length < minSubjects || selected.length > maxAllowed) {
      if (minSubjects === maxAllowed) {
        toast.error(`Please select exactly ${minSubjects} subject${minSubjects > 1 ? 's' : ''}`);
      } else {
        toast.error(`Please select between ${minSubjects} and ${maxAllowed} subjects`);
      }
      return;
    }

    setSubmitting(true);
    try {
      await api.patch("/api/profiles/subject-combination", {
        subject_combination: selected,
      });

      toast.success("Subject combination saved!");

      // Fetch university name and cutoff mark for step 2
      if (profile?.target_university_id && profile?.target_course) {
        try {
          // Fetch university name
          const uniRes = await api.get("/api/universities");
          const universities = uniRes.data.data || [];
          const university = universities.find((u: University) => u.id === profile.target_university_id);
          if (university) {
            setUniversityName(university.name);
          }
        } catch (error) {
          console.error("Failed to fetch university:", error);
        }

        try {
          // Fetch cutoff mark
          const res = await api.get("/api/cutoff-marks", {
            params: {
              universityId: profile.target_university_id,
              course: profile.target_course,
            },
          });
          if (res.data.data?.length > 0) {
            setCutoffMark(res.data.data[0]);
          }
        } catch (error) {
          console.error("Failed to fetch cutoff mark:", error);
        }
      }

      setStep(2);
      setSubmitting(false);
    } catch (error) {
      console.error("Failed to save subject combination:", error);
      toast.error("Failed to save subject combination");
      setSubmitting(false);
    }
  };

  const handleStep2Submit = async () => {
    if (!utmeScore || isNaN(parseInt(utmeScore))) {
      toast.error("Please enter a valid UTME score");
      return;
    }

    const score = parseInt(utmeScore);
    if (score < 0 || score > 400) {
      toast.error("UTME score must be between 0 and 400");
      return;
    }

    setSubmitting(true);
    try {
      await api.patch("/api/profiles/utme-score", {
        utme_score: score,
      });

      toast.success("UTME score saved!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to save UTME score:", error);
      toast.error("Failed to save UTME score");
      setSubmitting(false);
    }
  };

  const handleStep2Skip = async () => {
    router.push("/dashboard");
  };

  if (pageLoading || loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-blush">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Step {step} of 2</span>
            <span className="text-sm text-gray-500">
              {step === 1 ? "Subject Selection" : "UTME Score"}
            </span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2">
            <div
              className="bg-forest h-2 rounded-full transition-all"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
        </div>

        {step === 1 ? (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-navy mb-4">Select Your Subjects</h1>
              <p className="text-lg text-gray-600 mb-2">
                {maxSubjects <= 2
                  ? `Choose ${maxSubjects} subjects to focus your prep`
                  : `Choose between ${maxSubjects - 1} and ${maxSubjects} subjects to focus your prep`}
              </p>
              <p className="text-sm text-gray-500 mb-3">
                Only available subjects are shown. You can select "Other" for subjects not listed in our database.
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
                  <span className="text-gray-600 ml-2">
                    / {maxSubjects <= 2 ? maxSubjects : `${maxSubjects - 1}-${maxSubjects}`} subjects selected
                  </span>
                </p>
              </div>
            </div>

            {/* Subject Grid */}
            <div className="grid grid-cols-2 gap-4 mb-12">
              {subjects.map((subject) => {
                const isSelected = selected.includes(subject.id);
                const canSelect = !isSelected && selected.length < maxSubjects;

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

              {/* Other Option */}
              <button
                onClick={() => toggleSubject("other")}
                disabled={!selected.includes("other") && selected.length >= 4}
                className={`relative p-6 rounded-lg transition-all cursor-pointer overflow-hidden border-2 ${
                  selected.includes("other")
                    ? "ring-4 ring-offset-2 ring-forest shadow-lg scale-105 border-forest bg-white"
                    : selected.length < 4
                    ? "hover:shadow-md hover:scale-102 border-gray-300 bg-gray-50"
                    : "opacity-50 cursor-not-allowed border-gray-300 bg-gray-50"
                }`}
              >
                <div className={`text-center ${selected.includes("other") ? "text-forest" : "text-gray-700"}`}>
                  <h3 className="font-bold text-lg mb-2">Other Subjects</h3>
                  <p className="text-xs opacity-75">Subjects not listed above</p>
                  {selected.includes("other") && (
                    <div className="flex justify-center mt-2">
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
            </div>

            {/* Continue Button */}
            <div className="flex justify-center">
              <button
                onClick={handleStep1Continue}
                disabled={selected.length < 3 || selected.length > 4 || submitting}
                className={`px-12 py-3 rounded-lg font-medium text-white transition-opacity ${
                  (selected.length === 3 || selected.length === 4) && !submitting
                    ? "bg-forest hover:bg-opacity-90"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {submitting ? "Saving..." : "Continue"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-navy mb-4">What was your UTME score?</h1>
              <p className="text-lg text-gray-600">
                Help us predict your Post-UTME target score
              </p>
            </div>

            {/* University & Course Display */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Target University</p>
                  <p className="text-lg font-semibold text-navy">{universityName || profile?.target_university_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Course of Study</p>
                  <p className="text-lg font-semibold text-navy">{profile?.target_course}</p>
                </div>
              </div>
            </div>

            {/* Cutoff Mark Display */}
            {cutoffMark && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <p className="text-sm text-blue-600 font-medium mb-2">Cutoff Information</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Min UTME Required</p>
                    <p className="text-xl font-bold text-navy">{cutoffMark.utme_cutoff}/400</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Combined Cutoff</p>
                    <p className="text-xl font-bold text-navy">{cutoffMark.combined_cutoff}/100</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Year</p>
                    <p className="text-xl font-bold text-navy">{cutoffMark.year}</p>
                  </div>
                </div>
              </div>
            )}

            {/* UTME Score Input */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <label className="block mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Your UTME Score (0-400)</p>
                <input
                  type="number"
                  min="0"
                  max="400"
                  value={utmeScore}
                  onChange={(e) => setUtmeScore(e.target.value)}
                  placeholder="Enter your score"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest"
                />
              </label>
              <p className="text-xs text-gray-500">
                Out of 400 total marks across 4 subjects
              </p>

              {utmeScore && cutoffMark && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">Status:</span>
                    {cutoffMark.utme_cutoff && parseInt(utmeScore) >= cutoffMark.utme_cutoff ? (
                      <span className="text-sm font-medium text-green-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        You qualify for this course!
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-amber-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Score is below cutoff ({cutoffMark.utme_cutoff}/400)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleStep2Skip}
                disabled={submitting}
                className="px-8 py-3 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                Skip for Now
              </button>
              <button
                onClick={handleStep2Submit}
                disabled={!utmeScore || submitting}
                className={`px-8 py-3 rounded-lg font-medium text-white transition-opacity ${
                  utmeScore && !submitting
                    ? "bg-forest hover:bg-opacity-90"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {submitting ? "Saving..." : "Complete Onboarding"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
