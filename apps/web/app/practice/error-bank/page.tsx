"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import api from "@/lib/api";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";

export default function ErrorBankPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questionsParam = searchParams.get("questions");

  useEffect(() => {
    const startErrorBankSession = async () => {
      if (!questionsParam) {
        router.push("/dashboard");
        return;
      }

      const question_ids = questionsParam.split(",");

      try {
        const res = await api.post("/api/sessions/error-bank/start", {
          question_ids,
        });

        const sessionId = res.data.data.session_id;
        const questions = res.data.data.questions;

        // Store in sessionStorage like regular practice sessions
        sessionStorage.setItem(
          `session_questions_${sessionId}`,
          JSON.stringify(questions)
        );
        sessionStorage.setItem(
          `session_meta_${sessionId}`,
          JSON.stringify({
            subject: null,
            university: null,
            total_questions: questions.length,
            is_error_bank: true,
          })
        );

        router.push(`/practice/session?sessionId=${sessionId}`);
      } catch (error) {
        console.error("Failed to start error bank session:", error);
        toast.error("Failed to start error bank session");
        router.push("/dashboard");
      }
    };

    startErrorBankSession();
  }, [questionsParam, router]);

  return <PageLoader message="Loading error bank session..." />;
}
