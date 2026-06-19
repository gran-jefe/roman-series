"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

const floatingStyle = `
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-20px);
    }
  }
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
`;

export default function LandingPage() {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Promo ends next Friday (8 days from today)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const launchDate = new Date();
      // Set to next Friday at midnight
      const daysUntilFriday = (5 - launchDate.getDay() + 7) % 7 || 7;
      const promoEnd = new Date(launchDate.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
      promoEnd.setHours(23, 59, 59, 999);

      const diff = promoEnd.getTime() - now.getTime();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeLeft("Promo ended");
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

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
      <style>{floatingStyle}</style>
      {/* Navbar */}
      <nav className="bg-navy text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition flex items-center">
            <Image
              src="/assets/logos/roman-series-full.png"
              alt="Roman Series"
              width={180}
              height={70}
              className="h-14 w-auto"
            />
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
      <section className="bg-gradient-to-br from-navy via-[#1a3a52] to-navy text-white py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-96 h-96 bg-forest rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-block mb-8 animate-float">
            <Image
              src="/assets/logos/roman-series-full.png"
              alt="Roman Series"
              width={320}
              height={130}
              className="h-28 w-auto mx-auto brightness-0 invert drop-shadow-lg"
              priority
            />
          </div>

          <div className="inline-block mb-8 px-6 py-3 bg-gradient-to-r from-forest/30 to-blue-500/30 rounded-full border border-forest/60 backdrop-blur-sm">
            <p className="text-sm font-bold tracking-wide">
              🎯 5000+ STUDENTS PREPARING FOR SUCCESS
            </p>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight tracking-tight">
            Master Post-UTME,<br />
            <span className="bg-gradient-to-r from-forest to-blue-400 bg-clip-text text-transparent">
              Secure Your Admission
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            Practice with 1000+ authentic past questions from Nigeria's top universities.
            Get real-time analytics, AI-powered insights, and predictive scoring to guarantee your success.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Link
              href={user ? "/dashboard" : "/register"}
              className="group relative inline-flex items-center justify-center px-10 py-4 text-lg font-bold text-white bg-gradient-to-r from-forest to-emerald-600 rounded-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10">
                {user ? "📊 Go to Dashboard" : "🚀 Start Free Today"}
              </span>
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center px-10 py-4 text-lg font-bold text-white border-2 border-white/40 rounded-xl hover:bg-white/10 hover:border-white/80 transition-all duration-300 backdrop-blur-sm"
            >
              View Plans & Pricing
            </Link>
          </div>

          {/* Stats Row - Enhanced */}
          <div className="grid grid-cols-3 gap-8 pt-16 border-t border-white/20">
            <div className="group">
              <div className="text-5xl font-black bg-gradient-to-r from-forest to-blue-400 bg-clip-text text-transparent mb-2">1000+</div>
              <div className="text-gray-300 font-medium">Authentic Past Questions</div>
            </div>
            <div className="group">
              <div className="text-5xl font-black bg-gradient-to-r from-forest to-blue-400 bg-clip-text text-transparent mb-2">9</div>
              <div className="text-gray-300 font-medium">Top Universities Covered</div>
            </div>
            <div className="group">
              <div className="text-5xl font-black bg-gradient-to-r from-forest to-blue-400 bg-clip-text text-transparent mb-2">8</div>
              <div className="text-gray-300 font-medium">Core UTME Subjects</div>
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

      {/* Testimonials - Social Proof */}
      <section className="bg-gradient-to-br from-white via-blue-50/30 to-white py-32 px-6 relative">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 right-20 w-72 h-72 bg-forest rounded-full filter blur-3xl"></div>
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-navy mb-6">
              Students Like You Are Succeeding
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of students who have already secured admission to their dream universities
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial, idx) => (
              <div
                key={idx}
                className="group relative bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:border-forest/30"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-forest to-blue-500"></div>
                <div className="p-8">
                  {/* Stars */}
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-xl">★</span>
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-gray-700 text-lg mb-8 leading-relaxed italic">
                    "{testimonial.text}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                    <div className="w-14 h-14 bg-gradient-to-br from-forest to-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-md group-hover:scale-110 transition-transform">
                      {testimonial.initial}
                    </div>
                    <div>
                      <p className="font-bold text-navy text-lg">{testimonial.author}</p>
                      <p className="text-sm text-forest font-semibold">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust Badges */}
          <div className="mt-20 pt-12 border-t border-gray-200 text-center">
            <p className="text-gray-600 font-semibold mb-8">Trusted by leading universities</p>
            <div className="flex flex-wrap justify-center gap-8 items-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-forest">5000+</p>
                <p className="text-sm text-gray-600">Active Students</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-forest">98%</p>
                <p className="text-sm text-gray-600">Success Rate</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-forest">4.9★</p>
                <p className="text-sm text-gray-600">Average Rating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg text-center">
            <p className="text-amber-900 font-semibold">🎉 Launch Week Special! Limited-time promo pricing available</p>
            {timeLeft && <p className="text-sm text-amber-800 mt-1">Ends in: {timeLeft}</p>}
          </div>
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
                        <>
                          <span className="text-xl text-gray-400 line-through">
                            {plan.originalPrice}
                          </span>
                          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded">
                            PROMO
                          </span>
                        </>
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
