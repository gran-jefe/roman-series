"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { PageLoader } from "@/components/PageLoader";
import { Navbar } from "@/components/Navbar";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [targetCourse, setTargetCourse] = useState("");
  const [utmeScore, setUtmeScore] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setTargetCourse(profile.target_course || "");
      setUtmeScore(profile.utme_score?.toString() || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    setIsSaving(true);
    try {
      await api.patch("/api/profiles/me", {
        full_name: fullName,
        target_course: targetCourse,
        utme_score: utmeScore ? parseInt(utmeScore) : null,
      });

      toast.success("Profile updated successfully!");
      await refreshProfile();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!user || !profile) {
    return null;
  }

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

  return (
    <div className="min-h-screen bg-blush">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-navy">My Profile</h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-forest text-white rounded-lg hover:bg-opacity-90 transition-opacity"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          {/* Avatar & Basic Info */}
          <div className="flex items-start gap-6 mb-8 pb-8 border-b">
            <div className="w-16 h-16 bg-forest text-white rounded-full flex items-center justify-center text-2xl font-bold">
              {profile.full_name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="text-2xl font-bold text-navy border-b-2 border-forest outline-none w-full mb-2"
                />
              ) : (
                <h2 className="text-2xl font-bold text-navy mb-2">{profile.full_name}</h2>
              )}
              <p className="text-gray-600">Email: {user.email}</p>
            </div>
          </div>

          {/* University & Course */}
          <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Target University</p>
              <p className="text-lg text-navy font-semibold">
                {profile.target_university?.name || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Course of Study</p>
              {isEditing ? (
                <input
                  type="text"
                  value={targetCourse}
                  onChange={(e) => setTargetCourse(e.target.value)}
                  className="text-lg border-b-2 border-forest outline-none w-full"
                />
              ) : (
                <p className="text-lg text-navy font-semibold">{profile.target_course}</p>
              )}
            </div>
          </div>

          {/* UTME Score */}
          <div className="mb-8 pb-8 border-b">
            <p className="text-sm font-medium text-gray-500 mb-2">UTME Score</p>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="400"
                  value={utmeScore}
                  onChange={(e) => setUtmeScore(e.target.value)}
                  placeholder="Enter UTME score"
                  className="text-2xl border-b-2 border-forest outline-none w-24"
                />
                <span className="text-gray-600">/400</span>
              </div>
            ) : (
              <p className="text-2xl text-navy font-bold">
                {profile.utme_score ? `${profile.utme_score}/400` : "Not provided"}
              </p>
            )}
          </div>

          {/* Subjects */}
          {profile.subject_combination && profile.subject_combination.length > 0 && (
            <div className="mb-8">
              <p className="text-sm font-medium text-gray-500 mb-4">Subjects</p>
              <div className="flex flex-wrap gap-3">
                {/* Note: We'd need subject names from API to display properly */}
                {profile.subject_combination.map((subjectId) => (
                  <div
                    key={subjectId}
                    className="px-4 py-2 rounded-full text-white text-sm font-medium"
                    style={{ backgroundColor: "#7B68EE" }}
                  >
                    Subject
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subscription Status */}
          <div className="mb-8 pb-8 border-b">
            <p className="text-sm font-medium text-gray-500 mb-2">Subscription</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg text-navy font-semibold capitalize">
                  {profile.subscription_status}
                </p>
                {profile.subscription_expires_at && (
                  <p className="text-sm text-gray-600">
                    Expires: {new Date(profile.subscription_expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              {profile.subscription_status === "free" && (
                <button className="px-4 py-2 bg-forest text-white rounded-lg hover:bg-opacity-90 transition-opacity">
                  Upgrade
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFullName(profile.full_name || "");
                  setTargetCourse(profile.target_course || "");
                  setUtmeScore(profile.utme_score?.toString() || "");
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-opacity ${
                  isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-forest hover:bg-opacity-90"
                }`}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
