"use client";

import { useEffect, useState } from "react";
import { CheckCircle, X } from "lucide-react";

// Bump this key if a new announcement needs to be shown again to users
// who already dismissed a previous one.
const DISMISS_KEY = "maintenance_banner_dismissed_v1";

export function MaintenanceBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bg-forest/10 border border-forest/30 rounded-2xl px-4 sm:px-6 py-4 mb-8">
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-forest flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm text-navy leading-relaxed">
          <span className="font-bold">Maintenance complete!</span> Everything is back up and
          running normally. If you run into any issues, reach out — we're happy to help:
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-medium">
            <a href="tel:09061770885" className="hover:underline">0906 177 0885</a>
            <a href="tel:07038341818" className="hover:underline">0703 834 1818</a>
            <a href="mailto:granjefetech@gmail.com" className="hover:underline">granjefetech@gmail.com</a>
            <a href="mailto:roman.series.edu@gmail.com" className="hover:underline">roman.series.edu@gmail.com</a>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-navy/40 hover:text-navy transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
