"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ANNOUNCEMENTS = [
  {
    icon: "🛠️",
    title: "Scheduled Maintenance",
    message:
      "Maintenance complete! Everything is back up and running normally. If you run into any issues, reach out — we're happy to help: 0906 177 0885, 0703 834 1818, granjefetech@gmail.com, roman.series.edu@gmail.com",
  },
  {
    icon: "📚",
    title: "New Recalled Questions Added",
    message:
      "Fresh recalled questions have been uploaded for Mathematics, Physics, Chemistry, Biology, and Use of English — practice with real questions students remember from recent exams.",
  },
  {
    icon: "🌿",
    title: "New Biology Area: Plant Morphology",
    message:
      "Based on popular request, we've added a dedicated question bank for Plant Morphology under Biology — one of the most challenging topics for Post-UTME students.",
  },
  {
    icon: "⚡",
    title: "3-Day Full Access — ₦1,000",
    message:
      "Get unrestricted access to every subject, mock exam, and feature on the platform for 3 days at just ₦1,000. Perfect for a focused final push before your exam.",
  },
  {
    icon: "🔄",
    title: "Recent Sessions Are Now Clickable",
    message:
      "You can now click on any past mock exam in your Recent Sessions to review your corrections and see exactly where you went wrong — a great way to learn from every attempt.",
  },
];

const AUTO_ADVANCE_MS = 5500;
const MAX_DOTS = 5;

export function AnnouncementCarousel() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const pendingIndexRef = useRef(0);

  const goTo = (next: number) => {
    pendingIndexRef.current = (next + ANNOUNCEMENTS.length) % ANNOUNCEMENTS.length;
    setVisible(false);
  };

  // Single commit path: whatever set `visible` false (auto-advance or manual
  // nav) leaves the target in pendingIndexRef; this is the only place that
  // applies it, so the two triggers never race to write `index` separately.
  useEffect(() => {
    if (visible) return;
    const timeout = setTimeout(() => {
      setIndex(pendingIndexRef.current);
      setVisible(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [visible]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      goTo(index + 1);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused, index]);

  const current = ANNOUNCEMENTS[index];

  const dotWindow = Math.min(MAX_DOTS, ANNOUNCEMENTS.length);
  const dotOffset = Math.max(
    0,
    Math.min(index - Math.floor(dotWindow / 2), ANNOUNCEMENTS.length - dotWindow)
  );

  return (
    <div
      className="bg-forest/10 border border-forest/30 rounded-2xl px-4 sm:px-6 py-4 mb-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={`flex items-start gap-3 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="text-xl flex-shrink-0 leading-none mt-0.5">{current.icon}</span>
        <div className="flex-1 text-sm text-navy leading-relaxed min-w-0">
          <span className="font-bold">{current.title}.</span> {current.message}
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-forest/20">
        <button
          onClick={() => goTo(index - 1)}
          aria-label="Previous announcement"
          className="w-8 h-8 rounded-full border border-forest/30 hover:border-navy hover:bg-navy/5 transition-all flex items-center justify-center flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-navy/50 hover:text-navy" />
        </button>

        <div className="flex gap-1.5">
          {Array.from({ length: dotWindow }, (_, i) => {
            const idx = dotOffset + i;
            return (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                aria-label={`Go to announcement ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === index ? "bg-forest w-5" : "bg-forest/30 w-1.5 hover:bg-forest/50"
                }`}
              />
            );
          })}
        </div>

        <button
          onClick={() => goTo(index + 1)}
          aria-label="Next announcement"
          className="w-8 h-8 rounded-full border border-forest/30 hover:border-navy hover:bg-navy/5 transition-all flex items-center justify-center flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4 text-navy/50 hover:text-navy" />
        </button>
      </div>
    </div>
  );
}
