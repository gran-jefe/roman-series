"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Target,
  Smartphone,
  BookOpen,
  AlertCircle,
  RotateCw,
} from "lucide-react";

interface Announcement {
  icon: ReactNode;
  title: string;
  message: ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    icon: <Target className="w-4 h-4 text-emerald-700" />,
    title: "UTME & Post-UTME 2026/2027 Season Live",
    message:
      "Start preparing early for the upcoming JAMB UTME & University Post-UTME screenings with updated authentic questions, timed CBT simulations, and diagnostic weak-topic tracking.",
    ctaLabel: "Start Practice",
    ctaHref: "/practice/setup",
  },
  {
    icon: <Smartphone className="w-4 h-4 text-blue-700" />,
    title: "Install Roman Series as an App",
    message: (
      <>
        You can now install Roman Series on your device for one-tap, full-screen
        access — no app store needed.{" "}
        <span className="font-semibold">iPhone/iPad:</span> open this site in
        Safari, tap the Share icon, then &quot;Add to Home Screen&quot;.{" "}
        <span className="font-semibold">Android:</span> tap the menu (⋮) in
        Chrome, then &quot;Install app&quot; or &quot;Add to Home screen&quot;.{" "}
        <span className="font-semibold">Desktop (Chrome/Edge):</span> click the
        install icon in the address bar, or open the menu and choose
        &quot;Install Roman Series&quot;.
      </>
    ),
  },
  {
    icon: <BookOpen className="w-4 h-4 text-indigo-700" />,
    title: "New Recalled Questions Added",
    message:
      "Fresh recalled questions have been uploaded for Mathematics, Physics, Chemistry, Biology, and Use of English — practice with real questions students remember from recent exams.",
    ctaLabel: "View Recalled Questions",
    ctaHref: "/practice/recalled-questions",
  },
  {
    icon: <AlertCircle className="w-4 h-4 text-amber-700" />,
    title: "New Biology Area: Plant Morphology",
    message:
      "Based on popular request, we've added a dedicated question bank for Plant Morphology under Biology — one of the most challenging topics for Post-UTME students.",
    ctaLabel: "View Biology Focus",
    ctaHref: "/practice/biology-focus",
  },
  {
    icon: <RotateCw className="w-4 h-4 text-slate-700" />,
    title: "Recent Sessions Are Now Clickable",
    message:
      "You can now tap any completed session in your dashboard history to instantly open the full question-by-question review, see what you missed, and re-read the explanations.",
  },
];

const AUTOPLAY_DELAY = 5500;
const MAX_DOTS = 5;

export function AnnouncementCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const total = ANNOUNCEMENTS.length;

  const goTo = (newIndex: number) => {
    setVisible(false);
    setTimeout(() => {
      setIndex((newIndex + total) % total);
      setVisible(true);
    }, 180);
  };

  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(() => {
      goTo(index + 1);
    }, AUTOPLAY_DELAY);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, paused]);

  const current = ANNOUNCEMENTS[index];

  const dotWindow = Math.min(MAX_DOTS, ANNOUNCEMENTS.length);
  const dotOffset = Math.max(
    0,
    Math.min(index - Math.floor(dotWindow / 2), ANNOUNCEMENTS.length - dotWindow)
  );

  return (
    <div
      className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl px-4 sm:px-6 py-4 mb-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={`flex items-start gap-3 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          {current.icon}
        </div>
        <div className="flex-1 text-sm text-[#0D1B2A] leading-relaxed min-w-0">
          <span className="font-bold">{current.title}.</span> {current.message}
          {current.ctaHref && current.ctaLabel && (
            <div className="mt-2.5">
              <Link
                href={current.ctaHref}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A7A4A] hover:underline"
              >
                {current.ctaLabel}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
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
