"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Sparkles, ArrowRight, RotateCcw, Brain, Clock, HelpCircle } from "lucide-react";

interface DemoQuestion {
  id: number;
  subject: string;
  topic: string;
  source: string;
  question: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  keyTakeaway: string;
}

const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    id: 1,
    subject: "Biology",
    topic: "Plant Reproduction & Physiology",
    source: "Authentic UTME & Post-UTME Past Question",
    question:
      "In flowering plants (angiosperms), double fertilization occurs when two male gametes participate. What is the specific product formed from the fusion of the second sperm nucleus with the polar nuclei?",
    options: [
      { label: "A", text: "Diploid zygote (2n)" },
      { label: "B", text: "Triploid endosperm nucleus (3n)" },
      { label: "C", text: "Diploid seed coat (testa)" },
      { label: "D", text: "Haploid antipodal cell (n)" },
    ],
    correctAnswer: "B",
    explanation:
      "Double fertilization is unique to angiosperms. One sperm nucleus (n) fuses with the egg cell (n) to form the diploid zygote (2n), while the second sperm nucleus (n) fuses with the two polar nuclei (n + n) in the central cell to produce the triploid endosperm (3n), which serves as nutritive tissue for the developing embryo.",
    keyTakeaway: "Angiosperm fertilization formula: (n + n) zygote + (n + 2n) triploid endosperm tissue.",
  },
  {
    id: 2,
    subject: "Use of English",
    topic: "Lexis & Concord",
    source: "High-Frequency Exam Standard",
    question:
      "Neither the principal nor the teachers _______ informed about the change in the national examination schedule.",
    options: [
      { label: "A", text: "was" },
      { label: "B", text: "were" },
      { label: "C", text: "is" },
      { label: "D", text: "has been" },
    ],
    correctAnswer: "B",
    explanation:
      "According to the Rule of Proximity in English grammatical concord, when two subjects are connected by 'neither... nor' or 'either... or', the verb must agree with the subject closest to it. Here, 'teachers' is plural and adjacent to the verb position, requiring the plural past verb 'were'.",
    keyTakeaway: "Proximity Concord: The subject closest to the verb determines whether it is singular or plural.",
  },
  {
    id: 3,
    subject: "Chemistry",
    topic: "Chemical Bonding & Shapes",
    source: "Post-UTME High-Yield Challenge",
    question:
      "What is the shape and bond angle of a water molecule (H₂O) according to the Valence Shell Electron Pair Repulsion (VSEPR) theory?",
    options: [
      { label: "A", text: "Linear, 180°" },
      { label: "B", text: "Trigonal planar, 120°" },
      { label: "C", text: "Bent (V-shaped), approximately 104.5°" },
      { label: "D", text: "Tetrahedral, 109.5°" },
    ],
    correctAnswer: "C",
    explanation:
      "The central oxygen atom in H₂O has 4 electron pairs: 2 bonding pairs with hydrogen and 2 lone pairs. While the electron-pair geometry is tetrahedral, the strong repulsion between the two lone pairs compresses the H-O-H bond angle from 109.5° down to 104.5°, giving water its bent (non-linear) molecular geometry.",
    keyTakeaway: "Lone pair - lone pair repulsion is stronger than bond pair - bond pair repulsion, compressing the bond angle.",
  },
];

export function InteractiveQuestionDemo() {
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const currentQ = DEMO_QUESTIONS[activeQuestionIdx];

  const handleSelectOption = (label: string) => {
    if (submitted) return;
    setSelectedOption(label);
    setSubmitted(true);
  };

  const handleNext = () => {
    setSelectedOption(null);
    setSubmitted(false);
    setActiveQuestionIdx((prev) => (prev + 1) % DEMO_QUESTIONS.length);
  };

  const handleReset = () => {
    setSelectedOption(null);
    setSubmitted(false);
  };

  const isCorrect = selectedOption === currentQ.correctAnswer;

  return (
    <div className="w-full max-w-xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 p-5 sm:p-7 text-left text-navy relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-forest/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3.5 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-forest/10 text-forest">
            <Brain className="w-3.5 h-3.5" />
            {currentQ.subject}
          </span>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            • {currentQ.topic}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3 text-forest" />
            <span>00:45</span>
          </div>
          <button
            onClick={handleReset}
            title="Reset question"
            className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subject Selector Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
        {DEMO_QUESTIONS.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => {
              setActiveQuestionIdx(idx);
              setSelectedOption(null);
              setSubmitted(false);
            }}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
              activeQuestionIdx === idx
                ? "bg-navy text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {q.subject}
          </button>
        ))}
      </div>

      {/* Question Prompt */}
      <div className="mb-5">
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-forest" />
          Sample CBT Drill #{currentQ.id}
        </div>
        <p className="text-sm sm:text-base font-bold text-navy leading-relaxed">
          {currentQ.question}
        </p>
      </div>

      {/* Options List */}
      <div className="space-y-2.5 mb-5">
        {currentQ.options.map((opt) => {
          const isSelected = selectedOption === opt.label;
          const isAnswer = opt.label === currentQ.correctAnswer;

          let optionStyle = "border-gray-200 hover:border-forest/50 hover:bg-gray-50/80";
          let badgeStyle = "bg-gray-100 text-gray-700";

          if (submitted) {
            if (isAnswer) {
              optionStyle = "border-green-500 bg-green-50/80 text-green-900";
              badgeStyle = "bg-green-600 text-white font-bold";
            } else if (isSelected && !isAnswer) {
              optionStyle = "border-red-400 bg-red-50/80 text-red-900";
              badgeStyle = "bg-red-500 text-white font-bold";
            } else {
              optionStyle = "border-gray-100 opacity-60";
            }
          } else if (isSelected) {
            optionStyle = "border-forest bg-forest/5 text-forest";
            badgeStyle = "bg-forest text-white";
          }

          return (
            <button
              key={opt.label}
              onClick={() => handleSelectOption(opt.label)}
              disabled={submitted}
              className={`w-full flex items-center justify-between p-3 sm:p-3.5 rounded-xl border text-left text-sm transition-all ${optionStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${badgeStyle}`}>
                  {opt.label}
                </span>
                <span className="font-medium text-xs sm:text-sm leading-snug">
                  {opt.text}
                </span>
              </div>

              {submitted && isAnswer && (
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              )}
              {submitted && isSelected && !isAnswer && (
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Answer & Explanation Box */}
      {submitted && (
        <div className={`p-4 rounded-xl mb-4 border transition-all ${isCorrect ? "bg-green-50/90 border-green-200" : "bg-amber-50/90 border-amber-200"}`}>
          <div className="flex items-center gap-2 mb-1.5">
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-xs font-bold text-green-800 uppercase tracking-wide">
                  Correct Answer: {currentQ.correctAnswer}
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Explanation · Correct Answer is {currentQ.correctAnswer}
                </span>
              </>
            )}
          </div>

          <p className="text-xs text-gray-700 leading-relaxed mb-2.5">
            {currentQ.explanation}
          </p>

          <div className="pt-2 border-t border-gray-200/60 flex items-start gap-1.5 text-[11px] text-gray-600 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-forest flex-shrink-0 mt-0.5" />
            <span><strong>Key Takeaway:</strong> {currentQ.keyTakeaway}</span>
          </div>
        </div>
      )}

      {/* Bottom CTA / Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <span className="text-xs text-gray-500 font-medium text-center sm:text-left">
          {submitted ? "Liked this explanation?" : "Click any option to test instant CBT scoring"}
        </span>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {submitted ? (
            <button
              onClick={handleNext}
              className="flex-1 sm:flex-none text-xs font-bold px-3.5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-navy transition"
            >
              Next Question →
            </button>
          ) : null}

          <Link
            href="/register"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-lg bg-forest text-white hover:bg-forest/90 transition shadow-sm"
          >
            <span>Practice 15,000+ Free</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
