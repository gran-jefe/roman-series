"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [currentTestimonialIdx, setCurrentTestimonialIdx] = useState(0);

  // Countdown to launch (June 27, 2026) or discount (7 days after launch)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const launchDate = new Date(2026, 5, 27, 0, 0, 0, 0);
      const discountEnd = new Date(launchDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      discountEnd.setHours(23, 59, 59, 999);

      let targetDate: Date;
      let label: string;

      if (now < launchDate) {
        targetDate = launchDate;
        label = "launch";
      } else if (now < discountEnd) {
        targetDate = discountEnd;
        label = "discount";
      } else {
        setTimeLeft("");
        return;
      }

      const diff = targetDate.getTime() - now.getTime();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${label === "launch" ? "Launching in" : "Discount ends in"}: ${days}d ${hours}h ${minutes}m`);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
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

  return (
    <div className="min-h-screen bg-blush" style={{ colorScheme: 'light' }}>
      {/* Navbar - Blush with Subject Color Gradient */}
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-blush via-[#F5E8F0] to-blush shadow-md border-b border-gray-300/40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition flex items-center group relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-biology via-government to-chemistry opacity-0 group-hover:opacity-5 transition-opacity rounded-lg blur"></div>
            <Image
              src="/assets/logos/roman-series-full.png"
              alt="Roman Series"
              width={180}
              height={70}
              className="h-9 w-auto relative"
            />
          </Link>
          <div className="flex gap-4 items-center">
            {/* Subject color indicator bar - gradient of all subject colors */}
            <div className="hidden md:flex gap-1 h-7 rounded-full p-1 bg-white/40 backdrop-blur-sm border border-white/70 shadow-sm">
              <div className="w-4 h-5 rounded-sm bg-biology"></div>
              <div className="w-4 h-5 rounded-sm bg-government"></div>
              <div className="w-4 h-5 rounded-sm bg-chemistry"></div>
              <div className="w-4 h-5 rounded-sm bg-literature"></div>
              <div className="w-4 h-5 rounded-sm bg-crs"></div>
              <div className="w-4 h-5 rounded-sm bg-english"></div>
            </div>
            <div className="flex gap-3">
              {!user ? (
                <>
                  <Link
                    href="/login"
                    className="text-sm text-navy/70 hover:text-navy transition-colors font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm bg-navy text-white px-4 py-2 rounded-lg hover:bg-navy/90 transition-opacity font-semibold"
                  >
                    Get Started
                  </Link>
                </>
              ) : (
                <Link
                  href="/dashboard"
                  className="text-sm bg-navy text-white px-4 py-2 rounded-lg hover:bg-navy/90 transition-opacity font-semibold"
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Navy with premium feel */}
      <section className="bg-gradient-to-br from-navy via-[#0D1B2A] to-[#051014] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(26,122,74,0.1), rgba(26,122,74,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px'}}></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-forest/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-forest/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-40 text-center">

          {/* Logo - Bouncing animation */}
          <div className="mb-12 animate-bounce-soft">
            <Image src="/assets/logos/roman-series-full.png"
              alt="Roman Series" width={240} height={96}
              className="h-20 w-auto mx-auto brightness-0 invert drop-shadow-2xl" priority />
          </div>

          {/* Launch badge */}
          {timeLeft && (
            <div className="inline-flex items-center gap-3 mb-8 px-5 py-3 bg-white/5 border border-forest/30 rounded-full backdrop-blur-sm">
              <span className="w-2.5 h-2.5 bg-forest rounded-full animate-pulse"></span>
              <span className="text-sm font-semibold text-forest">⏰ {timeLeft}</span>
            </div>
          )}

          {/* Headline - Premium serif */}
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-serif font-bold mb-6 leading-[0.95] tracking-tight text-white">
            Ace Your<br/>
            <span className="text-forest">Post-UTME</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-white/75 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            9,600+ authentic past questions. AI-powered analytics. Predicted scores. Real admissions.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-24">
            <Link href={user ? "/dashboard" : "/register"}
              className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-gradient-to-r from-forest to-forest/90 text-white font-bold rounded-xl text-lg hover:shadow-2xl hover:shadow-forest/40 transition-all hover:-translate-y-1 border border-forest/50 relative overflow-hidden group">
              <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
              <span className="relative">{user ? "Go to Dashboard" : "Start Free Today"} →</span>
            </Link>
            <Link href="#pricing"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 border-2 border-white/40 text-white font-semibold rounded-xl text-lg hover:bg-white/10 hover:border-white/70 transition-all backdrop-blur-sm hover:backdrop-blur-md group">
              <span className="group-hover:translate-x-1 transition-transform">View Pricing</span>
            </Link>
          </div>

          {/* Stats - Premium layout */}
          <div className="grid grid-cols-3 gap-6 sm:gap-12 pt-16 border-t border-white/10 max-w-2xl mx-auto">
            <div>
              <div className="text-4xl sm:text-5xl font-serif font-black text-forest mb-2">9,600+</div>
              <div className="text-xs sm:text-sm text-white/50 font-medium tracking-wide">Questions</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-serif font-black text-forest mb-2">9</div>
              <div className="text-xs sm:text-sm text-white/50 font-medium tracking-wide">Universities</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-serif font-black text-forest mb-2">14</div>
              <div className="text-xs sm:text-sm text-white/50 font-medium tracking-wide">Subjects</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Blush background */}
      <section className="bg-blush py-24 sm:py-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-forest font-semibold text-sm uppercase tracking-widest mb-4">Why Roman Series</p>
            <h2 className="text-4xl sm:text-5xl font-serif font-bold text-navy mb-5">Everything You Need to Succeed</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">Built specifically for Nigerian Post-UTME preparation</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => (
              <div key={idx} className="group bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-forest/30 hover:shadow-2xl hover:shadow-forest/10 transition-all duration-300 cursor-default relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-forest/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-forest/15 to-forest/5 flex items-center justify-center text-3xl mb-5 group-hover:from-forest/25 group-hover:to-forest/10 transition-all shadow-sm">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-serif font-bold text-navy mb-3">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - White background */}
      <section className="bg-white py-24 sm:py-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-forest font-semibold text-sm uppercase tracking-widest mb-4">Getting Started</p>
            <h2 className="text-4xl sm:text-5xl font-serif font-bold text-navy">Three Simple Steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-0.5 bg-gradient-to-r from-transparent via-forest/30 to-transparent z-0"></div>
            {[
              {icon: "1", title: "Create Account", desc: "Sign up and pick your target university"},
              {icon: "2", title: "Select Subjects", desc: "Choose from 14 subjects to practice"},
              {icon: "3", title: "Track Progress", desc: "Get AI analytics and admission predictions"},
            ].map((step, idx) => (
              <div key={idx} className="relative z-10 bg-blush rounded-2xl p-8 border border-forest/10 text-center">
                <div className="w-14 h-14 bg-forest text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-serif font-bold ring-4 ring-white shadow-lg">
                  {step.icon}
                </div>
                <h3 className="font-serif font-bold text-navy text-lg mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects Section - Blush */}
      <section className="bg-blush py-24 sm:py-32 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-forest font-semibold text-sm uppercase tracking-widest mb-4">Coverage</p>
            <h2 className="text-4xl sm:text-5xl font-serif font-bold text-navy mb-4">All Post-UTME Subjects</h2>
            <p className="text-gray-600 text-lg">Topic-by-topic drilling with verified past questions</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SUBJECTS.map((subject) => (
              <Link key={subject.name} href={user ? "/dashboard" : "/register"}
                className={`${subject.color} text-white rounded-2xl p-6 text-center font-serif font-semibold text-sm sm:text-base hover:shadow-2xl hover:shadow-black/30 transition-all hover:-translate-y-2 border border-opacity-30 border-white/40 relative overflow-hidden group`}>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative block">{subject.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Universities Section - White */}
      <section className="bg-white py-24 sm:py-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-forest font-semibold text-sm uppercase tracking-widest mb-4">Partner Universities</p>
          <h2 className="text-4xl sm:text-5xl font-serif font-bold text-navy mb-4">Nigeria&apos;s Leading Institutions</h2>
          <p className="text-gray-600 text-lg mb-12">Practice questions specific to your target university</p>
          <div className="flex flex-wrap justify-center gap-3">
            {UNIVERSITIES.map((uni) => (
              <div key={uni.code} title={uni.name} className="bg-blush text-navy text-sm font-semibold px-6 py-3 rounded-full border-2 border-forest/30 hover:border-forest hover:bg-forest hover:text-white transition-all cursor-default">
                {uni.code}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section - Blush */}
      <section className="bg-blush py-24 sm:py-32 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-forest font-semibold text-sm uppercase tracking-widest mb-4">Success Stories</p>
            <h2 className="text-4xl sm:text-5xl font-serif font-bold text-navy mb-4">Student Testimonials</h2>
            <p className="text-gray-600 text-lg">Real students, real results, real admissions</p>
          </div>

          {/* Testimonial Card */}
          <div className="relative">
            <div key={currentTestimonialIdx} className="bg-white border-2 border-forest/25 rounded-3xl p-10 sm:p-12 relative overflow-hidden shadow-2xl shadow-forest/10">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-forest via-forest/60 to-forest/20"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-forest/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>

              {/* Stars */}
              <div className="flex gap-1 mb-8 text-yellow-400 text-xl">★★★★★</div>

              {/* Quote */}
              <p className="text-gray-700 text-lg leading-relaxed mb-10 italic font-light min-h-[100px]">
                &ldquo;{TESTIMONIALS[currentTestimonialIdx].text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                <div className="w-14 h-14 bg-navy text-white rounded-full flex items-center justify-center font-serif font-bold text-lg flex-shrink-0 shadow-md">
                  {TESTIMONIALS[currentTestimonialIdx].initial}
                </div>
                <div className="flex-1">
                  <p className="font-serif font-bold text-navy text-lg">
                    {TESTIMONIALS[currentTestimonialIdx].author}
                  </p>
                  <p className="text-sm text-forest font-medium">
                    {TESTIMONIALS[currentTestimonialIdx].role}
                  </p>
                </div>
                {TESTIMONIALS[currentTestimonialIdx].score && (
                  <span className="text-xs font-bold px-3 py-2 bg-forest/10 text-forest rounded-lg whitespace-nowrap">
                    {TESTIMONIALS[currentTestimonialIdx].score}
                  </span>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => setCurrentTestimonialIdx((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                className="w-11 h-11 rounded-full border-2 border-forest/40 hover:border-forest hover:bg-forest hover:text-white transition-all flex items-center justify-center text-forest font-bold">
                ←
              </button>

              <div className="flex gap-2">
                {TESTIMONIALS.slice(
                  Math.max(0, Math.min(currentTestimonialIdx - 3, TESTIMONIALS.length - 7)),
                  Math.max(7, Math.min(currentTestimonialIdx + 4, TESTIMONIALS.length))
                ).map((_, i) => {
                  const actualIdx = Math.max(0, Math.min(currentTestimonialIdx - 3, TESTIMONIALS.length - 7)) + i;
                  return (
                    <button key={actualIdx}
                      onClick={() => setCurrentTestimonialIdx(actualIdx)}
                      className={`h-2.5 rounded-full transition-all ${
                        actualIdx === currentTestimonialIdx
                          ? "bg-forest w-7"
                          : "bg-forest/30 w-2.5 hover:bg-forest/50"
                      }`}/>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentTestimonialIdx((prev) => (prev + 1) % TESTIMONIALS.length)}
                className="w-11 h-11 rounded-full border-2 border-forest/40 hover:border-forest hover:bg-forest hover:text-white transition-all flex items-center justify-center text-forest font-bold">
                →
              </button>
            </div>
          </div>

          {/* Trust Stats */}
          <div className="mt-16 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white rounded-2xl p-8 border-2 border-forest/15 hover:border-forest/30 transition-all shadow-md hover:shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-forest/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-3xl font-serif font-black text-forest relative">5,000+</p>
              <p className="text-xs text-gray-600 mt-2 font-medium relative">Active Students</p>
            </div>
            <div className="bg-white rounded-2xl p-8 border-2 border-forest/15 hover:border-forest/30 transition-all shadow-md hover:shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-forest/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-3xl font-serif font-black text-forest relative">98%</p>
              <p className="text-xs text-gray-600 mt-2 font-medium relative">Success Rate</p>
            </div>
            <div className="bg-white rounded-2xl p-8 border-2 border-forest/15 hover:border-forest/30 transition-all shadow-md hover:shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-forest/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-3xl font-serif font-black text-forest relative">4.9★</p>
              <p className="text-xs text-gray-600 mt-2 font-medium relative">Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - White */}
      <section id="pricing" className="bg-white py-24 sm:py-32 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">

          {/* Discount banner */}
          <div className="mb-12 p-5 bg-forest/5 border-2 border-forest/30 rounded-2xl text-center">
            <p className="text-forest font-semibold text-sm">
              🎉 Limited-Time Launch Pricing
              {timeLeft && <span className="text-forest/60"> · {timeLeft}</span>}
            </p>
          </div>

          <div className="text-center mb-16">
            <p className="text-forest font-semibold text-sm uppercase tracking-widest mb-4">Pricing</p>
            <h2 className="text-4xl sm:text-5xl font-serif font-bold text-navy mb-4">Transparent, Fair Pricing</h2>
            <p className="text-gray-600 text-lg">Start free. Upgrade when you&apos;re ready.</p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`rounded-3xl overflow-hidden flex flex-col transition-all duration-300 ${plan.highlighted ? "ring-3 ring-forest shadow-2xl shadow-forest/30 bg-gradient-to-b from-white via-white to-blush border border-white/60 scale-105" : "bg-white border-2 border-gray-200/60 hover:border-forest/30 hover:shadow-2xl hover:shadow-forest/10 hover:scale-102"}`}>
                {plan.badge && (
                  <div className="bg-gradient-to-r from-forest to-forest/80 text-white text-center py-3 px-6 text-xs font-serif font-bold uppercase tracking-widest relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'}}></div>
                    <span className="relative">⭐ {plan.badge}</span>
                  </div>
                )}
                <div className="p-8 flex flex-col flex-1">
                  <div className="mb-8">
                    <h3 className="text-2xl font-serif font-bold text-navy mb-2">{plan.name}</h3>
                    <p className="text-gray-500 text-sm">{plan.description}</p>
                  </div>

                  <div className="mb-10">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-5xl font-serif font-black text-navy">
                        {plan.price}
                      </span>
                      {plan.originalPrice && (
                        <span className="text-gray-400 line-through text-lg">
                          {plan.originalPrice}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mt-2">/ {plan.duration}</p>
                  </div>

                  <Link href={user ? "/dashboard" : "/register"} className={`block w-full py-3 rounded-xl font-semibold text-center text-base transition-all mb-10 font-serif ${plan.highlighted ? "bg-forest text-white hover:bg-forest/90 shadow-lg" : "border-2 border-forest text-forest hover:bg-forest hover:text-white"}`}>
                    {user ? "Go to Dashboard" : "Get Started"}
                  </Link>

                  <div className="space-y-3 flex-1">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <span className="text-forest font-bold flex-shrink-0 mt-0.5">✓</span>
                        <span className="text-gray-700 text-sm font-light">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Free trial note */}
          <div className="mt-12 text-center p-8 bg-blush rounded-2xl border-2 border-forest/20">
            <p className="text-navy font-serif font-bold text-lg mb-2">Start for free, no credit card needed</p>
            <p className="text-gray-600 text-sm mb-6">
              Try Explorer — 20 questions daily, forever free. Upgrade to Scholar or Elite whenever you&apos;re ready.
            </p>
            <Link href={user ? "/dashboard" : "/register"} className="text-forest font-bold font-serif text-sm hover:underline">
              Start free →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section - Navy */}
      <section className="bg-navy py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, white, white 1px, transparent 1px)', backgroundSize: '50px 50px'}}></div>
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-6">
            Your Admission Awaits
          </h2>
          <p className="text-white/70 text-lg mb-10 font-light">
            Join thousands of students already preparing with Roman Series
          </p>
          <Link href={user ? "/dashboard" : "/register"} className="inline-flex items-center gap-2 bg-forest text-white px-10 py-5 rounded-lg font-serif font-bold text-lg hover:bg-forest/90 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-forest/40 border border-forest">
            {user ? "Go to Dashboard" : "Get Started Free"} →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-16">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 bg-forest rounded-lg flex items-center justify-center text-xs font-serif font-black">RS</div>
                <span className="font-serif font-bold text-lg">Roman Series</span>
              </div>
              <p className="text-white/50 text-xs leading-relaxed font-light">
                Nigeria&apos;s most trusted Post-UTME preparation platform, built for Nigerian students.
              </p>
            </div>
            <div>
              <p className="text-white/70 text-xs font-serif font-bold uppercase tracking-widest mb-6">Product</p>
              <ul className="space-y-3 text-sm text-white/60 font-light">
                <li><Link href="/" className="hover:text-white transition">Home</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="/analytics" className="hover:text-white transition">Analytics</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-white/70 text-xs font-serif font-bold uppercase tracking-widest mb-6">Account</p>
              <ul className="space-y-3 text-sm text-white/60 font-light">
                <li><Link href="/login" className="hover:text-white transition">Sign In</Link></li>
                <li><Link href="/register" className="hover:text-white transition">Register</Link></li>
                <li><Link href="/feedback" className="hover:text-white transition">Feedback</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-white/70 text-xs font-serif font-bold uppercase tracking-widest mb-6">Universities</p>
              <ul className="space-y-3 text-sm text-white/60 font-light">
                {UNIVERSITIES.slice(0, 5).map(uni => (
                  <li key={uni.code} className="hover:text-white/80 transition cursor-default">{uni.code}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-white/40 text-xs font-light">
              © 2025 Roman Series. All rights reserved.
            </p>
            <p className="text-white/30 text-xs font-light">
              Built with intention for Nigerian students 🇳🇬
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
