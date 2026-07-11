"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { TrendingUp, Star, CheckCircle, Target, BarChart3, Clipboard, Trophy, Clock, Zap, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { getPromoTimeLeft } from "@/lib/promo";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";

export default function LandingPage() {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [currentTestimonialIdx, setCurrentTestimonialIdx] = useState(0);

  // Countdown to the end of the Launch Week discount
  useEffect(() => {
    const updateCountdown = () => {
      setTimeLeft(getPromoTimeLeft());
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll testimonials every 5 seconds
  useEffect(() => {
    const testimonialTimer = setInterval(() => {
      setCurrentTestimonialIdx((prev) => (prev + 1) % 34);
    }, 5000);
    return () => clearInterval(testimonialTimer);
  }, []);

  const SUBJECTS = [
    { name: "Biology", color: "bg-biology" },
    { name: "Government", color: "bg-government" },
    { name: "Chemistry", color: "bg-chemistry" },
    { name: "Literature", color: "bg-literature" },
    { name: "C.R.S.", color: "bg-crs" },
    { name: "I.R.S.", color: "bg-irs" },
    { name: "English", color: "bg-english" },
    { name: "Physics", color: "bg-physics" },
    { name: "Mathematics", color: "bg-mathematics" },
    { name: "Economics", color: "bg-economics" },
    { name: "Commerce", color: "bg-commerce" },
    { name: "Accounting", color: "bg-accounting" },
    { name: "Yoruba", color: "bg-yoruba" },
    { name: "Music", color: "bg-music" },
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
      text: "If you're captivated by the idea of gaining admission to the illustrious University of Ibadan, the Roman Series is an invaluable resource. I wholeheartedly give these books a five-star rating. I genuinely believe that I wouldn't have excelled in the exam without the consistent practice provided by these books.",
      author: "Bello Maryam Oladunni",
      role: "400-Level, Law, University of Ibadan",
      initial: "B",
      score: "✅ Admitted",
    },
    {
      text: "I attribute my success in gaining admission to study law at the University of Ibadan to the grace of God and the Roman Series. The support of Habeeb and these materials made this achievement possible.",
      author: "Susan Eze Ugonma",
      role: "400-Level, Law, University of Ibadan",
      initial: "S",
      score: "JAMB: 268",
    },
    {
      text: "To the glory of God, I am now pursuing a law degree at the University of Ibadan. The Roman Series created by K. Habeeb Ademola is the masterpiece that paved my way into this prestigious institution.",
      author: "Afesojaye Ruth Ayomide",
      role: "400-Level, Law, University of Ibadan",
      initial: "A",
      score: "Admitted on 1st try",
    },
    {
      text: "Adapting to the Roman numeral question style was challenging initially, but my consistent practice with the Roman Series significantly aided me in acing the examination with excellence.",
      author: "Munirudeen Memunat B",
      role: "400-Level, Law, University of Ibadan",
      initial: "M",
      score: "✅ Admitted",
    },
    {
      text: "Thanks to the divine grace of God and the assistance provided by the Roman Series, I am now proud to say that I am a law student at the prestigious University of Ibadan.",
      author: "OSUNWA DAVID CHIBUIKE",
      role: "400-Level, Law, University of Ibadan",
      initial: "O",
      score: "✅ Admitted",
    },
    {
      text: "The Roman numeral past questions were exceptionally detailed. I passed with flying colors. Today, I take immense pride in declaring myself a bona fide Law student at the esteemed University of Ibadan.",
      author: "OLAYINKA TAIWO",
      role: "400-Level, Law, University of Ibadan",
      initial: "O",
      score: "✅ Admitted",
    },
    {
      text: "I began to see significant improvements through the daily and weekly tests. Alhamdulillah, I can confidently attribute my success in the Post-UTME to the invaluable assistance provided by the Roman Series.",
      author: "Adebayo Zaynab Anike",
      role: "400-Level, Law, University of Ibadan",
      initial: "A",
      score: "✅ Admitted",
    },
    {
      text: "The Roman Series by Mr. Habeeb A. Kasali is an invaluable resource. I have no regrets about acquiring these books; it stands as the finest decision I made in preparing for the UI POST UTME.",
      author: "Raji Adebisi",
      role: "400-Level, Law, University of Ibadan",
      initial: "R",
      score: "✅ Admitted",
    },
    {
      text: "Words alone cannot do justice to the incredible support that the Roman Series provided. It stands as the finest decision I made in terms of preparing for the UI POST UTME.",
      author: "Ayomide A. Awofeso",
      role: "400-Level, Law, University of Ibadan",
      initial: "A",
      score: "✅ Admitted",
    },
    {
      text: "The Roman Government Series is a remarkable resource that played a pivotal role in my success during the UI Post-UTME. I was admitted despite the discouraging stories I had heard.",
      author: "Awope Boluwatife",
      role: "400-Level, Law, University of Ibadan",
      initial: "A",
      score: "Admitted on 1st try",
    },
    {
      text: "I am truly grateful, and I attribute my success to both divine intervention and the author of this invaluable book. The Roman Series is a comprehensive masterpiece.",
      author: "Junaid Olapeju Habeebah",
      role: "400-Level, Law, University of Ibadan",
      initial: "J",
      score: "✅ Admitted",
    },
    {
      text: "The Roman Series served as an eye-opener, revealing numerous gaps in my knowledge. Mr. Habeeb became a valuable mentor. Today, I am immensely proud to declare that I am a Law student at UI.",
      author: "Mariam Oluwatoyosi Oyelaja",
      role: "400-Level, Law, University of Ibadan",
      initial: "M",
      score: "✅ Admitted",
    },
    {
      text: "The Roman Series stands as the ultimate key for tackling exams structured around the Roman numeral format. What truly sets it apart is the detailed answers and explanations for each question.",
      author: "OLASUPO AKOREDE JOHNSON",
      role: "400-Level, Law, University of Ibadan",
      initial: "O",
      score: "✅ Admitted",
    },
    {
      text: "This book has been an incredible blessing to me as I prepared for my Post-UTME. It equipped me with the knowledge to confidently tackle any UI POST UTME question.",
      author: "Bamigbade Ayomide Peter",
      role: "400-Level, Law, University of Ibadan",
      initial: "B",
      score: "✅ Admitted",
    },
    {
      text: "These roman series are not just a set of past questions, but a set of life-changing masterpiece carefully crafted using pundits in each field. Words can't completely corroborate the explicitness of this work.",
      author: "Fagbenro Rosheed Iyiola",
      role: "400-Level, Law, University of Ibadan",
      initial: "F",
      score: "✅ Admitted",
    },
    {
      text: "The series are amazing eye openers to what UI plans to surprise you with in your Post UTME. By the grace of God, success will be yours. The Roman Series is a key to the gateway of success.",
      author: "Yahya Muaz Okikiola",
      role: "400-Level, Law, University of Ibadan",
      initial: "Y",
      score: "✅ Admitted",
    },
    {
      text: "Without the Roman series, I wouldn't have passed my PUTME. Dos Habeeb consistently encouraged us to practice diligently, and it proved invaluable.",
      author: "Abolade Joy",
      role: "400-Level, Philosophy, University of Ibadan",
      initial: "A",
      score: "2nd Attempt ✅",
    },
    {
      text: "Before encountering this book, I never realized how both Government and Literature could be so vast yet simplified. This book unraveled the complex questions I had struggled with for years.",
      author: "LAWAL HALIMAH",
      role: "400-Level, CLA, University of Ibadan",
      initial: "L",
      score: "✅ Admitted",
    },
    {
      text: "The New Roman Series was truly an eye-opener during my Post-UTME preparation. Having prepared with it gave me the confidence to stay focused. I highly recommend it to any UI Post-UTME aspirant.",
      author: "Omotayo Oreoluwa",
      role: "400-Level, Theatre Arts, University of Ibadan",
      initial: "O",
      score: "✅ Admitted",
    },
    {
      text: "By the grace of Allah and through the use of the Roman text, I was able to score 82 in my Post-UTME and gain admission into my preferred course, Medicine and Surgery.",
      author: "Abdullahi Akorede Murithadoh",
      role: "300-Level, Medicine, University of Ibadan",
      initial: "A",
      score: "POST-UTME: 82",
    },
    {
      text: "The Roman Series was a game-changer in my preparation for UI POST UTME. The way it broke down complex topics made studying feel less overwhelming. I credit it for getting me into Medicine and Surgery.",
      author: "Abdulraheem Adegbite",
      role: "200-Level, Medicine, University of Ibadan",
      initial: "A",
      score: "POST-UTME: 85",
    },
    {
      text: "The materials exposed me to the standard and pattern of questions I was likely to encounter, helping me build confidence and manage time effectively. Roman Series contributed immensely to my success.",
      author: "Adesina Mosidat",
      role: "300-Level, Medicine, University of Ibadan",
      initial: "A",
      score: "POST-UTME: 84",
    },
    {
      text: "The Roman Series demystified the University of Ibadan Post-UTME for me. It broke down each subject topic by topic in a way that made even the most technical parts feel approachable.",
      author: "Hikmah Akingboye",
      role: "300-Level, Medicine, University of Ibadan",
      initial: "H",
      score: "POST-UTME: 80",
    },
    {
      text: "The Roman series helped me prepare effectively and exposed exactly how questions were structured. This book was a major contributor to my success in the exam.",
      author: "Soliudeen Ismail",
      role: "300-Level, Medicine, University of Ibadan",
      initial: "S",
      score: "POST-UTME: 84",
    },
    {
      text: "With the help of the Roman Series, the path became much clearer, and the entire process felt easier to navigate. It provided the guidance and direction I needed.",
      author: "Adeoti Hassanah",
      role: "300-Level, Medicine, University of Ibadan",
      initial: "A",
      score: "POST-UTME: 82",
    },
    {
      text: "The Roman Series exposed me to the Roman numeral question format and helped me understand the pattern of questions the examiners preferred. One of the major factors that contributed to my success.",
      author: "Aderinto Abdulsamad",
      role: "300-Level, Medicine, University of Ibadan",
      initial: "A",
      score: "POST-UTME: 77",
    },
    {
      text: "The Roman Series by Habeeb Kasali made navigating the dreaded Roman questions easily possible. What I love most is how it systematically targets the exact areas students trip up on.",
      author: "Hameedah",
      role: "BMLS, University of Ibadan",
      initial: "H",
      score: "✅ Admitted",
    },
    {
      text: "Its well-structured past questions helped me understand the exam pattern, improve my speed and accuracy. I am delighted to have gained admission and strongly recommend it to every serious UI aspirant.",
      author: "Fatimat Zubair",
      role: "Nursing, University of Ibadan",
      initial: "F",
      score: "✅ Admitted",
    },
    {
      text: "The Roman Series exposed me to challenging questions and helped me develop the right mindset for the examination. What I appreciated most was that it trained me to think critically and approach questions strategically.",
      author: "Aliyu Abdullah Adebisi",
      role: "Medicine, University of Ibadan",
      initial: "A",
      score: "POST-UTME: 85",
    },
    {
      text: "The Roman Series was one of the major materials I used while preparing for the UI Post-UTME. The questions were structured closely to UI standard with detailed explanations.",
      author: "Oladeji Mahmud Olalekan",
      role: "200-Level, Engineering, University of Ibadan",
      initial: "O",
      score: "✅ Admitted",
    },
    {
      text: "Roman Series was an orientation designed to prepare students for the reality of the UI POST-UTME. During the exam, the questions looked familiar because they followed the same pattern.",
      author: "Alowonle Abdulsamad Ishola",
      role: "University of Ibadan",
      initial: "A",
      score: "✅ Admitted",
    },
    {
      text: "The Roman series helped me a lot during my post UTME. It served as an excellent guide when writing UI's exam. The questions had clear solutions and it was really easy to understand.",
      author: "Olajuwon Olaitan Folawe",
      role: "200-Level, Civil Engineering, University of Ibadan",
      initial: "O",
      score: "✅ Admitted",
    },
    {
      text: "I made sure to solve every question in the Roman Series and the practice greatly improved my confidence. I can confidently say that it contributed significantly to my success.",
      author: "Babarinde Mahmudah",
      role: "300-Level, Medicine, University of Ibadan",
      initial: "B",
      score: "POST-UTME: 87",
    },
    {
      text: "Roman Series is packed with carefully curated past questions and set to UI standards. It has guided countless students into university. I recommend it to everyone preparing for any Nigerian university.",
      author: "OLABAMIJI Habeebat Abisola",
      role: "100-Level, Dental Surgery, University of Ibadan",
      initial: "O",
      score: "POST-UTME: 77",
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
        "1 mock exam",
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

  const floatingStyle = `
    @keyframes float-smooth {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
  `;

  return (
    <div className="min-h-screen bg-[#FAF7F4] font-[var(--font-jakarta)]">
      <style>{floatingStyle}</style>

      {/* ──── NAVBAR ──── */}
      <nav className="bg-[#FAF7F4] backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1">
            <Image
              src="/assets/logos/roman-series-full.png"
              alt="Roman Series"
              width={140}
              height={56}
              className="h-10 w-auto"
            />
            <sup className="text-[10px] font-bold text-gray-400 -translate-y-2">™</sup>
          </Link>
          <div className="flex items-center gap-3">
            {!user ? (
              <>
                <Link
                  href="/login"
                  className="hidden sm:block text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-navy text-white px-5 py-2.5 rounded-xl font-bold hover:bg-navy/90 transition-all hover:shadow-lg hover:shadow-navy/20"
                >
                  Get Started Free →
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="text-sm bg-forest text-white px-5 py-2.5 rounded-xl font-bold hover:bg-forest/90 transition-all"
              >
                Dashboard →
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ──── COUNTDOWN BANNER ──── */}
      {timeLeft && (
        <div className="bg-gradient-to-r from-ember via-orange-500 to-amber-500 text-white py-2.5 px-4 text-center text-sm font-semibold">
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse inline-block"></span>
            🔥 Launch Week Special – {timeLeft}
            <Link href="#pricing" className="underline underline-offset-2 hover:no-underline ml-1">
              Claim discount →
            </Link>
          </span>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <MaintenanceBanner />
      </div>

      {/* ──── HERO ──── */}
      <section className="relative bg-navy overflow-hidden">
        {/* Warm gradient overlays */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-forest/20 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-ember/15 rounded-full blur-[100px] translate-x-[-20%] translate-y-1/3"></div>
          <div className="absolute top-1/2 left-1/2 w-[500px] h-[300px] bg-gold/10 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
            backgroundSize: "60px 60px"
          }}>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">

          {/* Logo */}
          <div className="mb-12 animate-float inline-flex items-start gap-1">
            <Image
              src="/assets/logos/roman-series-full.png"
              alt="Roman Series"
              width={180}
              height={72}
              className="h-14 w-auto mx-auto brightness-0 invert drop-shadow-[0_0_30px_rgba(26,122,74,0.4)]"
              priority
            />
            <sup className="text-xs font-bold text-white/50">™</sup>
          </div>

          {/* UI-first badge */}
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-white/10 border border-white/20 rounded-full backdrop-blur-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-white/80 text-sm font-semibold tracking-wide">
              NOW LIVE – University of Ibadan · Other schools coming soon
            </span>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white mb-6 leading-[1.05] tracking-tight">
            You Want UI.<br/>
            <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-forest bg-clip-text text-transparent">
              We&apos;ll Get You There.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            Practice with <strong className="text-white/90">9,600+ authentic UI Post-UTME questions</strong>. AI-powered analytics, real-time score prediction, and personalised study plans – everything you need to get admitted.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href={user ? "/dashboard" : "/register"}
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-forest text-white font-black text-lg rounded-2xl hover:bg-forest/90 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-forest/30">
              {user ? "Go to Dashboard" : "Start Practicing Free"}
              <span className="group-hover:translate-x-1 transition-transform">
                →
              </span>
            </Link>
            <Link href="#pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/20 text-white/80 font-bold text-lg rounded-2xl hover:bg-white/10 hover:border-white/40 transition-all">
              See Pricing
            </Link>
          </div>

          {/* Stats */}
          <div className="inline-grid grid-cols-3 gap-0 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm overflow-hidden">
            {[
              { number: "13,900+", label: "UI Questions" },
              { number: "15", label: "Subjects" },
              { number: "5,000+", label: "Students" },
            ].map((stat, i) => (
              <div key={i} className={`px-6 sm:px-10 py-6 text-center ${i < 2 ? "border-r border-white/10" : ""}`}>
                <div className="text-2xl sm:text-4xl font-black text-white mb-1">
                  {stat.number}
                </div>
                <div className="text-xs sm:text-sm text-white/40 font-semibold uppercase tracking-widest">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── SOCIAL PROOF BAR ──── */}
      <section className="bg-gray-50 border-y border-gray-100 py-5 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 text-center">
          <div className="flex items-center gap-2 text-sm text-gray-600 font-semibold">
            <TrendingUp className="w-5 h-5 text-forest" />
            <span>98% admission success rate</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 font-semibold">
            <Star className="w-5 h-5 text-forest" />
            <span>4.9★ average student rating</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 font-semibold">
            <CheckCircle className="w-5 h-5 text-forest" />
            <span>Trusted since 2019</span>
          </div>
        </div>
      </section>

      {/* ──── TESTIMONIALS ──── */}
      <section className="bg-white py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-forest bg-forest/10 px-4 py-1.5 rounded-full mb-4">
              Real Results
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-navy mb-3">
              They Got In. You Can Too.
            </h2>
            <p className="text-gray-500 text-lg">
              Over 5,000 students admitted using Roman Series
            </p>
          </div>

          {/* Testimonial card */}
          <div className="relative max-w-2xl mx-auto">
            <div key={currentTestimonialIdx}
              className="relative bg-navy rounded-3xl p-8 sm:p-10 overflow-hidden">

              {/* Decorative background */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-forest/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

              {/* Stars */}
              <div className="text-gold text-xl mb-6 relative z-10">⭐⭐⭐⭐⭐</div>

              {/* Quote */}
              <p className="text-white/85 text-base sm:text-lg leading-relaxed mb-8 italic min-h-[100px] relative z-10">
                &ldquo;{TESTIMONIALS[currentTestimonialIdx].text}&rdquo;
              </p>

              {/* Author row */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-forest rounded-full flex items-center justify-center font-black text-white text-base flex-shrink-0">
                    {TESTIMONIALS[currentTestimonialIdx].initial}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">
                      {TESTIMONIALS[currentTestimonialIdx].author}
                    </p>
                    <p className="text-white/50 text-xs">
                      {TESTIMONIALS[currentTestimonialIdx].role}
                    </p>
                  </div>
                </div>
                {TESTIMONIALS[currentTestimonialIdx].score && (
                  <span className="text-xs font-black px-3 py-1.5 bg-forest/30 text-green-300 rounded-full border border-green-500/30">
                    {TESTIMONIALS[currentTestimonialIdx].score}
                  </span>
                )}
              </div>
            </div>

            {/* Nav */}
            <div className="flex items-center justify-between mt-6 px-2">
              <button
                onClick={() => setCurrentTestimonialIdx(
                  p => (p - 1 + TESTIMONIALS.length) % TESTIMONIALS.length
                )}
                className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-navy hover:bg-navy/5 transition-all flex items-center justify-center">
                <ChevronLeft className="w-5 h-5 text-gray-400 hover:text-navy" />
              </button>

              {/* Max 7 dots */}
              <div className="flex gap-1.5">
                {Array.from({length: 7}, (_, i) => {
                  const offset = Math.max(0,
                    Math.min(currentTestimonialIdx - 3, TESTIMONIALS.length - 7))
                  const idx = offset + i
                  return (
                    <button key={idx}
                      onClick={() => setCurrentTestimonialIdx(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentTestimonialIdx
                          ? "bg-navy w-6"
                          : "bg-gray-200 w-2 hover:bg-gray-400"
                      }`}/>
                  )
                })}
              </div>

              <button
                onClick={() => setCurrentTestimonialIdx(
                  p => (p + 1) % TESTIMONIALS.length
                )}
                className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-navy hover:bg-navy/5 transition-all flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-gray-400 hover:text-navy" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ──── FEATURES ──── */}
      <section className="bg-gray-50 py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-forest bg-forest/10 px-4 py-1.5 rounded-full mb-4">
              Platform Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-navy mb-3">
              Built for Serious UI Aspirants
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Not just another past questions app – a complete preparation system
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Target },
              { icon: BarChart3 },
              { icon: Clipboard },
              { icon: Trophy },
              { icon: Clock },
              { icon: Zap },
            ].map((item, idx) => {
              const IconComponent = item.icon;
              const feature = FEATURES[idx];
              return (
              <div key={idx}
                className="group bg-white/95 border border-gray-100 rounded-2xl p-6 hover:border-forest/30 hover:shadow-xl hover:shadow-forest/5 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-forest/10 flex items-center justify-center mb-5 group-hover:bg-forest/20 transition-colors">
                  <IconComponent className="w-6 h-6 text-forest" />
                </div>
                <h3 className="font-bold text-navy mb-2 text-base leading-tight">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            );
            })}
          </div>
        </div>
      </section>

      {/* ──── HOW IT WORKS ──── */}
      <section className="bg-white py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-forest bg-forest/10 px-4 py-1.5 rounded-full mb-4">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-navy">
              Start in Under 2 Minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Create Free Account",
                desc: "Sign up and select University of Ibadan as your target school",
                color: "bg-navy",
              },
              {
                num: "02",
                title: "Choose Your Subjects",
                desc: "Pick from 14 Post-UTME subjects and start topic-by-topic drilling",
                color: "bg-forest",
              },
              {
                num: "03",
                title: "Track & Improve",
                desc: "Get AI analytics, see your predicted score, and crush the exam",
                color: "bg-ember",
              },
            ].map((step, i) => (
              <div key={i}
                className="relative bg-gray-50 rounded-2xl p-7 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
                <div className={`${step.color} text-white text-xs font-black w-10 h-10 rounded-xl flex items-center justify-center mb-5 tracking-widest`}>
                  {step.num}
                </div>
                <h3 className="font-black text-navy text-lg mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── SUBJECTS ──── */}
      <section className="bg-gray-50 py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-forest bg-forest/10 px-4 py-1.5 rounded-full mb-4">
              Subjects
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-navy mb-3">
              All 14 Post-UTME Subjects
            </h2>
            <p className="text-gray-500 text-lg">
              9,600+ questions across every subject – topic by topic
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SUBJECTS.map((subject) => (
              <Link key={subject.name}
                href={user ? "/dashboard" : "/register"}
                className={`${subject.color} text-white rounded-2xl p-5 text-center font-black text-sm sm:text-base hover:opacity-90 hover:shadow-xl transition-all hover:-translate-y-1 active:translate-y-0`}>
                {subject.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ──── UNIVERSITIES ──── */}
      <section className="bg-white py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-forest bg-forest/10 px-4 py-1.5 rounded-full mb-4">
            Universities
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-navy mb-3">
            Starting With UI. Expanding Fast.
          </h2>
          <p className="text-gray-500 text-lg mb-10">
            Live now for University of Ibadan.
            More schools launching soon – join the waitlist.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {UNIVERSITIES.map((uni) => (
              <div key={uni.code} title={uni.name}
                className={`px-5 py-2.5 rounded-full text-sm font-black border-2 transition-all cursor-default
                  ${uni.code === "UI"
                    ? "bg-navy text-white border-navy"
                    : "bg-white text-gray-300 border-gray-100 line-through"
                  }`}>
                {uni.code}
                {uni.code === "UI" && (
                  <span className="ml-1.5 text-xs font-bold text-green-400">
                    ✓ Live
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-6">
            OAU, UNILAG, ABU and more coming soon.
            <Link href="/register" className="text-forest font-bold hover:underline ml-1">
              Get notified →
            </Link>
          </p>
        </div>
      </section>

      {/* ──── PRICING ──── */}
      <section id="pricing" className="bg-gray-50 py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">

          {timeLeft && (
            <div className="mb-10 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-center">
              <p className="text-amber-800 font-bold text-sm">
                🎉 Launch Week Discount · Ends in: {timeLeft}
              </p>
            </div>
          )}

          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-forest bg-forest/10 px-4 py-1.5 rounded-full mb-4">
              Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-navy mb-3">
              Start Free. Upgrade When Ready.
            </h2>
            <p className="text-gray-500">
              No tricks, no hidden fees. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {PLANS.map((plan) => (
              <div key={plan.name}
                className={`rounded-2xl overflow-hidden flex flex-col transition-all duration-300
                  ${plan.highlighted
                    ? "ring-2 ring-forest shadow-2xl shadow-forest/10 bg-white"
                    : "bg-white border border-gray-100 hover:shadow-lg"
                  }`}>

                {plan.badge && (
                  <div className="bg-forest text-white text-center py-2.5 text-xs font-black uppercase tracking-[0.15em]">
                    ⭐ {plan.badge}
                  </div>
                )}

                <div className="p-6 sm:p-8 flex flex-col flex-1">
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-navy mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-gray-400 text-sm">{plan.description}</p>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-4xl sm:text-5xl font-black text-navy">
                        {plan.price}
                      </span>
                      {plan.originalPrice && (
                        <span className="text-gray-300 line-through text-base font-medium">
                          {plan.originalPrice}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">/ {plan.duration}</p>
                  </div>

                  <Link href={user ? "/dashboard" : "/register"}
                    className={`block w-full py-3.5 rounded-xl font-black text-center text-sm transition-all mb-8
                      ${plan.highlighted
                        ? "bg-forest text-white hover:bg-forest/90 hover:shadow-lg hover:shadow-forest/20"
                        : "border-2 border-gray-200 text-navy hover:border-forest hover:text-forest"
                      }`}>
                    {plan.name === "Explorer" ? "Start Free" :
                     plan.name === "Scholar" ? "Get Scholar" : "Go Elite"}
                  </Link>

                  <div className="space-y-3 flex-1">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <span className="text-forest text-sm font-black flex-shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span className="text-sm text-gray-600 leading-snug">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center p-6 sm:p-8 bg-white rounded-2xl border border-gray-100">
            <p className="font-black text-navy mb-1">Not sure yet?</p>
            <p className="text-gray-400 text-sm mb-4">
              Explorer is free forever – 20 questions/day, 1 mock exam.
              No card needed.
            </p>
            <Link href={user ? "/dashboard" : "/register"}
              className="text-forest font-black text-sm hover:underline">
              Start with Explorer →
            </Link>
          </div>
        </div>
      </section>

      {/* ──── FINAL CTA ──── */}
      <section className="bg-navy py-20 sm:py-28 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-80 h-80 bg-forest/25 rounded-full blur-[80px] translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-ember/20 rounded-full blur-[60px] -translate-x-1/4 translate-y-1/3"></div>
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 leading-tight">
            Your UI Admission<br/>
            <span className="text-green-400">Starts Here.</span>
          </h2>
          <p className="text-white/50 text-lg mb-10 font-medium">
            Join 5,000+ students already preparing.
            Start free – upgrade only when you&apos;re ready.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={user ? "/dashboard" : "/register"}
              className="group inline-flex items-center justify-center gap-2 bg-forest text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-forest/90 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-forest/30">
              {user ? "Go to Dashboard" : "Start Practicing Free"}
              <span className="group-hover:translate-x-1 transition-transform">
                →
              </span>
            </Link>
            <Link href="#pricing"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/20 text-white/70 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/10 hover:border-white/40 transition-all">
              View Plans
            </Link>
          </div>
        </div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer className="bg-[#080F16] text-white py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-forest rounded-lg flex items-center justify-center text-xs font-black text-white">
                  RS
                </div>
                <span className="font-black">Roman Series<sup className="text-[0.6em] text-white/40">™</sup></span>
              </div>
              <p className="text-white/30 text-xs leading-relaxed">
                Nigeria&apos;s most trusted UI Post-UTME preparation platform.
                Built for Nigerian students who are serious about getting admitted.
              </p>
            </div>
            <div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">
                Platform
              </p>
              <ul className="space-y-2.5 text-sm text-white/30">
                <li><Link href="/" className="hover:text-white transition">Home</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="/analytics" className="hover:text-white transition">Analytics</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">
                Account
              </p>
              <ul className="space-y-2.5 text-sm text-white/30">
                <li><Link href="/login" className="hover:text-white transition">Sign In</Link></li>
                <li><Link href="/register" className="hover:text-white transition">Register</Link></li>
                <li><Link href="/feedback" className="hover:text-white transition">Feedback</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">
                Schools
              </p>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                  <span className="text-white/60 font-bold">UI – Live Now</span>
                </li>
                {["OAU", "UNILAG", "ABU", "FUTA"].map(code => (
                  <li key={code} className="text-white/20 text-sm">
                    {code} – Coming Soon
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/20 text-xs">
              © 2025 Roman Series™. All rights reserved.
            </p>
            <p className="text-white/15 text-xs">
              Built with ❤️ for Nigerian students 🇳🇬
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
