// Centralized subscription status utilities
// Ensures consistent logic across the entire app
// Based on the feature matrix provided in CLAUDE.md

export type SubscriptionStatus = "explorer" | "scholar" | "elite";

export interface FeatureAccess {
  topicPractice: "unlimited" | "limited";
  maxSubjects: number;
  questionsPerDay: number;
  mockExamsPerMonth: number;
  timerSimulation: boolean;
  errorBankSize: "unlimited" | "last_50" | "last_10" | "none";
  analytics: "none" | "basic" | "advanced" | "full";
  dailyStreak: boolean;
  leaderboardAccess: "none" | "top_20" | "full";
  predictedScore: "locked" | "preview" | "full";
  courseComparison: boolean;
  weakTopicAnalysis: "none" | "partial" | "full";
  unlimitedPractice: boolean;
}

const SUBSCRIPTION_TIERS: Record<SubscriptionStatus, {
  name: string;
  features: FeatureAccess;
}> = {
  explorer: {
    name: "Explorer (Free)",
    features: {
      topicPractice: "limited",
      maxSubjects: 2,
      questionsPerDay: 20,
      mockExamsPerMonth: 1,
      timerSimulation: true,
      errorBankSize: "last_10",
      analytics: "basic",
      dailyStreak: true,
      leaderboardAccess: "top_20",
      predictedScore: "locked",
      courseComparison: false,
      weakTopicAnalysis: "partial",
      unlimitedPractice: false,
    },
  },
  scholar: {
    name: "Scholar",
    features: {
      topicPractice: "unlimited",
      maxSubjects: 4,
      questionsPerDay: 999,
      mockExamsPerMonth: 12,
      timerSimulation: true,
      errorBankSize: "unlimited",
      analytics: "advanced",
      dailyStreak: true,
      leaderboardAccess: "full",
      predictedScore: "preview",
      courseComparison: false,
      weakTopicAnalysis: "full",
      unlimitedPractice: true,
    },
  },
  elite: {
    name: "Elite",
    features: {
      topicPractice: "unlimited",
      maxSubjects: 999,
      questionsPerDay: 999,
      mockExamsPerMonth: 999,
      timerSimulation: true,
      errorBankSize: "unlimited",
      analytics: "full",
      dailyStreak: true,
      leaderboardAccess: "full",
      predictedScore: "full",
      courseComparison: true,
      weakTopicAnalysis: "full",
      unlimitedPractice: true,
    },
  },
};

export function isExplorer(status?: string | null): boolean {
  return status === "explorer";
}

export function isScholar(status?: string | null): boolean {
  return status === "scholar";
}

export function isElite(status?: string | null): boolean {
  return status === "elite";
}

export function getFeatures(status?: string | null): FeatureAccess {
  return SUBSCRIPTION_TIERS[status as SubscriptionStatus]?.features ?? SUBSCRIPTION_TIERS.explorer.features;
}

export function canAccessMockExam(status?: string | null): boolean {
  const features = getFeatures(status);
  return features.mockExamsPerMonth > 0;
}

export function canAccessErrorBank(status?: string | null): boolean {
  const features = getFeatures(status);
  return features.errorBankSize !== "none";
}

export function canAccessAnalytics(status?: string | null): boolean {
  const features = getFeatures(status);
  return features.analytics !== "none";
}

export function canAccessAdvancedFeatures(status?: string | null): boolean {
  return isScholar(status) || isElite(status);
}

export function canViewPredictedScore(status?: string | null): boolean {
  const features = getFeatures(status);
  return features.predictedScore !== "locked";
}

export function shouldBlurPredictedScore(status?: string | null): boolean {
  return isExplorer(status);
}

export function getSubscriptionName(status?: string | null): string {
  return SUBSCRIPTION_TIERS[status as SubscriptionStatus]?.name ?? "Explorer (Free)";
}

export function requiresUpgrade(status?: string | null): boolean {
  return isExplorer(status);
}

// Specific feature limits
export function getQuestionsPerDay(status?: string | null): number {
  return getFeatures(status).questionsPerDay;
}

export function getErrorBankLimit(status?: string | null): number {
  const size = getFeatures(status).errorBankSize;
  if (size === "unlimited") return 999999;
  if (size === "last_50") return 50;
  if (size === "last_10") return 10;
  return 0;
}

export function getMaxSubjects(status?: string | null): number {
  return getFeatures(status).maxSubjects;
}

export function getMockExamsPerMonth(status?: string | null): number {
  return getFeatures(status).mockExamsPerMonth;
}

export function canAccessHardMode(status?: string | null): boolean {
  return isElite(status);
}

export function canAccessRecalledQuestions(status?: string | null): boolean {
  return isElite(status);
}
