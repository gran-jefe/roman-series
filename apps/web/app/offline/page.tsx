"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-blush flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center bg-white rounded-2xl shadow-lg p-8">
        <div className="text-5xl mb-4">📡</div>
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
