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

  const FEATURES = [
    {
      title: "Predicted Score & Admission Likelihood",
      desc: "Get real-time predictions of your Post-UTME score and admission probability for your target university",
      icon: "🎯",
    },
    {
      title: "AI-Generated Analytics Reports",
      desc: "Receive detailed, actionable insights about your performance with personalized study recommendations",
      icon: "📊",
    },
    {
      title: "Error Bank & Weak Topics",
      desc: "Build a personal error bank to revisit mistakes and focus on your weakest areas",
      icon: "📋",
    },
    {
      title: "Leaderboard & Performance Ranking",
      desc: "See how you rank against peers practicing for the same university and course",
      icon: "🏆",
    },
    {
      title: "Mock Exams & Timed Practice",
      desc: "Take realistic, timed mock exams to build confidence and master exam strategies",
      icon: "⏱️",
    },
    {
      title: "Daily Streak & Progress Tracking",
      desc: "Stay motivated with daily streaks and detailed progress analytics across all subjects",
      icon: "📈",
    },
  ];

  const TESTIMONIALS = [
    {
      text: "I arrived at UI with little knowledge of how technical the Post-UTME could be. Roman Series changed everything.",
      author: "Shoge Q.",
      role: "Law, University of Ibadan",
      initial: "S",
    },
    {
      text: "The timed practice sessions helped me manage exam pressure way better. My scores improved dramatically!",
      author: "Chioma O.",
      role: "Medicine, University of Lagos",
      initial: "C",
    },
    {
      text: "Perfect for last-minute prep. The performance tracking showed exactly where I needed to focus.",
      author: "Adeyemi T.",
      role: "Engineering, FUTA",
      initial: "A",
    },
  ];

  const PLANS = [
    {
      name: "Explorer",
      price: "Free",
      duration: "forever",
      description: "Get started with limited practice",
      features: [
        "1–2 subjects",
        "20 questions/day",
        "2 mock exams (lifetime)",
        "Timer simulation",
        "Last 10 errors in error bank",
        "Basic analytics",
        "Daily streak",
        "Top 20 leaderboard",
      ],
      highlighted: false,
    },
    {
      name: "Scholar",
      price: "₦2,500",
      originalPrice: "₦3,500",
      duration: "6 months",
      description: "Most students choose this",
      features: [
        "Unlimited practice",
        "All subjects",
        "Topic-by-topic drilling",
        "3 mock exams per week",
        "Full error bank",
        "Detailed analytics",
        "Topic mastery tracking",
        "Speed analysis",
        "Daily streak",
        "Full leaderboard + your rank",
        "Predicted score (basic)",
        "Weak topic recommendations",
        "Performance history",
        "Exam simulation mode",
      ],
      highlighted: true,
      badge: "Most Popular",
    },
    {
      name: "Elite",
      price: "₦3,500",
      originalPrice: "₦5,000",
      duration: "6 months",
      description: "For serious, dedicated students",
      features: [
        "Everything in Scholar",
        "Unlimited mock exams",
        "Hard-mode mock exams",
        "Access to authentic UI POST-UTME questions from 2019-2025",
        "Advanced predictive scoring",
        "Admission probability meter",
        "Course-specific ranking",
        "Percentile ranking (You're ahead of X%)",
        "Smart weak-topic prioritisation",
        "Advanced analytics dashboard",
        "Time-pressure diagnostics",
        "Likely UI-standard challenge sets",
        "Extended leaderboard",
        "Elite badge (blue tick on profile)",
        "Performance trend forecasting",
      ],
      highlighted: false,
      badge: "Best Value",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-navy text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-forest rounded-full flex items-center justify-center font-bold">
              RS
            </div>
            <h1 className="text-xl font-bold">Roman Series</h1>
          </Link>
          <div className="flex gap-4">
            {!user ? (
              <>
                <Link
                  href="/login"
                  className="text-sm hover:text-gray-300 transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-forest text-white px-5 py-2 rounded-lg hover:bg-opacity-90 transition-opacity font-medium"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="text-sm bg-forest text-white px-5 py-2 rounded-lg hover:bg-opacity-90 transition-opacity font-medium"
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-navy via-deep-blue to-navy text-white py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-2 bg-forest/20 rounded-full border border-forest/40">
            <p className="text-sm font-semibold text-forest">
              ✨ Trusted by 5000+ students
            </p>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Ace Post-UTME with Real Past Questions
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Practice with authentic questions from top Nigerian universities.
            Get timed practice sessions, performance analytics, and admission
            predictions.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center mb-12">
            <Link
              href={user ? "/dashboard" : "/register"}
              className="bg-forest text-white px-8 py-4 rounded-lg font-semibold hover:bg-opacity-90 transition-all hover:shadow-lg"
            >
              {user ? "Go to Dashboard" : "Start Practicing Free"}
            </Link>
            <Link
              href="#pricing"
              className="border-2 border-forest text-forest bg-white px-8 py-4 rounded-lg font-semibold hover:bg-forest hover:text-white transition-all"
            >
              See Pricing Plans
            </Link>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-8 pt-12 border-t border-gray-700">
            <div>
              <div className="text-4xl font-bold text-forest mb-2">1000+</div>
              <div className="text-gray-300 text-sm">Past Questions</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-forest mb-2">9</div>
              <div className="text-gray-300 text-sm">Top Universities</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-forest mb-2">8</div>
              <div className="text-gray-300 text-sm">Subjects</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-navy mb-4">
              Powerful Features for Success
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Everything you need to ace your Post-UTME exam
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((feature, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-xl p-8 border border-gray-200 hover:border-forest hover:shadow-lg transition-all"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-navy mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-navy text-center mb-16">
            Three Simple Steps
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "1",
                title: "Create Account",
                desc: "Sign up and select your target university",
              },
              {
                icon: "2",
                title: "Choose Subjects",
                desc: "Pick the subjects you need to practice",
              },
              {
                icon: "3",
                title: "Start Practicing",
                desc: "Take timed exams and track your progress",
              },
            ].map((step, idx) => (
              <div key={idx} className="relative">
                <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
                  <div className="w-14 h-14 bg-forest text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold text-navy mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">{step.desc}</p>
                </div>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-1/3 -right-4 text-forest text-3xl">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-navy mb-4">
              Master All Subjects
            </h2>
            <p className="text-gray-600 text-lg">
              Comprehensive coverage of all Post-UTME subjects
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SUBJECTS.map((subject) => (
              <Link
                key={subject.name}
                href={user ? "/dashboard" : "/register"}
                className={`${subject.color} text-white p-8 rounded-xl text-center font-bold text-lg hover:shadow-xl transition-all transform hover:scale-105`}
              >
                {subject.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Universities Section */}
      <section className="bg-gray-50 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-navy mb-4">
              Top Nigerian Universities
            </h2>
            <p className="text-gray-600 text-lg">
              Practice with questions from universities you're applying to
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {UNIVERSITIES.map((uni) => (
              <div
                key={uni.code}
                className="bg-white text-navy px-6 py-3 rounded-full text-sm font-semibold border-2 border-forest hover:bg-forest hover:text-white transition-all"
                title={uni.name}
              >
                {uni.code}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-navy mb-4">
              Success Stories
            </h2>
            <p className="text-gray-600 text-lg">
              See what our students have achieved
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl shadow-md border-l-4 border-forest p-8 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-forest text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {testimonial.initial}
                  </div>
                  <div>
                    <p className="font-bold text-navy">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-navy mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-600 text-lg">
              Choose the plan that fits your prep timeline
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl overflow-hidden transition-all ${
                  plan.highlighted
                    ? "ring-2 ring-forest shadow-2xl transform md:scale-105 bg-white"
                    : "bg-white shadow-md hover:shadow-lg"
                }`}
              >
                {plan.badge && (
                  <div className="bg-forest text-white text-center py-3 text-sm font-bold uppercase tracking-wide">
                    ⭐ {plan.badge}
                  </div>
                )}
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-navy mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-6">
                    {plan.description}
                  </p>
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-5xl font-bold text-forest">
                        {plan.price}
                      </span>
                      {plan.originalPrice && (
                        <span className="text-xl text-gray-400 line-through">
                          {plan.originalPrice}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-600">
                      / {plan.duration}
                    </span>
                  </div>
                  <Link
                    href={user ? "/dashboard" : "/register"}
                    className={`block w-full py-3 px-4 rounded-lg font-bold text-center transition-all mb-8 ${
                      plan.highlighted
                        ? "bg-forest text-white hover:bg-opacity-90 hover:shadow-lg"
                        : "border-2 border-forest text-forest hover:bg-forest hover:text-white"
                    }`}
                  >
                    {user ? "Go to Dashboard" : "Get Started"}
                  </Link>
                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <span className="text-forest font-bold flex-shrink-0">
                          ✓
                        </span>
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Free Trial */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-10 text-center max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-navy mb-2">Not Sure Yet?</h3>
            <p className="text-gray-700 mb-2">
              Start with our <strong>Explorer plan</strong> for free and
              practice 20 questions per day to see how Roman Series works.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              No credit card required. Upgrade anytime to Scholar or Elite.
            </p>
            <Link
              href={user ? "/dashboard" : "/register"}
              className="inline-block text-forest font-bold hover:underline"
            >
              Start for Free →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-navy text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Ace Your Post-UTME?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of students already improving their scores
          </p>
          <Link
            href={user ? "/dashboard" : "/register"}
            className="inline-block bg-forest text-white px-8 py-4 rounded-lg font-bold hover:bg-opacity-90 transition-all hover:shadow-lg"
          >
            Get Started Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-forest rounded-full flex items-center justify-center font-bold">
                  RS
                </div>
                <h4 className="text-xl font-bold">Roman Series</h4>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Ace Post-UTME past questions with timed practice, instant
                scoring, and detailed performance analytics to predict your
                admission likelihood.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="font-bold mb-4 text-forest">Product</p>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>
                    <Link
                      href="/"
                      className="hover:text-white transition-colors"
                    >
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#pricing"
                      className="hover:text-white transition-colors"
                    >
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/analytics"
                      className="hover:text-white transition-colors"
                    >
                      Analytics
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-bold mb-4 text-forest">Account</p>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>
                    <Link
                      href="/login"
                      className="hover:text-white transition-colors"
                    >
                      Sign In
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/register"
                      className="hover:text-white transition-colors"
                    >
                      Register
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/profile"
                      className="hover:text-white transition-colors"
                    >
                      Profile
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center">
            <p className="text-gray-400 text-sm mb-2">
              © 2025 Roman Series. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs">
              Built by Habeeb K. Ademola | 🇳🇬 Made with ❤️ for Nigerian students
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
