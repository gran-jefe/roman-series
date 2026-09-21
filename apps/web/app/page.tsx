"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import {
  TrendingUp,
  Star,
  CheckCircle2,
  XCircle,
  Target,
  BarChart3,
  Clipboard,
  Trophy,
  Clock,
  Zap,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Brain,
  Sparkles,
  Shield,
  HelpCircle,
  Award,
  BookOpen,
  Check,
  Flame,
  GraduationCap,
  Users,
  Heart,
} from "lucide-react";
import { InteractiveQuestionDemo } from "@/components/InteractiveQuestionDemo";

export default function LandingPage() {
  const { user } = useAuth();
  const [currentTestimonialIdx, setCurrentTestimonialIdx] = useState(0);
  const [activeCourseTab, setActiveCourseTab] = useState(0);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  // Auto-advance testimonials every 6 seconds
  useEffect(() => {
    const testimonialTimer = setInterval(() => {
      setCurrentTestimonialIdx((prev) => (prev + 1) % 34);
    }, 6000);
    return () => clearInterval(testimonialTimer);
  }, []);

  const SUBJECTS = [
    { name: "Biology", questions: "2,400+ Qs", color: "bg-emerald-600", border: "border-emerald-200", tag: "Pre-Med & Science" },
    { name: "Use of English", questions: "3,100+ Qs", color: "bg-blue-600", border: "border-blue-200", tag: "Compulsory All Courses" },
    { name: "Chemistry", questions: "2,150+ Qs", color: "bg-rose-600", border: "border-rose-200", tag: "Pre-Med & Science" },
    { name: "Physics", questions: "1,950+ Qs", color: "bg-amber-700", border: "border-amber-200", tag: "Engineering & Science" },
    { name: "Mathematics", questions: "2,200+ Qs", color: "bg-indigo-600", border: "border-indigo-200", tag: "Physical Sciences" },
    { name: "Government", questions: "1,800+ Qs", color: "bg-slate-700", border: "border-slate-200", tag: "Law & Social Sciences" },
    { name: "Literature in English", questions: "1,400+ Qs", color: "bg-orange-600", border: "border-orange-200", tag: "Law & Arts" },
    { name: "Economics", questions: "1,650+ Qs", color: "bg-sky-600", border: "border-sky-200", tag: "Management & Arts" },
    { name: "C.R.S.", questions: "950+ Qs", color: "bg-yellow-600", border: "border-yellow-200", tag: "Arts & Humanities" },
    { name: "I.R.S.", questions: "850+ Qs", color: "bg-pink-600", border: "border-pink-200", tag: "Arts & Humanities" },
    { name: "Commerce", questions: "1,100+ Qs", color: "bg-amber-600", border: "border-amber-200", tag: "Commercial" },
    { name: "Accounting", questions: "900+ Qs", color: "bg-purple-600", border: "border-purple-200", tag: "Commercial" },
    { name: "Yoruba", questions: "650+ Qs", color: "bg-teal-600", border: "border-teal-200", tag: "Arts & Languages" },
    { name: "Music", questions: "450+ Qs", color: "bg-violet-600", border: "border-violet-200", tag: "Creative Arts" },
  ];

  const TARGET_COURSES = [
    {
      course: "Medicine & Surgery (MBBS)",
      university: "University of Ibadan (UI)",
      cutoff: 78.5,
      targetUtme: "315+",
      targetPutme: "82+",
      safeZone: "Score 80+ in PUTME for guaranteed merit admission",
      subjects: ["English", "Biology", "Chemistry", "Physics"],
    },
    {
      course: "Law (LL.B)",
      university: "University of Ibadan (UI)",
      cutoff: 76.0,
      targetUtme: "295+",
      targetPutme: "78+",
      safeZone: "Score 75+ in PUTME for safe merit quota",
      subjects: ["English", "Literature", "Government", "CRS/IRS"],
    },
    {
      course: "Pharmacy (Pharm.D)",
      university: "University of Ibadan (UI)",
      cutoff: 74.2,
      targetUtme: "290+",
      targetPutme: "76+",
      safeZone: "Score 74+ in PUTME with 280+ UTME",
      subjects: ["English", "Biology", "Chemistry", "Physics"],
    },
    {
      course: "Computer Science",
      university: "University of Ibadan (UI)",
      cutoff: 73.0,
      targetUtme: "285+",
      targetPutme: "74+",
      safeZone: "Score 72+ in PUTME with high Math/Physics scores",
      subjects: ["English", "Mathematics", "Physics", "Chemistry"],
    },
    {
      course: "Nursing Science",
      university: "University of Ibadan (UI)",
      cutoff: 73.5,
      targetUtme: "285+",
      targetPutme: "75+",
      safeZone: "Score 73+ in PUTME for merit qualification",
      subjects: ["English", "Biology", "Chemistry", "Physics"],
    },
  ];

  const FEATURES = [
    {
      title: "Real-Time Cutoff & Admission Predictor",
      desc: "Instant statistical prediction of your combined aggregate score and department admission likelihood based on official university cutoff data.",
      icon: <Target className="w-6 h-6 text-[#1A7A4A]" />,
      badge: "High Yield",
    },
    {
      title: "Identical CBT Exam Environment",
      desc: "Practice with the exact layout, countdown clock, question navigation, and keyboard hotkeys used in official UTME & Post-UTME screening tests.",
      icon: <Clock className="w-6 h-6 text-[#1A7A4A]" />,
      badge: "Exam Simulation",
    },
    {
      title: "Automated Error Bank & Memory Booster",
      desc: "Every mistake you make is automatically isolated in your personal Error Bank. Drill your failed questions until your mastery hits 100%.",
      icon: <Brain className="w-6 h-6 text-[#1A7A4A]" />,
      badge: "Smart Retention",
    },
    {
      title: "Verified Step-by-Step Explanations",
      desc: "No more ambiguous or unverified answer keys. Every question contains comprehensive explanations crafted by top subject scholars.",
      icon: <BookOpen className="w-6 h-6 text-[#1A7A4A]" />,
      badge: "100% Verified",
    },
    {
      title: "Percentile & Cohort Benchmarking",
      desc: "See how your scores stack up against competitors aiming for the exact same course and department in your target university.",
      icon: <Trophy className="w-6 h-6 text-[#1A7A4A]" />,
      badge: "Competitive Edge",
    },
    {
      title: "AI Weak-Topic Prioritisation",
      desc: "Receive actionable analytics that pinpoint exactly which chapters (e.g. Organic Chemistry, Plant Morphology) will give you the biggest score gain.",
      icon: <TrendingUp className="w-6 h-6 text-[#1A7A4A]" />,
      badge: "Targeted Growth",
    },
  ];

  const COMPARISONS = [
    {
      metric: "Question Keys & Verification",
      traditional: "Frequent typos, disputed answers, and zero explanations for why an option is right.",
      romanSeries: "100% verified by subject scholars with detailed step-by-step rationales.",
    },
    {
      metric: "Time & Pacing Pressure",
      traditional: "Untimed casual reading builds false confidence; students freeze under CBT exam clocks.",
      romanSeries: "Realistic countdown simulation with per-question pacing diagnostics to build exam composure.",
    },
    {
      metric: "Mistake Retention",
      traditional: "You forget your errors immediately after marking; repeated mistakes on exam day.",
      romanSeries: "Smart Error Bank automatically stores wrong answers for targeted re-drilling until mastered.",
    },
    {
      metric: "Cutoff & Admission Readiness",
      traditional: "Blind guesswork — you never know if your score meets your department's cutoff.",
      romanSeries: "Live Admission Probability Meter calculates your exact chances against departmental cutoffs.",
    },
    {
      metric: "Study Flexibility",
      traditional: "Heavy, cumbersome booklets you have to leave at home.",
      romanSeries: "Seamless on any smartphone, tablet, or laptop — practice anytime, anywhere.",
    },
  ];

  const TESTIMONIALS = [
    {
      text: "If you're captivated by the idea of gaining admission to the illustrious University of Ibadan, the Roman Series is an invaluable resource. I wholeheartedly give these books a five-star rating. I genuinely believe that I wouldn't have excelled in the exam without the consistent practice provided by these books.",
      author: "Bello Maryam Oladunni",
      role: "400-Level, Law, University of Ibadan",
      initial: "B",
      score: "Admitted",
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
      score: "Admitted",
    },
    {
      text: "Thanks to the divine grace of God and the assistance provided by the Roman Series, I am now proud to say that I am a law student at the prestigious University of Ibadan.",
      author: "OSUNWA DAVID CHIBUIKE",
      role: "400-Level, Law, University of Ibadan",
      initial: "O",
      score: "Admitted",
    },
    {
      text: "The Roman numeral past questions were exceptionally detailed. I passed with flying colors. Today, I take immense pride in declaring myself a bona fide Law student at the esteemed University of Ibadan.",
      author: "OLAYINKA TAIWO",
      role: "400-Level, Law, University of Ibadan",
      initial: "O",
      score: "Admitted",
    },
    {
      text: "I began to see significant improvements through the daily and weekly tests. Alhamdulillah, I can confidently attribute my success in the Post-UTME to the invaluable assistance provided by the Roman Series.",
      author: "Adebayo Zaynab Anike",
      role: "400-Level, Law, University of Ibadan",
      initial: "A",
      score: "Admitted",
    },
    {
      text: "The Roman Series by Mr. Habeeb A. Kasali is an invaluable resource. I have no regrets about acquiring these books; it stands as the finest decision I made in preparing for the UI POST UTME.",
      author: "Raji Adebisi",
      role: "400-Level, Law, University of Ibadan",
      initial: "R",
      score: "Admitted",
    },
    {
      text: "Words alone cannot do justice to the incredible support that the Roman Series provided. It stands as the finest decision I made in terms of preparing for the UI POST UTME.",
      author: "Ayomide A. Awofeso",
      role: "400-Level, Law, University of Ibadan",
      initial: "A",
      score: "Admitted",
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
      score: "Admitted",
    },
    {
      text: "The Roman Series served as an eye-opener, revealing numerous gaps in my knowledge. Mr. Habeeb became a valuable mentor. Today, I am immensely proud to declare that I am a Law student at UI.",
      author: "Mariam Oluwatoyosi Oyelaja",
      role: "400-Level, Law, University of Ibadan",
      initial: "M",
      score: "Admitted",
    },
    {
      text: "The Roman Series stands as the ultimate key for tackling exams structured around the Roman numeral format. What truly sets it apart is the detailed answers and explanations for each question.",
      author: "OLASUPO AKOREDE JOHNSON",
      role: "400-Level, Law, University of Ibadan",
      initial: "O",
      score: "Admitted",
    },
    {
      text: "This book has been an incredible blessing to me as I prepared for my Post-UTME. It equipped me with the knowledge to confidently tackle any UI POST UTME question.",
      author: "Bamigbade Ayomide Peter",
      role: "400-Level, Law, University of Ibadan",
      initial: "B",
      score: "Admitted",
    },
    {
      text: "These roman series are not just a set of past questions, but a set of life-changing masterpiece carefully crafted using pundits in each field. Words can't completely corroborate the explicitness of this work.",
      author: "Fagbenro Rosheed Iyiola",
      role: "400-Level, Law, University of Ibadan",
      initial: "F",
      score: "Admitted",
    },
    {
      text: "The series are amazing eye openers to what UI plans to surprise you with in your Post UTME. By the grace of God, success will be yours. The Roman Series is a key to the gateway of success.",
      author: "Yahya Muaz Okikiola",
      role: "400-Level, Law, University of Ibadan",
      initial: "Y",
      score: "Admitted",
    },
    {
      text: "Without the Roman series, I wouldn't have passed my PUTME. Dos Habeeb consistently encouraged us to practice diligently, and it proved invaluable.",
      author: "Abolade Joy",
      role: "400-Level, Philosophy, University of Ibadan",
      initial: "A",
      score: "Admitted (2nd Attempt)",
    },
    {
      text: "Before encountering this book, I never realized how both Government and Literature could be so vast yet simplified. This book unraveled the complex questions I had struggled with for years.",
      author: "LAWAL HALIMAH",
      role: "400-Level, CLA, University of Ibadan",
      initial: "L",
      score: "Admitted",
    },
    {
      text: "The New Roman Series was truly an eye-opener during my Post-UTME preparation. Having prepared with it gave me the confidence to stay focused. I highly recommend it to any UI Post-UTME aspirant.",
      author: "Omotayo Oreoluwa",
      role: "400-Level, Theatre Arts, University of Ibadan",
      initial: "O",
      score: "Admitted",
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
      score: "Admitted",
    },
    {
      text: "Its well-structured past questions helped me understand the exam pattern, improve my speed and accuracy. I am delighted to have gained admission and strongly recommend it to every serious UI aspirant.",
      author: "Fatimat Zubair",
      role: "Nursing, University of Ibadan",
      initial: "F",
      score: "Admitted",
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
      score: "Admitted",
    },
    {
      text: "Roman Series was an orientation designed to prepare students for the reality of the UI POST-UTME. During the exam, the questions looked familiar because they followed the same pattern.",
      author: "Alowonle Abdulsamad Ishola",
      role: "University of Ibadan",
      initial: "A",
      score: "Admitted",
    },
    {
      text: "The Roman series helped me a lot during my post UTME. It served as an excellent guide when writing UI's exam. The questions had clear solutions and it was really easy to understand.",
      author: "Olajuwon Olaitan Folawe",
      role: "200-Level, Civil Engineering, University of Ibadan",
      initial: "O",
      score: "Admitted",
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
      description: "Get started with essential CBT practice",
      badge: null,
      highlighted: false,
      cta: "Start Free Practice",
      features: [
        "1–2 subjects selection",
        "20 questions per day",
        "1 full mock exam",
        "Timed CBT interface",
        "Last 10 errors saved in Error Bank",
        "Basic performance statistics",
        "Daily streak tracking",
        "Top 20 global leaderboard",
      ],
    },
    {
      name: "Scholar",
      price: "₦2,500",
      originalPrice: "₦3,500",
      duration: "6 months",
      description: "Comprehensive UTME & Post-UTME full-season access",
      badge: "Most Popular",
      highlighted: true,
      cta: "Get Scholar Pass",
      features: [
        "All 15 subjects unlocked",
        "Unlimited practice questions every day",
        "3 full-length mock exams per week",
        "Complete permanent Error Bank",
        "Topic-by-topic performance breakdown",
        "Peer cohort comparison insights",
        "Full global student leaderboard",
        "Priority exam guidance & updates",
      ],
    },
    {
      name: "Elite",
      price: "₦3,500",
      originalPrice: "₦5,000",
      duration: "6 months",
      description: "For top 1% candidates targeting high merit cutoffs",
      badge: "Best Value",
      highlighted: false,
      cta: "Get Elite All-Access",
      features: [
        "Everything in Scholar tier",
        "Unlimited mock exams anytime",
        "Hard-mode exam challenge setting",
        "Access to authentic recalled questions",
        "Advanced predictive cutoff scoring",
        "Admission probability diagnostic meter",
        "Course-specific departmental ranking",
        "Percentile ranking (Ahead of X% of peers)",
        "AI-guided weak topic prioritisation",
        "Time-pressure pacing diagnostics",
        "Elite verified blue check badge",
      ],
    },
  ];

  const FAQS = [
    {
      q: "What examinations does Roman Series cover?",
      a: "Roman Series prepares students for both the JAMB UTME (National) and university Post-UTME screening examinations (specifically tailored for University of Ibadan and top federal/state universities).",
    },
    {
      q: "How does the Admission Probability Meter work?",
      a: "Our algorithm calculates your combined UTME + Post-UTME aggregate score and maps it against verified historical departmental cutoff marks (e.g. Medicine, Law, Pharmacy, Computer Science) to give you an accurate gauge of your admission readiness.",
    },
    {
      q: "Can I use Roman Series on my Android or iPhone?",
      a: "Yes! Roman Series is a modern Progressive Web App (PWA). You can practice on any smartphone, tablet, or PC without needing an app store download. You can even tap 'Add to Home Screen' for instant 1-tap launch.",
    },
    {
      q: "What makes Roman Series different from regular past question booklets?",
      a: "Paper booklets often have typographic errors, wrong answer keys, and provide zero timed pressure or weakness diagnostics. Roman Series simulates the true CBT exam software, tracks your errors in an automated Error Bank, and provides step-by-step explanations for every question.",
    },
    {
      q: "How does the 6-month subscription work?",
      a: "Once you purchase Scholar (₦2,500) or Elite (₦3,500), you receive unrestricted 6-month access. This covers your entire preparation journey through UTME registration, exams, Post-UTME screenings, and admission lists.",
    },
  ];

  const selectedCourse = TARGET_COURSES[activeCourseTab];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-navy font-[var(--font-jakarta)] selection:bg-forest/20 selection:text-forest">
      {/* ──── STICKY NAVBAR ──── */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/assets/logos/roman-series-full.png"
              alt="Roman Series"
              width={140}
              height={50}
              className="h-9 sm:h-10 w-auto"
              priority
            />
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-forest/10 text-forest border border-forest/20">
              2026/2027
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-7 text-sm font-semibold text-gray-600">
            <a href="#cbt-demo" className="hover:text-forest transition">
              CBT Demo
            </a>
            <a href="#why-roman-series" className="hover:text-forest transition">
              Why Us
            </a>
            <a href="#subjects" className="hover:text-forest transition">
              Subjects
            </a>
            <a href="#admission-predictor" className="hover:text-forest transition">
              Admission Predictor
            </a>
            <a href="#results" className="hover:text-forest transition">
              Results
            </a>
            <a href="#pricing" className="hover:text-forest transition">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-3">
            {!user ? (
              <>
                <Link
                  href="/login"
                  className="text-sm font-bold text-gray-700 hover:text-navy px-3 py-2 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-xs sm:text-sm bg-forest text-white px-4 sm:px-5 py-2.5 rounded-xl font-bold hover:bg-forest/90 transition shadow-sm hover:shadow hover:-translate-y-0.5"
                >
                  Start Practicing Free →
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="text-xs sm:text-sm bg-forest text-white px-4 sm:px-5 py-2.5 rounded-xl font-bold hover:bg-forest/90 transition shadow-sm"
              >
                Go to Dashboard →
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ──── HERO SECTION ──── */}
      <section className="relative bg-[#0A1628] text-white pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-forest/20 rounded-full blur-[140px] pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-ember/15 rounded-full blur-[130px] pointer-events-none -ml-20 -mb-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-500/10 rounded-full blur-[160px] pointer-events-none" />

        {/* Subtle dot/grid background */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline & Action */}
            <div className="lg:col-span-7 text-center lg:text-left">
              {/* Campaign Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-6">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-bold tracking-wide text-white/90">
                  NEW SEASON · JAMB UTME &amp; POST-UTME 2026/2027
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] mb-6 text-white">
                Master Every Question. <br />
                <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
                  Secure Your Dream Admission.
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg lg:text-xl text-white/70 max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed mb-8 sm:mb-10">
                Practice with <strong>15,000+ authentic past questions</strong>, realistic CBT exam software, AI-powered weak topic diagnostics, and predictive departmental cut-off scoring for serious candidates targeting 300+ in UTME and 80+ in Post-UTME.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
                <Link
                  href={user ? "/dashboard" : "/register"}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-forest text-white font-black text-base sm:text-lg rounded-2xl hover:bg-forest/90 transition shadow-lg shadow-forest/30 hover:-translate-y-0.5"
                >
                  <span>{user ? "Continue to Dashboard" : "Start Practicing Free"}</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <a
                  href="#cbt-demo"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-base transition backdrop-blur-sm"
                >
                  <span>Try Live CBT Demo</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">Instant</span>
                </a>
              </div>

              {/* Trust & Proof Bar */}
              <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 text-left">
                <div className="flex -space-x-2">
                  {["A", "B", "O", "S", "M"].map((initial, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-[#0A1628] bg-forest flex items-center justify-center text-xs font-bold text-white"
                    >
                      {initial}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-xs font-bold text-white ml-1">5.0 Star Rating</span>
                  </div>
                  <p className="text-xs text-white/60 font-medium">
                    Trusted by 5,000+ candidates admitted to UI Medicine, Law, Pharmacy &amp; Engineering
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive CBT Demo Card */}
            <div id="cbt-demo" className="lg:col-span-5 relative">
              {/* Floating Benefit Badges */}
              <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold absolute -top-4 -left-4 z-10 shadow-lg">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>True-to-Life CBT Exam Engine</span>
              </div>

              <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold absolute -bottom-4 -right-4 z-10 shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>100% Verified Explanations</span>
              </div>

              <InteractiveQuestionDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ──── CORE METRIC BAR ──── */}
      <section className="bg-white border-b border-gray-200 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-gray-100 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-forest/10 flex items-center justify-center flex-shrink-0 text-forest">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-navy">15,000+</h3>
                <p className="text-xs sm:text-sm font-semibold text-gray-500">Authentic past questions with detailed solutions</p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-gray-100 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-600">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-navy">300+ / 80+</h3>
                <p className="text-xs sm:text-sm font-semibold text-gray-500">Benchmark target scores for high-demand courses</p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-gray-100 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-navy">5,000+</h3>
                <p className="text-xs sm:text-sm font-semibold text-gray-500">Aspirants admitted into Medicine, Law &amp; Sciences</p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-gray-100 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0 text-purple-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-navy">100% CBT</h3>
                <p className="text-xs sm:text-sm font-semibold text-gray-500">Timed exam pressure identical to official CBT halls</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── WHY ROMAN SERIES BEATS PAPER PAST QUESTIONS (COMPARISON) ──── */}
      <section id="why-roman-series" className="py-20 sm:py-28 px-4 sm:px-6 bg-[#FAF7F4]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-forest/10 text-forest mb-3">
              The Smarter Way to Prepare
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-navy tracking-tight mb-4">
              Why Top Scorers Stop Using Paper Booklets
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Exam screening is 100% computer-based. Preparing with static paper booklets leaves you unprepared for pacing, wrong answer keys, and cutoff realities.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-200/80 overflow-hidden">
            <div className="grid grid-cols-12 bg-navy text-white text-xs sm:text-sm font-bold uppercase tracking-wider py-4 px-6">
              <div className="col-span-4 sm:col-span-3">Preparation Feature</div>
              <div className="col-span-4 sm:col-span-4 text-red-300">Paper / PDF Booklets</div>
              <div className="col-span-4 sm:col-span-5 text-emerald-400 font-extrabold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Roman Series AI Platform</span>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {COMPARISONS.map((comp, idx) => (
                <div key={idx} className="grid grid-cols-12 py-5 px-6 items-center gap-3 sm:gap-4 hover:bg-gray-50/70 transition">
                  <div className="col-span-12 sm:col-span-3 font-bold text-sm text-navy">
                    {comp.metric}
                  </div>
                  <div className="col-span-12 sm:col-span-4 text-xs sm:text-sm text-gray-500 flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{comp.traditional}</span>
                  </div>
                  <div className="col-span-12 sm:col-span-5 text-xs sm:text-sm font-semibold text-gray-800 flex items-start gap-2 bg-forest/5 p-3 rounded-xl border border-forest/15">
                    <CheckCircle2 className="w-4 h-4 text-forest flex-shrink-0 mt-0.5" />
                    <span>{comp.romanSeries}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-forest/10 via-emerald-50 to-teal-50 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-forest/20">
              <div>
                <h4 className="font-extrabold text-navy text-base sm:text-lg mb-1">
                  Ready to upgrade from guesswork to guaranteed mastery?
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">
                  Join thousands of candidates currently preparing with verified CBT simulations.
                </p>
              </div>
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-forest text-white font-bold text-sm hover:bg-forest/90 transition shadow-sm"
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ──── ALL 15 SUBJECTS SECTION ──── */}
      <section id="subjects" className="py-20 sm:py-28 px-4 sm:px-6 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 mb-3">
              Full Exam Scope
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-navy tracking-tight mb-4">
              All 14 Subjects. Topic-by-Topic Drilling.
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Whether you are sitting for Science, Social Science, Arts, or Commercial courses, practice past questions organized strictly by syllabus topic.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {SUBJECTS.map((sub, idx) => (
              <div
                key={idx}
                className="group relative bg-[#F8FAFC] hover:bg-white rounded-2xl p-5 border border-gray-200 hover:border-forest/40 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`w-3 h-3 rounded-full ${sub.color}`} />
                  <span className="text-[11px] font-bold text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200">
                    {sub.questions}
                  </span>
                </div>

                <h3 className="text-lg font-black text-navy mb-1 group-hover:text-forest transition">
                  {sub.name}
                </h3>
                <p className="text-xs text-gray-500 mb-4">{sub.tag}</p>

                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:underline"
                >
                  <span>Practice Questions</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── ADMISSION PROBABILITY & PREDICTIVE METER SHOWCASE ──── */}
      <section id="admission-predictor" className="py-20 sm:py-28 px-4 sm:px-6 bg-[#0D1B2A] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-forest/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-emerald-400 border border-white/15 mb-3">
              Elite Predictive AI
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4">
              Real-Time Admission Probability Meter
            </h2>
            <p className="text-base sm:text-lg text-white/70">
              Never wonder if your score is high enough. Roman Series compares your timed mock scores with verified departmental cutoffs to calculate your exact merit probability.
            </p>
          </div>

          {/* Interactive Course Selection Tabs */}
          <div className="flex gap-2 justify-center mb-8 overflow-x-auto pb-2 no-scrollbar">
            {TARGET_COURSES.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setActiveCourseTab(idx)}
                className={`text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${
                  activeCourseTab === idx
                    ? "bg-forest text-white shadow-lg shadow-forest/30"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                {item.course}
              </button>
            ))}
          </div>

          {/* Interactive Predictor Showcase Card */}
          <div className="bg-white/95 text-navy rounded-3xl p-6 sm:p-10 shadow-2xl border border-white/20">
            <div className="grid md:grid-cols-12 gap-8 items-center">
              {/* Left stats */}
              <div className="md:col-span-6 space-y-6">
                <div>
                  <div className="text-xs font-bold text-forest uppercase tracking-wider mb-1">
                    Target Department &amp; Institution
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-navy">
                    {selectedCourse.course}
                  </h3>
                  <p className="text-sm font-semibold text-gray-500">
                    {selectedCourse.university}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase">Historical Cutoff</span>
                    <div className="text-3xl font-black text-navy mt-1">
                      {selectedCourse.cutoff}
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">Merit Benchmark</span>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <span className="text-xs font-bold text-emerald-800 uppercase">Safe Score Target</span>
                    <div className="text-3xl font-black text-forest mt-1">
                      {selectedCourse.targetPutme}
                    </div>
                    <span className="text-[11px] text-emerald-700 font-medium">with {selectedCourse.targetUtme} UTME</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900 mb-1">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <span>AI Diagnostic Guidance</span>
                  </div>
                  <p className="text-xs text-blue-950 font-medium leading-relaxed">
                    {selectedCourse.safeZone}. Required subject combination:{" "}
                    <strong>{selectedCourse.subjects.join(", ")}</strong>.
                  </p>
                </div>
              </div>

              {/* Right visual meter */}
              <div className="md:col-span-6 bg-[#0A1628] text-white p-6 sm:p-8 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Simulated Candidate Profile
                  </span>
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/80 font-semibold">
                    Live Status
                  </span>
                </div>

                <div className="my-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm font-semibold text-white/70">Admission Readiness</span>
                    <span className="text-2xl font-black text-emerald-400">92%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-green-400 to-teal-300 rounded-full transition-all duration-700"
                      style={{ width: "92%" }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-white/40 mt-1.5">
                    <span>Critical (&lt;50)</span>
                    <span>Competitive (70)</span>
                    <span className="text-emerald-400 font-bold">Safe Zone (80+)</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-2 text-xs text-white/70">
                  <div className="flex justify-between">
                    <span>UTME Score Simulation:</span>
                    <span className="font-bold text-white">312 / 400</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Post-UTME Mock Average:</span>
                    <span className="font-bold text-white">84 / 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aggregate Score:</span>
                    <span className="font-bold text-emerald-400">80.5 (Above Cutoff)</span>
                  </div>
                </div>

                <Link
                  href="/register"
                  className="mt-6 w-full text-center py-3 bg-forest hover:bg-forest/90 text-white rounded-xl font-bold text-xs transition"
                >
                  Check Your Own Admission Probability →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── FEATURES GRID ──── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-forest/10 text-forest mb-3">
              Engineered for Excellence
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-navy tracking-tight mb-4">
              Everything You Need to Secure Admission
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Built by university scholars and top engineers specifically for the realities of Nigerian tertiary CBT admissions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {FEATURES.map((feat, idx) => (
              <div
                key={idx}
                className="p-7 rounded-2xl bg-[#F8FAFC] border border-gray-200/80 hover:border-forest/40 hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#0D1B2A]/5 border border-slate-200/80 flex items-center justify-center flex-shrink-0">
                      {feat.icon}
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-forest/10 text-forest">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-navy mb-2.5">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">
                    {feat.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-forest">
                  <span>Available on Roman Series</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── VERIFIED STUDENT WALL OF LOVE (TESTIMONIALS) ──── */}
      <section id="results" className="py-20 sm:py-28 px-4 sm:px-6 bg-[#FAF7F4] border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 mb-3">
              Proven Student Success
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-navy tracking-tight mb-4">
              Real Testimonials from Admitted Scholars
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Read how practicing with Roman Series helped Nigerian students overcome high cutoffs to gain admission into UI Medicine, Law, Pharmacy, and Engineering.
            </p>
          </div>

          {/* Featured Testimonial Highlight Card */}
          <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-gray-200 mb-12 relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center font-black text-lg">
                  {TESTIMONIALS[currentTestimonialIdx].initial}
                </div>
                <div>
                  <h4 className="font-extrabold text-navy text-base sm:text-lg">
                    {TESTIMONIALS[currentTestimonialIdx].author}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {TESTIMONIALS[currentTestimonialIdx].role}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>{TESTIMONIALS[currentTestimonialIdx].score}</span>
              </span>
            </div>

            <p className="text-base sm:text-xl text-gray-700 font-medium leading-relaxed italic mb-6">
              &ldquo;{TESTIMONIALS[currentTestimonialIdx].text}&rdquo;
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTestimonialIdx((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                  className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
                  aria-label="Previous Testimonial"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <span className="text-xs font-bold text-gray-500">
                  {currentTestimonialIdx + 1} of {TESTIMONIALS.length}
                </span>
                <button
                  onClick={() => setCurrentTestimonialIdx((prev) => (prev + 1) % TESTIMONIALS.length)}
                  className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
                  aria-label="Next Testimonial"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── PRICING SECTION ──── */}
      <section id="pricing" className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-forest/10 text-forest mb-3">
              Simple, Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-navy tracking-tight mb-4">
              Invest in Your Dream Admission
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Full 6-month access covering the complete 2026/2027 UTME registration and Post-UTME screening cycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {PLANS.map((plan, idx) => (
              <div
                key={idx}
                className={`rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all ${
                  plan.highlighted
                    ? "bg-white border-2 border-forest ring-4 ring-forest/10 shadow-2xl relative md:-mt-4"
                    : "bg-[#F8FAFC] border border-gray-200 shadow-md hover:shadow-xl"
                }`}
              >
                <div>
                  {plan.badge && (
                    <div className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-forest text-white mb-4">
                      {plan.badge}
                    </div>
                  )}

                  <h3 className="text-2xl font-black text-navy mb-1">{plan.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mb-6">{plan.description}</p>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-4xl sm:text-5xl font-black text-navy">{plan.price}</span>
                      {plan.originalPrice && (
                        <span className="text-lg text-gray-400 line-through">
                          {plan.originalPrice}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 font-semibold">/ {plan.duration}</span>
                  </div>

                  <Link
                    href={plan.name === "Explorer" ? (user ? "/dashboard" : "/register") : "/pricing"}
                    className={`block w-full py-3.5 rounded-xl font-black text-center text-sm transition-all mb-8 ${
                      plan.highlighted
                        ? "bg-forest text-white hover:bg-forest/90 shadow-lg shadow-forest/20"
                        : "border-2 border-gray-300 text-navy hover:border-forest hover:text-forest"
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  <div className="space-y-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Included Features:
                    </span>
                    {plan.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700">
                        <Check className="w-4 h-4 text-forest flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── FAQ SECTION ──── */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 bg-[#FAF7F4] border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-navy mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600">
              Clear answers to help you start your preparation with confidence.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden transition"
                >
                  <button
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left text-base font-bold text-navy hover:text-forest transition"
                  >
                    <span>{faq.q}</span>
                    <span className={`transform transition-transform text-forest ${isOpen ? "rotate-180" : ""}`}>
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──── FINAL HIGH-IMPACT CTA ──── */}
      <section className="bg-[#0A1628] py-20 sm:py-28 px-4 sm:px-6 relative overflow-hidden text-center text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-forest/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-ember/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight leading-tight">
            Your Dream Admission <br />
            <span className="text-green-400">Starts Today.</span>
          </h2>
          <p className="text-white/60 text-base sm:text-lg mb-10 font-medium">
            Join 5,000+ candidates drilling authentic questions and tracking their cutoffs. Start practicing free right now.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={user ? "/dashboard" : "/register"}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-forest text-white font-black text-lg rounded-2xl hover:bg-forest/90 transition shadow-xl hover:-translate-y-1"
            >
              <span>{user ? "Go to Dashboard" : "Start Practicing Free"}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white font-bold text-lg rounded-2xl hover:bg-white/10 transition"
            >
              View Full Season Plans
            </Link>
          </div>
        </div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer className="bg-[#060D17] text-white py-14 px-4 sm:px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-forest text-white flex items-center justify-center font-black text-xs">
                  RS
                </div>
                <span className="font-black text-lg">Roman Series™</span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed mb-4">
                Nigeria&apos;s most comprehensive UTME &amp; Post-UTME preparation platform. Authentic past questions, CBT simulation, and AI predictive scoring.
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-white/40">
                <a href="tel:09061770885" className="hover:text-white transition">0906 177 0885</a>
                <span>•</span>
                <a href="mailto:roman.series.edu@gmail.com" className="hover:text-white transition">Email Support</a>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Platform</h5>
              <ul className="space-y-2 text-xs text-white/60">
                <li><Link href="#cbt-demo" className="hover:text-white transition">CBT Simulator Demo</Link></li>
                <li><Link href="#subjects" className="hover:text-white transition">Subject Matrix</Link></li>
                <li><Link href="#admission-predictor" className="hover:text-white transition">Admission Predictor</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition">Pricing Plans</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Exams Covered</h5>
              <ul className="space-y-2 text-xs text-white/60">
                <li><span className="text-white/80">JAMB UTME CBT</span></li>
                <li><span className="text-white/80">University of Ibadan (UI)</span></li>
                <li><span className="text-white/80">OAU, UNILAG, UNN, ABU</span></li>
                <li><span className="text-white/80">Cutoff Marks Directory</span></li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Account</h5>
              <ul className="space-y-2 text-xs text-white/60">
                <li><Link href="/login" className="hover:text-white transition">Student Sign In</Link></li>
                <li><Link href="/register" className="hover:text-white transition">Create Free Account</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition">Upgrade to Elite</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-white/40 gap-4">
            <p>© {new Date().getFullYear()} Roman Series. All rights reserved.</p>
            <p className="inline-flex items-center gap-1.5">
              Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for Nigerian university aspirants.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
