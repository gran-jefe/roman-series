"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const token = searchParams.get("code");

  useEffect(() => {
    // Check if we have the required token from Supabase
    if (!token) {
      setIsValidToken(false);
      setError(
        "Invalid or missing reset token. Please request a new password reset.",
      );
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase configuration missing");
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Exchange the code for a session
      const { data: sessionData, error: sessionError } =
        await supabase.auth.exchangeCodeForSession(token!);

      if (sessionError || !sessionData.session) {
        setError(
          "Invalid or expired reset link. Please request a new password reset.",
        );
        setIsValidToken(false);
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || "Failed to update password");
        return;
      }

      setSuccess(true);
      toast.success("Password reset successfully!");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to reset password";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy to-deep-blue flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-forest rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
            RS
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Roman Series</h1>
          <p className="text-gray-400">Ace Post-UTME Exams</p>
        </div>

        {/* Reset Password Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {!isValidToken ? (
            <>
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-navy mb-2">
                  Invalid Reset Link
                </h2>
                <p className="text-gray-600 text-sm mb-6">
                  The password reset link is invalid or has expired. Please
                  request a new one.
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  href="/forgot-password"
                  className="block w-full bg-forest text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-opacity text-center"
                >
                  Request New Reset Link
                </Link>
                <Link
                  href="/login"
                  className="block w-full border-2 border-forest text-forest py-3 rounded-lg font-semibold hover:bg-forest hover:text-white transition-all text-center"
                >
                  Back to Sign In
                </Link>
              </div>
            </>
          ) : success ? (
            <>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-navy mb-2">
                  Password Reset Successful
                </h2>
                <p className="text-gray-600 text-sm mb-6">
                  Your password has been reset successfully. Redirecting to
                  login...
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-navy mb-6">
                Create New Password
              </h2>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                      placeholder="••••••••"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      disabled={loading}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm6.5-2.5h.02l3.15 3.15c.09-.3.13-.62.13-.95 0-2.76-2.24-5-5-5-.33 0-.65.04-.95.13L14.03 7.3z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                      placeholder="••••••••"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      disabled={loading}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm6.5-2.5h.02l3.15 3.15c.09-.3.13-.62.13-.95 0-2.76-2.24-5-5-5-.33 0-.65.04-.95.13L14.03 7.3z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-forest text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>

              <div className="mt-6 border-t border-gray-200 pt-6">
                <p className="text-center text-gray-600 text-sm">
                  <Link
                    href="/login"
                    className="text-forest font-semibold hover:underline"
                  >
                    Back to sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-8">
          © 2025 Roman Series. All rights reserved.
        </p>
      </div>
    </div>
  );
}
