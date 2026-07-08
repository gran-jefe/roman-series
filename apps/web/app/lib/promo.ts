// Single source of truth for the "Launch Week Special" discount countdown.
// Used by the landing page, pricing page, and upgrade page so the timer
// and messaging never drift out of sync with each other.
export const PROMO_END_DATE = new Date(2026, 6, 12, 23, 59, 59, 999); // Sunday, July 12, 2026

export function isPromoActive(): boolean {
  return Date.now() < PROMO_END_DATE.getTime();
}

export function getPromoTimeLeft(): string {
  const diff = PROMO_END_DATE.getTime() - Date.now();
  if (diff <= 0) return "";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${days}d ${hours}h ${minutes}m`;
}
