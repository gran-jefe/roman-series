// Centralized subscription status utilities
// Ensures consistent logic across the entire app

export type SubscriptionStatus = "explorer" | "scholar" | "elite";

const SUBSCRIPTION_TIERS: Record<SubscriptionStatus, {
  name: string;
  canMockExam: boolean;
  canErrorBank: boolean;
  canAnalytics: boolean;
  canAdvancedFeatures: boolean;
}> = {
  explorer: {
    name: "Explorer (Free)",
    canMockExam: false,
    canErrorBank: false,
    canAnalytics: false,
    canAdvancedFeatures: false,
  },
  scholar: {
    name: "Scholar",
    canMockExam: true,
    canErrorBank: true,
    canAnalytics: true,
    canAdvancedFeatures: false,
  },
  elite: {
    name: "Elite",
    canMockExam: true,
    canErrorBank: true,
    canAnalytics: true,
    canAdvancedFeatures: true,
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

export function canAccessMockExam(status?: string | null): boolean {
  return SUBSCRIPTION_TIERS[status as SubscriptionStatus]?.canMockExam ?? false;
}

export function canAccessErrorBank(status?: string | null): boolean {
  return SUBSCRIPTION_TIERS[status as SubscriptionStatus]?.canErrorBank ?? false;
}

export function canAccessAnalytics(status?: string | null): boolean {
  return SUBSCRIPTION_TIERS[status as SubscriptionStatus]?.canAnalytics ?? false;
}

export function canAccessAdvancedFeatures(status?: string | null): boolean {
  return SUBSCRIPTION_TIERS[status as SubscriptionStatus]?.canAdvancedFeatures ?? false;
}

export function getSubscriptionName(status?: string | null): string {
  return SUBSCRIPTION_TIERS[status as SubscriptionStatus]?.name ?? "Explorer (Free)";
}

export function requiresUpgrade(status?: string | null): boolean {
  return isExplorer(status);
}
