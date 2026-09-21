import { useAuth } from "@/context/AuthContext";
import { getFeatures } from "@/lib/subscription";
import type { FeatureAccess } from "@/lib/subscription";

interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
  currentLimit?: number;
}

export function useFeatureAccess() {
  const { profile } = useAuth();

  const features = getFeatures(profile?.subscription_status);

  const checkMockExamAccess = (): FeatureAccessResult => {
    if (features.mockExamsPerMonth === 0) {
      return {
        hasAccess: false,
        reason: "Get Elite access to unlock mock exams",
      };
    }

    // Check monthly limit for explorer users
    if (profile?.subscription_status === "explorer") {
      const lastMockDate = profile?.last_mock_exam_date;
      if (lastMockDate) {
        const lastMockTime = new Date(lastMockDate).getTime();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const lastMockDate_obj = new Date(lastMockDate);
        const lastMockMonth = lastMockDate_obj.getMonth();
        const lastMockYear = lastMockDate_obj.getFullYear();

        // If the mock was taken in the current month, deny access
        if (lastMockYear === currentYear && lastMockMonth === currentMonth) {
          const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          return {
            hasAccess: false,
            reason: `You've used your monthly mock exam. Next available: ${nextMonthDate.toLocaleDateString()}`,
          };
        }
      }
      return { hasAccess: true };
    }

    // Scholar and Elite have unlimited or high limits
    return { hasAccess: true };
  };

  const checkErrorBankAccess = (): FeatureAccessResult => {
    if (features.errorBankSize !== "none") {
      return {
        hasAccess: true,
        currentLimit:
          features.errorBankSize === "unlimited"
            ? -1
            : features.errorBankSize === "last_50"
              ? 50
              : 10,
      };
    }
    return {
      hasAccess: false,
      reason: "Get Elite access to unlock the error bank",
    };
  };

  const checkAnalyticsAccess = (): FeatureAccessResult => {
    if (features.analytics !== "none") {
      return { hasAccess: true, reason: features.analytics };
    }
    return {
      hasAccess: false,
      reason: "Get Elite access to unlock advanced analytics",
    };
  };

  const checkTopicPracticeLimit = (): number => {
    return features.maxSubjects;
  };

  const checkQuestionsPerDay = (): number => {
    return features.questionsPerDay;
  };

  const checkLeaderboardAccess = (): FeatureAccessResult => {
    const access = features.leaderboardAccess;
    if (access !== "none") {
      return { hasAccess: true, reason: access };
    }
    return {
      hasAccess: false,
      reason: "Get Elite access to unlock the leaderboard",
    };
  };

  const checkPredictedScoreAccess = (): FeatureAccessResult => {
    const access = features.predictedScore;
    if (access === "locked") {
      return {
        hasAccess: false,
        reason:
          "Get Elite access to unlock full predicted scores",
      };
    }
    return { hasAccess: true, reason: access };
  };

  const checkWeakTopicAnalysisAccess = (): FeatureAccessResult => {
    const access = features.weakTopicAnalysis;
    if (access !== "none") {
      return { hasAccess: true, reason: access };
    }
    return {
      hasAccess: false,
      reason: "Get Elite access to unlock weak topic analysis",
    };
  };

  const checkCourseComparisonAccess = (): FeatureAccessResult => {
    if (features.courseComparison) {
      return { hasAccess: true };
    }
    return {
      hasAccess: false,
      reason: "Upgrade to Elite to compare performance across courses",
    };
  };

  return {
    features,
    checkMockExamAccess,
    checkErrorBankAccess,
    checkAnalyticsAccess,
    checkTopicPracticeLimit,
    checkQuestionsPerDay,
    checkLeaderboardAccess,
    checkPredictedScoreAccess,
    checkWeakTopicAnalysisAccess,
    checkCourseComparisonAccess,
  };
}
