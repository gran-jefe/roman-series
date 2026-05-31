import { useEffect, useState } from "react";
import api from "@/lib/api";

interface MockExamLimitInfo {
  isLoading: boolean;
  completedMocks: number;
  mockLimit: number | null;
  hasExhausted: boolean;
  canTakeMock: boolean;
}

export function useMockExamLimit(subscriptionStatus?: string): MockExamLimitInfo {
  const [completedMocks, setCompletedMocks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const mockLimit = subscriptionStatus === "explorer" ? 2 : null; // Explorer has 2, Scholar has 3/week, Elite unlimited
  const hasExhausted = mockLimit !== null && completedMocks >= mockLimit;
  const canTakeMock = !hasExhausted;

  useEffect(() => {
    const fetchMockCount = async () => {
      try {
        setIsLoading(true);
        // Fetch sessions to count completed mocks
        const response = await api.get("/api/sessions/history");
        if (response.data.status === "success") {
          const sessions = response.data.data || [];
          const completedMockCount = sessions.filter(
            (s: any) => s.is_mock && s.completed
          ).length;
          setCompletedMocks(completedMockCount);
        }
      } catch (error) {
        console.error("Failed to fetch mock exam count:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (subscriptionStatus === "explorer") {
      fetchMockCount();
    } else {
      setIsLoading(false);
    }
  }, [subscriptionStatus]);

  return {
    isLoading,
    completedMocks,
    mockLimit,
    hasExhausted,
    canTakeMock,
  };
}
