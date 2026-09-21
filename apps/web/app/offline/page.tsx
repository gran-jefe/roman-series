import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-blush flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center bg-white rounded-2xl shadow-lg p-8 border border-slate-200/80">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <WifiOff className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-navy mb-2">You&apos;re offline</h1>
        <p className="text-gray-600 mb-6">
          Roman Series needs an internet connection to load your questions and save your progress.
          Reconnect and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full px-6 py-3 bg-forest text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
