"use client";

import { useEffect, useState } from "react";
import { getCountdownTime, isCountdownMode, getCountdownEndDate } from "@/app/lib/countdown";
import type { CountdownTime } from "@/app/lib/countdown";

export default function CountdownBanner() {
  const [countdown, setCountdown] = useState<CountdownTime | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (!isCountdownMode() || !getCountdownEndDate()) {
      return;
    }

    const updateCountdown = () => {
      const endDate = getCountdownEndDate();
      if (endDate) {
        setCountdown(getCountdownTime(endDate));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted || !countdown || countdown.isExpired) {
    return null;
  }

  if (!isCountdownMode()) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-ember to-orange-600 text-white py-3 px-4 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">⏰ LIMITED TIME OFFER:</span>
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold">{countdown.days}</span>
              <span className="text-xs uppercase">Days</span>
            </div>
            <span className="text-xl font-bold">:</span>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold">{countdown.hours.toString().padStart(2, "0")}</span>
              <span className="text-xs uppercase">Hours</span>
            </div>
            <span className="text-xl font-bold">:</span>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold">{countdown.minutes.toString().padStart(2, "0")}</span>
              <span className="text-xs uppercase">Mins</span>
            </div>
            <span className="text-xl font-bold">:</span>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold">{countdown.seconds.toString().padStart(2, "0")}</span>
              <span className="text-xs uppercase">Secs</span>
            </div>
          </div>
        </div>
        <a
          href="#pricing"
          className="ml-auto text-sm font-semibold bg-white text-ember px-4 py-2 rounded-lg hover:bg-gray-100 transition whitespace-nowrap"
        >
          Upgrade Now →
        </a>
      </div>
    </div>
  );
}
