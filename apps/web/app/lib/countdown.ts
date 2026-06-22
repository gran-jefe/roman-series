export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

export function getCountdownTime(endDate: string): CountdownTime {
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  const totalSeconds = Math.max(0, Math.floor((end - now) / 1000));
  const isExpired = totalSeconds === 0;

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
    isExpired,
  };
}

export function formatCountdown(time: CountdownTime): string {
  if (time.isExpired) return "Offer ended";
  return `${time.days}d ${time.hours}h ${time.minutes}m ${time.seconds}s`;
}

export function isCountdownMode(): boolean {
  return process.env.NEXT_PUBLIC_COUNTDOWN_MODE === "true";
}

export function getCountdownEndDate(): string | null {
  return process.env.NEXT_PUBLIC_COUNTDOWN_END_DATE || null;
}
