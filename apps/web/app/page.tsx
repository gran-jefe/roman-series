"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LandingPage() {
  const { user } = useAuth();
  const SUBJECTS = [
    { name: "Biology", color: "bg-biology" },
    { name: "Government", color: "bg-government" },
    { name: "Chemistry", color: "bg-chemistry" },
    { name: "Literature", color: "bg-literature" },
    { name: "CRS", color: "bg-crs" },
    { name: "IRS", color: "bg-irs" },
    { name: "English", color: "bg-english" },
    { name: "Physics", color: "bg-physics" },
  ];

  const UNIVERSITIES = [
    { code: "ABU", name: "Ahmadu Bello University" },
    { code: "FUHSI", name: "Federal University of Health Sciences Otukpo" },
    { code: "FUTA", name: "Federal University of Technology Akure" },
    { code: "LAUTECH", name: "Ladoke Akintola University of Technology" },
    { code: "OAU", name: "Obafemi Awolowo University" },
    { code: "UNIBEN", name: "University of Benin" },
    { code: "UI", name: "University of Ibadan" },
    { code: "UNILAG", name: "University of Lagos" },
    { code: "UNN", name: "University of Nigeria" },
  ];

  const TESTIMONIALS = [
    {
      text: "I arrived at UI with little knowledge of how technical the Post-UTME could be. Roman Series changed everything.",
      author: "Shoge Q.",
      role: "Law, University of Ibadan",
    },
    {
      text: "The timed practice sessions helped me manage exam pressure way better. My scores improved dramatically!",
      author: "Chioma O.",
      role: "Medicine, University of Lagos",
    },
    {
      text: "Perfect for last-minute prep. The performance tracking showed exactly where I needed to focus.",
      author: "Adeyemi T.",
      role: "Engineering, FUTA",
    },
  ];

  const PLANS = [
    {
      name: "Per University Pack",
      price: "₦1,500",
      duration: "1 year",
      description: "Access to one university's past questions",
      features: [
        "One university only",
        "All subjects for that university",
        "Valid for 1 year",
      ],
      highlighted: false,
    },
    {
      name: "Monthly Access",
      price: "₦2,000",
      duration: "30 days",
      description: "Perfect for quick preparation",
      features: [
        "All universities",
        "All subjects",
        "Valid for 30 days",
        "Performance analytics",
        "Leaderboard access",
      ],
      highlighted: true,
      badge: "Most Popular",
    },
    {
      name: "Bundle Deal",
      price: "₦5,000",
      duration: "90 days",
      description: "Best value for comprehensive prep",
      features: [
        "All universities",
        "All subjects",
        "Valid for 90 days",
        "Performance analytics",
        "Leaderboard access",
      ],
      highlighted: false,
      badge: "Best Value",
    },
  ];

  return (
    <div className="min-h-screen bg-blush">
      {/* Navbar */}
      <nav className="bg-navy text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-forest rounded-full" />
            <h1 className="text-xl font-bold">Roman Series</h1>
          </Link>
          <div className="flex gap-4">
            {!user ? (
              <>
                <Link href="/login" className="text-sm hover:text-gray-300 transition-colors">
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-forest px-4 py-2 rounded-lg hover:bg-opacity-90 transition-opacity"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="text-sm bg-forest px-4 py-2 rounded-lg hover:bg-opacity-90 transition-opacity"
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-navy text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ace Your Post-UTME. Practice with Real Past Questions.
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of students preparing for UI, OAU, UNILAG, ABU, FUTA and more — with
            timed practice, instant scoring, and performance tracking.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center mb-12">
            <Link
              href={user ? "/dashboard" : "/register"}
              className="bg-forest text-white px-8 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-opacity"
            >
              {user ? "Go to Dashboard" : "Start Free"}
            </Link>
            <Link
              href="#pricing"
              className="border-2 border-forest text-forest px-8 py-3 rounded-lg font-medium hover:bg-forest hover:text-white transition-colors"
            >
              View Pricing
            </Link>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-forest">75+</div>
              <div className="text-gray-300 text-sm">Questions</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-forest">9</div>
              <div className="text-gray-300 text-sm">Universities</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-forest">8</div>
              <div className="text-gray-300 text-sm">Subjects</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-blush py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-navy text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: "1", title: "Create Your Account", desc: "Free to get started" },
              { icon: "2", title: "Pick Your University", desc: "Select your target university and subject" },
              { icon: "3", title: "Start Practicing", desc: "Timed past questions with instant scoring" },
            ].map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 bg-forest text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-navy mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="bg-blush py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-navy text-center mb-12">All the Subjects You Need</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SUBJECTS.map((subject) => (
              <Link
                key={subject.name}
                href={user ? "/dashboard" : "/register"}
                className={`${subject.color} text-white p-6 rounded-lg text-center font-medium hover:shadow-lg transition-shadow cursor-pointer`}
              >
                {subject.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Universities */}
      <section className="bg-blush py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-navy text-center mb-12">
            Questions from Top Nigerian Universities
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {UNIVERSITIES.map((uni) => (
              <div
                key={uni.code}
                className="bg-blush text-navy px-4 py-2 rounded-full text-sm font-medium border border-rose"
                title={uni.name}
              >
                {uni.code}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-blush py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-navy text-center mb-12">What Students Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-lg p-8 border-t-4 border-rose">
                <p className="text-gray-600 mb-4 italic">"{testimonial.text}"</p>
                <div className="border-t pt-4">
                  <p className="font-bold text-navy">{testimonial.author}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-navy text-center mb-12">Simple, Affordable Pricing</h2>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg shadow-lg overflow-hidden transition-transform transform hover:scale-105 ${
                  plan.highlighted ? "ring-2 ring-forest scale-105 bg-white" : "bg-white"
                }`}
              >
                {plan.badge && (
                  <div className="bg-forest text-white text-center py-2 text-sm font-semibold">
                    {plan.badge}
                  </div>
                )}
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-navy mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-6">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-forest">{plan.price}</span>
                    <span className="text-gray-600 ml-2">/ {plan.duration}</span>
                  </div>
                  <Link
                    href={user ? "/dashboard" : "/register"}
                    className={`block w-full py-3 px-4 rounded-lg font-medium text-center transition-opacity mb-8 ${
                      plan.highlighted
                        ? "bg-forest text-white hover:bg-opacity-90"
                        : "border-2 border-forest text-forest hover:bg-forest hover:text-white"
                    }`}
                  >
                    {user ? "Go to Dashboard" : "Get Started"}
                  </Link>
                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-forest font-bold">✓</span>
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Free Tier Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <h3 className="text-lg font-bold text-navy mb-2">Starting Your Journey?</h3>
            <p className="text-gray-600 mb-4">
              Free users get <strong>10 practice questions</strong> to try out Roman Series before
              upgrading. Perfect for testing our features!
            </p>
            <Link href={user ? "/dashboard" : "/register"} className="text-forest font-medium hover:underline">
              {user ? "Go to Dashboard" : "Try Free"} →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-forest rounded-full" />
                <h4 className="text-xl font-bold">Roman Series</h4>
              </div>
              <p className="text-gray-400 text-sm">
                Practice Post-UTME past questions with timed practice and performance tracking.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-bold mb-2">Product</p>
                <ul className="space-y-1 text-sm text-gray-400">
                  <li>
                    <Link href="/" className="hover:text-white transition-colors">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link href="#pricing" className="hover:text-white transition-colors">
                      Pricing
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-bold mb-2">Account</p>
                <ul className="space-y-1 text-sm text-gray-400">
                  <li>
                    <Link href="/login" className="hover:text-white transition-colors">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="hover:text-white transition-colors">
                      Register
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8">
            <p className="text-center text-gray-400 text-sm">
              Compiled by Habeeb K. Ademola
            </p>
            <p className="text-center text-gray-400 text-sm mt-2">
              © 2025 Roman Series. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
