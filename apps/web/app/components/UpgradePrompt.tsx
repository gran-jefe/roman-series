"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface UpgradePromptProps {
  title: string;
  message: string;
  feature?: string;
  onClose: () => void;
  onUpgrade?: () => void;
}

export function UpgradePrompt({
  title,
  message,
  feature,
  onClose,
  onUpgrade,
}: UpgradePromptProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push("/pricing");
    }
  };

  return (
    <>
      {/* Blurred background backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0D1B2A] to-[#1A2F45] text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
            <h2 className="text-xl font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white hover:bg-opacity-10 rounded transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <p className="text-gray-700 text-base leading-relaxed mb-2">{message}</p>
            {feature && (
              <p className="text-sm text-gray-500 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                ✨ {feature}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-2.5 bg-[#1A7A4A] text-white font-medium rounded-lg hover:shadow-md transition"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
