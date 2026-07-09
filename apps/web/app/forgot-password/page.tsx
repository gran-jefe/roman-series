"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Check with the backend FIRST, unconditionally. Firebase's email
      // enumeration protection makes sendPasswordResetEmail silently resolve
      // (no throw) for accounts it doesn't know about yet, so we can't rely
      // on catching auth/user-not-found to detect "needs migration" — by the
      // time we'd check, it's already too late. This call is the actual
      // source of truth: it migrates the account server-side if needed.
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // By now a Firebase account exists for this email if one was ever
      // going to (already did, or the call above just created it).
      // TODO: pass actionCodeSettings pointing at our own /reset-password
      // page once romanseries.com.ng is added to Firebase's authorized
      // domains (Authentication -> Settings -> Authorized domains) — until
      // then, Firebase rejects any custom redirect URL outright.
      try {
        await sendPasswordResetEmail(firebaseAuth, email);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (err.code !== "auth/user-not-found") throw err;
        // Truly no account anywhere — stay silent, don't confirm or deny
        // account existence to the caller.
      }

      setSubmitted(true);
      toast.success("Check your email for password reset instructions");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errorMessage = err.message || "Failed to send reset email";
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
          <Link href="/" className="inline-block hover:opacity-80 transition">
            <Image
              src="/assets/logos/rs-logo.png"
              alt="Roman Series"
              width={120}
              height={40}
              className="h-10 w-auto mx-auto mb-4"
              priority
            />
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Roman Series<sup className="text-sm align-super">™</sup></h1>
          <p className="text-gray-400">Ace Post-UTME Exams</p>
        </div>

        {/* Forgot Password Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {!submitted ? (
            <>
              <h2 className="text-2xl font-bold text-navy mb-2">
                Reset Password
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                Enter your email address and we'll send you a link to reset your
                password.
              </p>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                    placeholder="your@email.com"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-forest text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-6 border-t border-gray-200 pt-6">
                <p className="text-center text-gray-600 text-sm">
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    className="text-forest font-semibold hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          ) : (
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
                  Check Your Email
                </h2>
                <p className="text-gray-600 text-sm mb-6">
                  We've sent a password reset link to <strong>{email}</strong>.
                  Click the link in the email to create a new password.
                </p>
                <p className="text-gray-600 text-sm mb-6">
                  Didn't receive the email? Check your spam folder or{" "}
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setEmail("");
                      setError("");
                    }}
                    className="text-forest font-semibold hover:underline"
                  >
                    try again
                  </button>
                </p>
              </div>

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
          © 2025 Roman Series™. All rights reserved.
        </p>
      </div>
    </div>
  );
}
