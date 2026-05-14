"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import supabase from "@/lib/supabase";
import { storeTokens } from "@/lib/api";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");

        if (!code) {
          throw new Error("No authorization code received");
        }

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.session) {
          throw error || new Error("Failed to exchange code for session");
        }

        // Store tokens
        const expiresIn = data.session.expires_in || 86400;
        storeTokens(
          data.session.access_token,
          data.session.refresh_token,
          expiresIn
        );

        // Verify/create profile via API
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        try {
          const profileRes = await axios.get("/api/auth/me", {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
            baseURL: apiUrl,
          });

          const profile = profileRes.data.data?.profile;

          // If user doesn't have subjects selected, redirect to onboarding
          if (!profile?.subject_combination?.length) {
            router.push("/onboarding");
          } else {
            router.push("/dashboard");
          }
        } catch {
          // If profile fetch fails, still allow redirect to dashboard/onboarding
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("[auth/callback] Error:", error);
        // Redirect to login on error
        router.push("/login?error=callback_failed");
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy to-deep-blue flex items-center justify-center px-4">
      <div className="text-center">
        <div className="inline-block mb-4 p-4 bg-white rounded-full">
          <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin" />
        </div>
        <h1 className="text-white text-xl font-semibold">Completing sign-in...</h1>
      </div>
    </div>
  );
}
