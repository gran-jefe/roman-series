"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";

interface QBankQuestion {
  id: string;
  section_name: string;
  question_number: number;
  body: string;
  answer: string;
}

export default function AdminBiologyFocusPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Area of Concentration markdown
  const [markdown, setMarkdown] = useState("");
  const [isSavingContent, setIsSavingContent] = useState(false);

  // Question bank bulk upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [questions, setQuestions] = useState<QBankQuestion[]>([]);

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
      const [contentRes, questionsRes] = await Promise.all([
        api.get("/api/admin/biology-focus/content"),
        api.get("/api/admin/biology-focus/questions"),
      ]);
      setMarkdown(contentRes.data.data.content || "");
      setQuestions(questionsRes.data.data.questions || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  const handleSaveContent = async () => {
    if (!markdown.trim()) {
      toast.error("Markdown content cannot be empty");
      return;
    }

    setIsSavingContent(true);
    try {
      await api.post("/api/admin/biology-focus/content", {
        content_markdown: markdown,
      });
      toast.success("Area of Concentration content saved!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save content");
    } finally {
      setIsSavingContent(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = {
      subject: "Biology",
      topic: "Plant Morphology",
      sections: [
        {
          name: "SECTION A - LEAF SHAPES",
          questions: [
            {
              body: "Which of the following leaf shapes is described as 'lanceolate'?",
              options: [
                { body: "Lance-shaped, much longer than wide", is_correct: true },
                { body: "Heart-shaped", is_correct: false },
                { body: "Circular", is_correct: false },
                { body: "Kidney-shaped", is_correct: false },
              ],
              explanation: "Lanceolate leaves are narrow and pointed at both ends, like a lance.",
            },
          ],
        },
      ],
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "biology-qbank-template.json";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBulkResult(null);
    setIsBulkUploading(true);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
        toast.error("File must contain a 'sections' array");
        return;
      }

      const response = await api.post("/api/admin/biology-focus/questions/bulk", {
        sections: parsed.sections,
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
      if (error instanceof SyntaxError) {
        toast.error("Couldn't parse that file as JSON");
      } else {
        toast.error(error.response?.data?.message || "Bulk upload failed");
      }
    } finally {
      setIsBulkUploading(false);
    }
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
              Manage Biology: Plant Morphology Focus
            </h1>
            <p className="text-gray-600 mt-2">
              Upload the study guide and question bank for this Elite-only feature
            </p>
          </div>
          <Link
            href="/admin"
            className="text-forest font-semibold hover:underline transition-colors"
          >
            ← Back to Admin
          </Link>
        </div>

        {/* Area of Concentration */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-navy mb-1">Area of Concentration</h2>
          <p className="text-sm text-gray-600 mb-4">
            Paste the markdown study guide below. This replaces the currently published
            version when saved.
          </p>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={16}
            placeholder="# Plant Morphology&#10;&#10;## Leaf Shapes&#10;..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
          />
          <button
            onClick={handleSaveContent}
            disabled={isSavingContent}
            className="mt-4 bg-forest text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSavingContent ? "Saving..." : "Save Content"}
          </button>
        </div>

        {/* Question Bank Bulk Upload */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-navy mb-1">Question Bank</h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload a JSON file shaped as{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
              {"{subject, topic, sections: [{name, questions: [...]}]}"}
            </code>
            . Each question needs 2-5 options with exactly one marked
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs ml-1">is_correct</code>.
          </p>
          <div className="flex flex-wrap items-center gap-3">
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
        </div>

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

        {/* Questions List */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-navy mb-6">
            Uploaded Questions ({questions.length})
          </h2>

          {questions.length === 0 ? (
            <p className="text-gray-600 text-center py-12">
              No question bank entries uploaded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-bold text-navy">Question</th>
                    <th className="text-left py-3 px-4 font-bold text-navy">Section</th>
                    <th className="text-left py-3 px-4 font-bold text-navy">#</th>
                    <th className="text-left py-3 px-4 font-bold text-navy">Answer</th>
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
                        {question.section_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {question.question_number}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-800">
                          {question.answer}
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
