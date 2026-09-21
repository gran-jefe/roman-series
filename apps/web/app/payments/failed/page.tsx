import Link from "next/link";
import { XCircle } from "lucide-react";

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-lg border border-slate-200/80">
        <div className="w-20 h-20 rounded-2xl bg-red-50 border border-red-200/80 text-ember flex items-center justify-center mx-auto mb-5 shadow-sm">
          <XCircle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-ember mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-8">
          Your payment was not completed. No charges have been made to your account.
        </p>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Please check your details and try again, or contact support if you need help.
          </p>
          <Link
            href="/pricing"
            className="inline-block w-full px-6 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition-opacity"
          >
            Try Again
          </Link>
          <Link
            href="/dashboard"
            className="inline-block w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
