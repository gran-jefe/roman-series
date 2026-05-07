"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface ProfileCompletionModalProps {
  onComplete: () => void;
}

export function ProfileCompletionModal({ onComplete }: ProfileCompletionModalProps) {
  const { refreshProfile } = useAuth();
  const [course, setCourse] = useState("");
  const [score, setScore] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!course.trim()) {
      setError("Course of Study is required");
      return;
    }

    if (!score.trim()) {
      setError("UTME Score is required");
      return;
    }

    const scoreNum = parseInt(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 400) {
      setError("UTME Score must be between 0 and 400");
      return;
    }

    setSaving(true);
    try {
      await api.patch("/api/profiles/me", {
        target_course: course,
        utme_score: scoreNum,
      });

      await refreshProfile();
      toast.success("Profile completed successfully!");
      onComplete();
    } catch (error) {
      console.error("Failed to update profile:", error);
      setError("Failed to update profile. Please try again.");
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-navy mb-2">Complete Your Profile</h2>
        <p className="text-gray-600 mb-6">
          Please provide your course of study and UTME score to get started.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-ember/10 border border-ember text-ember rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
              Course of Study
            </label>
            <input
              id="course"
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g., Medicine, Engineering, Law"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="score" className="block text-sm font-medium text-gray-700 mb-1">
              UTME Score
            </label>
            <div className="flex items-center gap-2">
              <input
                id="score"
                type="number"
                min="0"
                max="400"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="0"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                disabled={saving}
              />
              <span className="text-gray-600 font-medium">/400</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full px-4 py-3 rounded-lg font-medium text-white transition-opacity ${
              saving
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-forest hover:bg-opacity-90"
            }`}
          >
            {saving ? "Saving..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
