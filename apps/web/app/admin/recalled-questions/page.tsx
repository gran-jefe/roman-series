"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { firebaseAuth } from "@/lib/firebase";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";

interface RecalledQuestion {
  id: string;
  subject: string;
  year: number | null;
  section_label: string | null;
  question_number: number | null;
  body: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  answer: string | null;
  note: string | null;
}

const EMPTY_FORM = {
  subject: "",
  year: new Date().getFullYear(),
  section_label: "",
  question_number: "" as number | "",
  body: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  answer: "",
  note: "",
};

export default function AdminRecalledQuestionsPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [questions, setQuestions] = useState<RecalledQuestion[]>([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk JSON upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  // Word doc -> JSON parse state (step 1 of 2; step 2 reuses the bulk upload above)
  const docxInputRef = useRef<HTMLInputElement>(null);
  const [isParsingDocx, setIsParsingDocx] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<{
    questions: any[];
    total_parsed: number;
    skipped_no_options: number;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    if (!loading) {
      if (profile?.role === "admin") {
        setIsAdmin(true);
        fetchData();
      } else {
        router.push("/dashboard");
      }
      setPageLoading(false);
    }
  }, [profile, loading, router]);

  const fetchData = async () => {
    try {
      const res = await api.get("/api/admin/recalled-questions?limit=100");
      setQuestions(res.data.data.questions || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.subject || !formData.body) {
        toast.error("Subject and question body are required");
        setIsSubmitting(false);
        return;
      }

      const response = await api.post("/api/admin/recalled-questions", {
        subject: formData.subject,
        year: formData.year || null,
        section_label: formData.section_label || null,
        question_number: formData.question_number || null,
        body: formData.body,
        option_a: formData.option_a || null,
        option_b: formData.option_b || null,
        option_c: formData.option_c || null,
        option_d: formData.option_d || null,
        answer: formData.answer || null,
        note: formData.note || null,
      });

      if (response.data.status === "success") {
        toast.success("Recalled question uploaded successfully!");
        setShowForm(false);
        setFormData(EMPTY_FORM);
        fetchData();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to upload question";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        subject: "Biology",
        year: 2024,
        section_label: "BIOLOGY 2024",
        question_number: 1,
        body: "Which of the following is a function of the cell membrane?",
        options: [
          { label: "A", body: "Selective permeability", is_correct: true },
          { label: "B", body: "Protein synthesis", is_correct: false },
          { label: "C", body: "Energy production", is_correct: false },
          { label: "D", body: "DNA replication", is_correct: false },
        ],
      },
    ];

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recalled-questions-template.json";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const submitBulkQuestions = async (questionsPayload: any[]) => {
    setBulkResult(null);
    setIsBulkUploading(true);

    try {
      const response = await api.post("/api/admin/recalled-questions/bulk", {
        questions: questionsPayload,
      });

      const { created, skipped, errors } = response.data.data;
      setBulkResult({ created, skipped, errors });

      if (created > 0) {
        toast.success(`Added ${created} question(s)${skipped ? `, ${skipped} skipped` : ""}`);
        fetchData();
      } else {
        toast.error("No questions were added - see details below");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Bulk upload failed");
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleBulkFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const questionsPayload = Array.isArray(parsed) ? parsed : parsed.questions;

      if (!Array.isArray(questionsPayload) || questionsPayload.length === 0) {
        toast.error("File must contain a JSON array of questions");
        return;
      }

      await submitBulkQuestions(questionsPayload);
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        toast.error("Couldn't parse that file as JSON");
      } else {
        toast.error(error.response?.data?.message || "Bulk upload failed");
      }
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleDocxFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    setParsedPreview(null);
    setBulkResult(null);
    setIsParsingDocx(true);

    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const form = new FormData();
      form.append("file", file);

      const response = await fetch(`${apiUrl}/api/admin/recalled-questions/parse-docx`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message || "Failed to parse document");
      }

      setParsedPreview(json.data);
      if (json.data.total_parsed === 0) {
        toast.error("No questions could be parsed from that document");
      } else {
        toast.success(`Parsed ${json.data.total_parsed} question(s) - review below before adding`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to parse document");
    } finally {
      setIsParsingDocx(false);
    }
  };

  const handleConfirmParsedQuestions = async () => {
    if (!parsedPreview || parsedPreview.questions.length === 0) return;
    await submitBulkQuestions(parsedPreview.questions);
    setParsedPreview(null);
  };

  if (pageLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-navy">
              Manage Authentic and Update UI-POSTUTME Questions
              (2019-2026)
            </h1>
            <p className="text-gray-600 mt-2">
              Upload and manage questions confirmed to have appeared in past
              Post-UTME exams
            </p>
          </div>
          <Link
            href="/admin"
            className="text-forest font-semibold hover:underline transition-colors"
          >
            ← Back to Admin
          </Link>
        </div>

        {/* Upload Form Toggle + Bulk Upload */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-forest text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-opacity"
            >
              + Upload New Question
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleBulkFileSelected}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isBulkUploading}
            className="bg-navy text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-opacity disabled:opacity-50"
          >
            {isBulkUploading ? "Uploading..." : "📤 Bulk Upload (JSON)"}
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="text-forest font-semibold hover:underline transition-colors"
          >
            Download template
          </button>
        </div>

        {/* Word Doc -> JSON Upload */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-navy mb-1">Upload from Word Document</h2>
          <p className="text-sm text-gray-600 mb-4">
            Parses a .docx of recalled questions into JSON for review, then adds everything you
            confirm - subject and year are read from each section&apos;s heading (e.g.
            &quot;ENGLISH LANGUAGE 2025&quot;).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={docxInputRef}
              type="file"
              accept=".docx"
              onChange={handleDocxFileSelected}
              className="hidden"
            />
            <button
              onClick={() => docxInputRef.current?.click()}
              disabled={isParsingDocx}
              className="bg-navy text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-opacity disabled:opacity-50"
            >
              {isParsingDocx ? "Parsing..." : "📄 Upload Word Doc (.docx)"}
            </button>
          </div>
        </div>

        {parsedPreview && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="font-semibold text-navy">
                Parsed {parsedPreview.total_parsed} question(s)
                {parsedPreview.skipped_no_options > 0
                  ? `, ${parsedPreview.skipped_no_options} skipped (no options found)`
                  : ""}
                . None have a correct answer marked yet - review and mark answers after adding.
              </p>
              <div className="flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setParsedPreview(null)}
                  disabled={isBulkUploading}
                  className="px-4 py-2 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Discard
                </button>
                <button
                  onClick={handleConfirmParsedQuestions}
                  disabled={isBulkUploading || parsedPreview.total_parsed === 0}
                  className="px-4 py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
                >
                  {isBulkUploading ? "Adding..." : `Confirm & Add All ${parsedPreview.total_parsed}`}
                </button>
              </div>
            </div>
            {parsedPreview.errors.length > 0 && (
              <ul className="text-sm text-ember space-y-1 max-h-48 overflow-y-auto list-disc pl-5 mb-3">
                {parsedPreview.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
            {parsedPreview.questions.length > 0 && (
              <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-lg divide-y">
                {parsedPreview.questions.slice(0, 50).map((q, i) => (
                  <div key={i} className="p-3 text-sm">
                    <p className="font-medium text-navy">
                      {q.subject} {q.year} - {q.body}
                    </p>
                    <ul className="text-gray-600 pl-4 list-disc">
                      {q.options.map((o: { label: string; body: string }) => (
                        <li key={o.label}>
                          {o.label}. {o.body}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {parsedPreview.questions.length > 50 && (
                  <p className="p-3 text-xs text-gray-500">
                    ...and {parsedPreview.questions.length - 50} more
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {bulkResult && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-navy">
                Bulk upload: {bulkResult.created} added
                {bulkResult.skipped > 0 ? `, ${bulkResult.skipped} skipped` : ""}
              </p>
              <button
                onClick={() => setBulkResult(null)}
                className="text-sm text-gray-500 hover:underline"
              >
                Dismiss
              </button>
            </div>
            {bulkResult.errors.length > 0 && (
              <ul className="text-sm text-ember space-y-1 max-h-48 overflow-y-auto list-disc pl-5">
                {bulkResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Upload Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-navy mb-6">
              Upload Recalled Question
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Subject and Year Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    placeholder="e.g. Biology, Use of English"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question # (in this batch)
                  </label>
                  <input
                    type="number"
                    value={formData.question_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        question_number: e.target.value ? parseInt(e.target.value) : "",
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                  />
                </div>
              </div>

              {/* Section label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch / Section Label (optional)
                </label>
                <input
                  type="text"
                  value={formData.section_label}
                  onChange={(e) => setFormData({ ...formData, section_label: e.target.value })}
                  placeholder="e.g. BIOLOGY 2024 BATCH A"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                />
              </div>

              {/* Question Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question *
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) =>
                    setFormData({ ...formData, body: e.target.value })
                  }
                  required
                  rows={4}
                  placeholder="Enter the question text..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                />
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Answer Options (leave blank if unknown)
                </label>
                <div className="space-y-3">
                  {(["A", "B", "C", "D"] as const).map((letter) => {
                    const key = `option_${letter.toLowerCase()}` as
                      | "option_a"
                      | "option_b"
                      | "option_c"
                      | "option_d";
                    return (
                      <div key={letter} className="flex gap-3 items-center">
                        <span className="font-bold text-navy w-6">{letter}.</span>
                        <input
                          type="text"
                          value={formData[key]}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          placeholder={`Option ${letter}`}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Correct answer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correct Answer (if known)
                </label>
                <select
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                >
                  <option value="">Not yet known</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (Optional)
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                  placeholder="Any extra context for this question..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-forest text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? "Uploading..." : "Upload Question"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border-2 border-forest text-forest py-3 rounded-lg font-semibold hover:bg-forest hover:text-white transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Questions List */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-navy mb-6">
            Uploaded Questions ({questions.length})
          </h2>

          {questions.length === 0 ? (
            <p className="text-gray-600 text-center py-12">
              No recalled questions uploaded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-bold text-navy">
                      Question
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-navy">
                      Subject
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-navy">
                      Batch
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-navy">
                      Year
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-navy">
                      Answer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((question) => (
                    <tr
                      key={question.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {question.body.substring(0, 50)}...
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {question.subject}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {question.section_label || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {question.year ?? "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            question.answer
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {question.answer || "Unmarked"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
