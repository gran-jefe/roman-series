"use client";

import Link from "next/link";

interface LockedFeatureProps {
  featureName: string;
  description: string;
  currentPlan?: string;
  icon?: React.ReactNode;
  onUpgradeClick?: () => void;
}

export function LockedFeature({
  featureName,
  description,
  currentPlan = "explorer",
  icon = "🔒",
  onUpgradeClick
}: LockedFeatureProps) {
  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Locked Icon and Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">{icon}</span>
          </div>
          <h1 className="text-4xl font-bold text-navy mb-4">
            {featureName} is Elite Only
          </h1>
          <p className="text-gray-600 text-lg mb-8">
            {description}
          </p>

          {/* Current Plan Badge */}
          <div className="inline-block mb-8">
            <div className="bg-white px-6 py-3 rounded-full border-2 border-gray-200 shadow-sm">
              <p className="text-sm text-gray-600">
                You're on <span className="font-bold text-navy capitalize">{currentPlan}</span> plan
              </p>
            </div>
          </div>

          {/* Prominent Upgrade CTA */}
          <div className="mb-12">
            <Link
              href="/pricing"
              onClick={handleUpgradeClick}
              className="inline-block bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-4 rounded-lg font-bold text-lg hover:shadow-lg transition-all transform hover:scale-105"
            >
              Upgrade Now to Elite ⭐
            </Link>
          </div>
        </div>

        {/* Comparison Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-navy mb-6">Upgrade to Elite to Unlock</h2>

          <div className="space-y-4">
            {/* Feature benefit 1 */}
            <div className="flex gap-4 items-start p-4 bg-gradient-to-r from-purple-50 to-transparent rounded-lg">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-600 text-white">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-navy">{featureName}</h3>
                <p className="text-sm text-gray-600 mt-1">Access to {description.toLowerCase()}</p>
              </div>
            </div>

            {/* Feature benefit 2 */}
            <div className="flex gap-4 items-start p-4 bg-gradient-to-r from-purple-50 to-transparent rounded-lg">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-600 text-white">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-navy">Advanced Analytics</h3>
                <p className="text-sm text-gray-600 mt-1">Percentile rankings and cohort insights</p>
              </div>
            </div>

            {/* Feature benefit 3 */}
            <div className="flex gap-4 items-start p-4 bg-gradient-to-r from-purple-50 to-transparent rounded-lg">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-600 text-white">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-navy">Unlimited Practice</h3>
                <p className="text-sm text-gray-600 mt-1">All subjects, unlimited mock exams, full error bank</p>
              </div>
            </div>
          </div>
        </div>

        {/* Price and CTA */}
        <div className="bg-gradient-to-br from-navy to-deep-blue rounded-2xl shadow-lg p-8 text-white mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Roman Series<sup className="text-sm align-super">™</sup> Elite</h3>
              <p className="text-gray-300">Everything you need to ace your Post-UTME</p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-2 justify-end">
                <div className="text-4xl font-bold">₦1,000</div>
              </div>
              <div className="text-sm text-gray-300">3 days · or ₦1,500 for 7 days</div>
            </div>
          </div>

          <Link
            href="/pricing"
            className="block w-full bg-forest text-white py-4 rounded-lg font-bold hover:bg-opacity-90 transition-all text-center"
          >
            View All Plans & Upgrade
          </Link>
        </div>

        {/* Back button */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-forest font-semibold hover:underline transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
