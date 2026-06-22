export interface CountdownInfo {
  isActive: boolean;
  endDate: string | null;
  remainingSeconds: number;
  isExpired: boolean;
}

export function getCountdownInfo(): CountdownInfo {
  const isActive = process.env.COUNTDOWN_MODE === "true";
  const endDate = process.env.COUNTDOWN_END_DATE;

  if (!isActive || !endDate) {
    return {
      isActive: false,
      endDate: null,
      remainingSeconds: 0,
      isExpired: false,
    };
  }

  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  const remainingSeconds = Math.max(0, Math.floor((end - now) / 1000));
  const isExpired = remainingSeconds === 0;

  return {
    isActive,
    endDate,
    remainingSeconds,
    isExpired,
  };
}
