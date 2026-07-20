"use client";

import Image from "next/image";
import { X, Share, PlusSquare } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallPrompt() {
  const { canInstall, showIOSInstructions, promptInstall, dismiss } = useInstallPrompt();

  if (!canInstall && !showIOSInstructions) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 animate-fadeIn">
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex gap-3 relative">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex-shrink-0">
          <Image
            src="/icons/icon-192.png"
            alt="Roman Series"
            width={44}
            height={44}
            className="rounded-xl"
          />
        </div>

        {canInstall && (
          <div className="flex-1 pr-4">
            <p className="font-bold text-navy text-sm">Install Roman Series</p>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">
              Add it to your home screen for one-tap access and a faster, full-screen experience.
            </p>
            <button
              onClick={promptInstall}
              className="w-full px-4 py-2 bg-forest text-white rounded-lg font-semibold text-sm hover:bg-opacity-90 transition"
            >
              Install App
            </button>
          </div>
        )}

        {showIOSInstructions && (
          <div className="flex-1 pr-4">
            <p className="font-bold text-navy text-sm">Add to Home Screen</p>
            <p className="text-xs text-gray-500 mt-0.5 mb-2">
              Install Roman Series for one-tap access:
            </p>
            <ol className="text-xs text-gray-700 space-y-1.5">
              <li className="flex items-center gap-1.5">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-forest/10 text-forest font-bold flex items-center justify-center text-[10px]">1</span>
                Tap <Share className="w-3.5 h-3.5 inline text-blue-500" /> Share in Safari
              </li>
              <li className="flex items-center gap-1.5">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-forest/10 text-forest font-bold flex items-center justify-center text-[10px]">2</span>
                Tap <PlusSquare className="w-3.5 h-3.5 inline text-navy" /> &quot;Add to Home Screen&quot;
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
