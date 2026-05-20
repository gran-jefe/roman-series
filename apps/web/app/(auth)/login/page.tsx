"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AxiosError } from "axios";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Use AuthContext login which handles tokens and user state
      await authLogin(formData.email, formData.password);
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(
        error.response?.data?.message || "Failed to login. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy to-deep-blue flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-navy mb-2">Welcome Back</h1>
        <p className="text-gray-600 mb-6">
          Sign in to your Roman Series account
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-ember rounded text-ember text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-1">
              Email Address
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
              Password
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-sm">
          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-forest hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="text-center text-gray-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-forest font-medium hover:underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
