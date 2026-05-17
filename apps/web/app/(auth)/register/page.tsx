"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { createBrowserClient } from '@supabase/ssr';
import type { University } from "types";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    target_university_id: "",
    target_course: "",
  });

  // Fetch universities on mount
  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const response = await api.get("/api/universities");
        setUniversities(response.data.data);
      } catch {
        console.log("Universities endpoint not yet available");
      }
    };

    fetchUniversities();
  }, []);

  // Fetch courses when university changes
  useEffect(() => {
    if (!formData.target_university_id) {
      setCourses([]);
      setFormData((prev) => ({ ...prev, target_course: "" }));
      return;
    }

    const fetchCourses = async () => {
      setCoursesLoading(true);
      try {
        const response = await api.get("/api/cutoff-marks", {
          params: { universityId: formData.target_university_id },
        });
        const courseSet = new Set(
          response.data.data.map((r: Record<string, unknown>) => r.course as string)
        );
        const courseNames = Array.from(courseSet).sort() as string[];
        setCourses(courseNames);
        setFormData((prev) => ({ ...prev, target_course: "" }));
      } catch {
        console.log("Failed to fetch courses");
        setCourses([]);
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, [formData.target_university_id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message || "Failed to sign in with Google");
        setLoading(false);
      }
    } catch {
      setError("Failed to sign in with Google. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!formData.full_name || !formData.email || !formData.password) {
      setError("Please fill in all required fields");
      return;
    }

    if (!formData.target_university_id) {
      setError("Please select a university");
      return;
    }

    if (!formData.target_course) {
      setError("Please select a course of study");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await api.post("/api/auth/register", {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        target_university_id: formData.target_university_id,
        target_course: formData.target_course,
      });

      router.push(
        `/login?message=Account created successfully. Check your email to verify your account.`,
      );
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { message?: string } };
      };

      setError(
        apiError?.response?.data?.message ||
          "Failed to create account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy to-deep-blue flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-navy mb-2">Create Account</h1>
        <p className="text-gray-600 mb-6">
          Join Roman Series and start preparing
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-ember rounded text-ember text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest focus:ring-opacity-20"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-1">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest focus:ring-opacity-20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest focus:ring-opacity-20"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest focus:ring-opacity-20"
              placeholder="••••••••"
            />
          </div>

          {universities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-navy mb-1">
                Target University *
              </label>
              <select
                name="target_university_id"
                value={formData.target_university_id}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest focus:ring-opacity-20"
              >
                <option value="">Select a university</option>
                {universities.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-navy mb-1">
              Course of Study *
            </label>
            {formData.target_university_id ? (
              <>
                {coursesLoading ? (
                  <div className="w-full px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg">
                    Loading courses...
                  </div>
                ) : courses.length > 0 ? (
                  <select
                    name="target_course"
                    value={formData.target_course}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest focus:ring-opacity-20"
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-4 py-2 text-gray-600 bg-gray-50 border border-gray-300 rounded-lg">
                    No courses found for this university
                  </div>
                )}
              </>
            ) : (
              <div className="w-full px-4 py-2 text-gray-500 bg-gray-50 border border-gray-300 rounded-lg">
                Select a university first
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-600">or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2 px-4 bg-white border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-forest font-medium hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
