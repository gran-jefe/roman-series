"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";

type Step = "mood" | "rating" | "category" | "message" | "success";

const MOOD_OPTIONS = [
  { emoji: "😍", label: "Love it", value: "love" },
  { emoji: "😊", label: "Like it", value: "like" },
  { emoji: "😐", label: "It's okay", value: "okay" },
  { emoji: "😕", label: "Could be better", value: "better" },
  { emoji: "😤", label: "Frustrated", value: "frustrated" },
];

const CATEGORY_OPTIONS = [
  { emoji: "📚", label: "Questions Quality", value: "questions" },
  { emoji: "🎨", label: "App Design", value: "ui" },
  { emoji: "⚡", label: "Performance", value: "performance" },
  { emoji: "✨", label: "Features", value: "features" },
  { emoji: "🐛", label: "Found a Bug", value: "other" },
  { emoji: "💭", label: "General", value: "general" },
];

const RATING_LABELS = {
  1: "Needs work",
  2: "Not great",
  3: "Okay",
  4: "Good",
  5: "Excellent!",
};

export default function FeedbackPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [step, setStep] = useState<Step>("mood");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not authenticated
  if (!loading && !user) {
    router.push("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-blue-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    setTimeout(() => setStep("rating"), 300);
  };

  const handleRatingSelect = (rating: number) => {
    setSelectedRating(rating);
    setTimeout(() => setStep("category"), 300);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setTimeout(() => setStep("message"), 300);
  };

  const handleSubmit = async () => {
    if (!selectedMood || !selectedRating || !selectedCategory) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("/api/feedback", {
        rating: selectedRating,
        category: selectedCategory,
        message: message.trim() || null,
        emoji_mood: selectedMood,
      });

      setStep("success");
    } catch (error: any) {
      console.error("Failed to submit feedback:", error);
      toast.error(error?.response?.data?.message || "Failed to submit feedback");
      setIsSubmitting(false);
    }
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-blue-900 flex items-center justify-center p-4">
        <style>{`
          @keyframes float-up {
            0% {
              opacity: 1;
              transform: translateY(0) rotate(0deg);
            }
            100% {
              opacity: 0;
              transform: translateY(-100px) rotate(20deg);
            }
          }

          .floating-star {
            animation: float-up 3s ease-out forwards;
          }
        `}</style>

        <div className="max-w-md w-full">
          {/* Floating stars background */}
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="floating-star fixed pointer-events-none"
              style={{
                left: `${20 + i * 15}%`,
                top: "50%",
                animationDelay: `${i * 0.2}s`,
              }}
            >
              ⭐
            </div>
          ))}

          <div className="bg-white rounded-xl shadow-2xl p-8 text-center relative z-10">
            <div className="text-6xl mb-6 animate-bounce">🎉</div>
            <h1 className="text-3xl font-bold text-navy mb-2">Thank you so much!</h1>
            <p className="text-gray-600 mb-8 text-lg">
              Your feedback helps us make Roman Series better for every Nigerian student aiming for their dream course.
            </p>

            <button
              onClick={handleBackToDashboard}
              className="w-full px-6 py-3 bg-forest text-white rounded-lg font-semibold hover:bg-opacity-90 transition-all transform hover:scale-105"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-blue-900 flex items-center justify-center p-4">
      <style>{`
        @keyframes bounce-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.25); }
        }

        .mood-button.selected {
          animation: bounce-scale 0.3s ease-out;
        }
      `}</style>

      <div className="max-w-2xl w-full">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {(["mood", "rating", "category", "message"] as Step[]).map((s, idx) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                step === s
                  ? "bg-forest w-8"
                  : (["mood", "rating", "category", "message"] as Step[]).indexOf(step) > idx
                  ? "bg-forest w-6"
                  : "bg-gray-400 w-6"
              }`}
            />
          ))}
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          {/* STEP 1: Mood */}
          {step === "mood" && (
            <div className="animate-fade-in">
              <h2 className="text-2xl md:text-3xl font-bold text-navy mb-8 text-center">
                How are you feeling about Roman Series? 🎯
              </h2>

              <div className="grid grid-cols-5 gap-3">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => handleMoodSelect(mood.value)}
                    className={`mood-button flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      selectedMood === mood.value
                        ? "border-forest bg-green-50 scale-125"
                        : "border-gray-200 hover:border-forest"
                    }`}
                  >
                    <span className="text-4xl">{mood.emoji}</span>
                    <span className="text-xs font-semibold text-navy text-center">{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Rating */}
          {step === "rating" && (
            <div className="animate-fade-in">
              <h2 className="text-2xl md:text-3xl font-bold text-navy mb-8 text-center">
                Rate your experience
              </h2>

              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRatingSelect(star)}
                    className="text-5xl transition-all transform hover:scale-125"
                    style={{
                      filter:
                        !selectedRating || star <= selectedRating
                          ? "grayscale(0%)"
                          : "grayscale(100%)",
                    }}
                  >
                    ⭐
                  </button>
                ))}
              </div>

              {selectedRating && (
                <p className="text-center text-lg font-semibold text-forest">
                  {selectedRating} — {RATING_LABELS[selectedRating as keyof typeof RATING_LABELS]}
                </p>
              )}
            </div>
          )}

          {/* STEP 3: Category */}
          {step === "category" && (
            <div className="animate-fade-in">
              <h2 className="text-2xl md:text-3xl font-bold text-navy mb-8 text-center">
                What are you rating?
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => handleCategorySelect(cat.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all font-semibold text-sm ${
                      selectedCategory === cat.value
                        ? "border-forest bg-green-50 text-forest"
                        : "border-gray-200 text-navy hover:border-forest"
                    }`}
                  >
                    <span className="text-2xl">{cat.emoji}</span>
                    <span className="text-center leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Message */}
          {step === "message" && (
            <div className="animate-fade-in">
              <h2 className="text-2xl md:text-3xl font-bold text-navy mb-8 text-center">
                Tell us more... (optional)
              </h2>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                placeholder="Your thoughts help us build a better Roman Series for Nigerian students 🇳🇬"
                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-forest focus:outline-none resize-none"
                rows={6}
              />

              <div className="text-right text-sm text-gray-500 mt-2">
                {message.length}/500
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full mt-6 px-6 py-3 bg-forest text-white rounded-lg font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSubmitting ? "opacity-75" : ""
                }`}
              >
                {isSubmitting ? "Sending..." : "Send Feedback 🚀"}
              </button>
            </div>
          )}
        </div>

        {/* Footer link */}
        <p className="text-center text-white/60 text-sm mt-6">
          <Link href="/dashboard" className="hover:text-white underline">
            Back to Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
