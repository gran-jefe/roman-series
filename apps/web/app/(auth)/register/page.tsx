"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import type { University } from "types";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [universities, setUniversities] = useState<University[]>([
    {
      id: "055b85ef-6d9c-4b7a-bdda-51597b90ed76",
      name: "University of Ibadan",
      short_code: "UI",
      colour_token: "navy",
      is_available: true,
      created_at: "2026-04-15T22:22:51.866064+00:00",
      updated_at: "2026-04-15T22:22:51.866064+00:00",
    },
  ]);
  const [courses, setCourses] = useState<string[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    target_university_id: "055b85ef-6d9c-4b7a-bdda-51597b90ed76", // University of Ibadan
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
              {universities.length > 0 ? (
                universities.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.name}
                  </option>
                ))
              ) : (
                <option disabled>Loading universities...</option>
              )}
            </select>
          </div>

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
