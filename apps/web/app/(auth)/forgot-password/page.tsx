"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      await api.post("/api/auth/forgot-password", { email });
      setSuccess(true);
      setEmail("");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to send password reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy to-deep-blue flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-navy mb-2">Reset Password</h1>
        <p className="text-gray-600 mb-6">
          Enter your email and we'll send you a link to reset your password
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-ember rounded text-ember text-sm">
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-forest rounded text-forest text-sm">
              ✓ Password reset email sent! Check your email for further
              instructions.
            </div>

            <div className="space-y-3 text-sm text-center">
              <p className="text-gray-600">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <Link
                href="/login"
                className="block py-2 px-4 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition-opacity"
              >
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest focus:ring-opacity-20"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          Remember your password?{" "}
          <Link href="/login" className="text-forest font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
