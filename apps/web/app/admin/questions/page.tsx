"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Subject, University } from "types";
import toast from "react-hot-toast";
import { TableRowSkeleton } from "@/components/skeletons";

interface Question {
  id: string;
  body: string;
  subject_id: string;
  university_id: string;
  year: number;
  explanation: string | null;
  subjects: { name: string };
  universities: { name: string };
}


interface PaginationData {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

type UploadStep = "configure" | "preview" | "success";

export default function AdminQuestionsPage() {
  const [activeTab, setActiveTab] = useState<"bank" | "upload">("bank");

  // Tab 1: Question Bank
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [loading, setLoading] = useState(true);

  // Tab 2: Upload
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadUniversity, setUploadUniversity] = useState("");
  const [uploadYear, setUploadYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<UploadStep>("configure");
  const [parseResult, setParseResult] = useState<{
    subject: string;
    university: string;
    total_topics: number;
    total_questions: number;
    total_skipped: number;
    data: Record<string, unknown>;
  } | null>(null);
  const [successResult, setSuccessResult] = useState<{
    total_questions: number;
    total_topics: number;
    total_skipped: number;
  } | null>(null);
  const [manualQuestionOpen, setManualQuestionOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    body: "",
    explanation: "",
    options: [
      { label: "A", body: "", is_correct: false },
      { label: "B", body: "", is_correct: false },
      { label: "C", body: "", is_correct: false },
      { label: "D", body: "", is_correct: false },
    ],
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subjectsRes, unisRes] = await Promise.all([
          api.get("/api/subjects"),
          api.get("/api/universities"),
        ]);
        setSubjects(subjectsRes.data.data || []);
        setUniversities(unisRes.data.data || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, []);

  // Fetch questions when filters change or tab changes
  useEffect(() => {
    if (activeTab !== "bank") return;

    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
          ...(selectedSubject && { subjectId: selectedSubject }),
          ...(selectedUniversity && { universityId: selectedUniversity }),
          ...(selectedYear && { year: selectedYear }),
        });

        const res = await api.get(`/api/admin/questions?${params.toString()}`);
        setQuestions(res.data.data || []);
        setPagination(res.data.pagination || pagination);
      } catch (error) {
        console.error("Failed to fetch questions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [
    activeTab,
    pagination.page,
    selectedSubject,
    selectedUniversity,
    selectedYear,
  ]);

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;

    try {
      await api.delete(`/api/admin/questions/${id}`);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("Question deleted");
    } catch (error) {
      console.error("Failed to delete question:", error);
      toast.error("Failed to delete question");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".json")) {
      setSelectedFile(file);
    } else {
      toast.error("Please select a .json file");
    }
  };

  const handleParseDocument = async () => {
    if (!selectedFile) {
      toast.error("Please select a JSON file");
      return;
    }

    setUploadLoading(true);
    setUploadProgress(0);
    try {
      setUploadProgress(25);
      const text = await selectedFile.text();
      setUploadProgress(50);
      const jsonData = JSON.parse(text);

      // Validate structure
      if (!jsonData.subject || !jsonData.university || !jsonData.topics) {
        toast.error("Invalid JSON structure. Required fields: subject, university, topics");
        setUploadLoading(false);
        return;
      }

      setUploadProgress(75);
      // Count stats
      let totalQuestions = 0;
      let totalSkipped = 0;

      jsonData.topics.forEach((topic: any) => {
        topic.questions.forEach((q: any) => {
          if (q.answer === null) {
            totalSkipped++;
          } else {
            totalQuestions++;
          }
        });
      });

      setParseResult({
        subject: jsonData.subject,
        university: jsonData.university,
        total_topics: jsonData.topics.length,
        total_questions: totalQuestions,
        total_skipped: totalSkipped,
        data: jsonData,
      });
      setUploadProgress(100);
      setUploadStep("preview");
    } catch (error) {
      console.error("Failed to parse JSON:", error);
      toast.error("Invalid JSON file");
    } finally {
      setUploadLoading(false);
      setUploadProgress(0);
    }
  };

  const handleConfirmUpload = async () => {
    if (!parseResult?.data) return;

    setUploadLoading(true);
    setUploadProgress(0);
    try {
      const res = await api.post("/api/admin/upload-json", parseResult.data, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setUploadProgress(percentCompleted);
        },
      });

      setSuccessResult({
        total_questions: res.data.data.total_questions,
        total_topics: res.data.data.total_topics,
        total_skipped: res.data.data.total_skipped,
      });
      setUploadProgress(100);
      setUploadStep("success");
    } catch (error: any) {
      console.error("Failed to upload:", error);
      toast.error(error.response?.data?.message || "Failed to upload questions");
    } finally {
      setUploadLoading(false);
      setUploadProgress(0);
    }
  };

  const handleResetUpload = () => {
    setUploadStep("configure");
    setParseResult(null);
    setSelectedFile(null);
    setUploadSubject("");
    setUploadUniversity("");
    setUploadYear(new Date().getFullYear().toString());
    setSuccessResult(null);
  };

  const handleAddManualQuestion = async () => {
    if (
      !uploadSubject ||
      !uploadUniversity ||
      !uploadYear ||
      !manualForm.body
    ) {
      toast.error("Please fill in required fields");
      return;
    }

    const correctCount = manualForm.options.filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      toast.error("Exactly one option must be marked as correct");
      return;
    }

    try {
      await api.post("/api/admin/upload/manual", {
        subject_id: uploadSubject,
        university_id: uploadUniversity,
        body: manualForm.body,
        explanation: manualForm.explanation || null,
        options: manualForm.options,
      });

      toast.success("Question added successfully");
      setManualForm({
        body: "",
        explanation: "",
        options: [
          { label: "A", body: "", is_correct: false },
          { label: "B", body: "", is_correct: false },
          { label: "C", body: "", is_correct: false },
          { label: "D", body: "", is_correct: false },
        ],
      });
    } catch (error) {
      console.error("Failed to add question:", error);
      toast.error("Failed to add question");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-navy text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Questions Management</h1>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex gap-8">
            <button
              onClick={() => {
                setActiveTab("bank");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`pb-4 font-medium transition-colors ${
                activeTab === "bank"
                  ? "border-b-2 border-forest text-forest"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Question Bank
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`pb-4 font-medium transition-colors ${
                activeTab === "upload"
                  ? "border-b-2 border-forest text-forest"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Upload Document
            </button>
          </div>
        </div>

        {/* TAB 1: Question Bank */}
        {activeTab === "bank" && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="">All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedUniversity}
                  onChange={(e) => {
                    setSelectedUniversity(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="">All Universities</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Year"
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                />

                <div className="text-sm text-gray-600 flex items-center">
                  {pagination.total} questions in database
                </div>
              </div>
            </div>

            {/* Questions Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-16">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy flex-1">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-32">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-32">
                      University
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-20">
                      Year
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-20">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <>
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                    </>
                  ) : questions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-gray-600"
                      >
                        No questions found
                      </td>
                    </tr>
                  ) : (
                    questions.map((question, idx) => (
                      <tr
                        key={question.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {(pagination.page - 1) * pagination.limit + idx + 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 truncate">
                          {question.body.substring(0, 80)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {question.subjects?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {question.universities?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {question.year}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {questions.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total}
                </p>
                <div className="space-x-2">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: Math.max(prev.page - 1, 1),
                      }))
                    }
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.total_pages}
                  </span>
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: Math.min(prev.page + 1, prev.total_pages),
                      }))
                    }
                    disabled={pagination.page === pagination.total_pages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Upload Document */}
        {activeTab === "upload" && (
          <div className="space-y-8">
            {/* STEP 1: Configure */}
            {uploadStep === "configure" && (
              <div className="bg-white rounded-lg shadow p-8">
                <h2 className="text-2xl font-bold text-navy mb-2">
                  Upload Questions from JSON
                </h2>
                <p className="text-gray-600 mb-6">
                  Import questions with topics and options from a JSON file
                </p>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                  <p className="text-sm text-blue-900 font-semibold mb-2">
                    JSON format:
                  </p>
                  <p className="text-sm text-blue-900 mb-3">
                    File should contain subject, university code (e.g. &quot;UI&quot;), and topics with questions. Questions without an answer will be skipped.
                  </p>
                </div>

                {/* Form */}
                <div className="space-y-6">
                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-navy mb-3">
                      Select JSON File
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer block"
                      >
                        <div className="text-center">
                          <p className="text-gray-900 font-medium mb-1">
                            {selectedFile
                              ? selectedFile.name
                              : "Drag and drop a file or click to select"}
                          </p>
                          <p className="text-sm text-gray-600">Max 20MB</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleParseDocument}
                    disabled={!selectedFile || uploadLoading}
                    className="w-full px-6 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
                  >
                    {uploadLoading ? `Uploading... ${uploadProgress}%` : "Parse JSON"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Preview */}
            {uploadStep === "preview" && parseResult && (
              <div className="bg-white rounded-lg shadow p-8">
                <h2 className="text-2xl font-bold text-navy mb-8">
                  Preview Upload
                </h2>

                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 mb-1">Subject</p>
                    <p className="text-lg font-bold text-blue-900">
                      {parseResult.subject}
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 mb-1">University</p>
                    <p className="text-lg font-bold text-blue-900">
                      {parseResult.university}
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-900 mb-1">Topics</p>
                    <p className="text-2xl font-bold text-green-900">
                      {parseResult.total_topics}
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-900 mb-1">Questions</p>
                    <p className="text-2xl font-bold text-green-900">
                      ✓ {parseResult.total_questions}
                    </p>
                  </div>
                </div>

                {/* Warning for skipped questions */}
                {parseResult.total_skipped > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
                    <p className="text-sm text-amber-900">
                      ⚠{" "}
                      <strong>
                        {parseResult.total_skipped} questions have no answer
                      </strong>{" "}
                      and will be skipped during upload.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={handleConfirmUpload}
                    disabled={uploadLoading}
                    className="flex-1 px-6 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
                  >
                    {uploadLoading
                      ? `Uploading... ${uploadProgress}%`
                      : `✓ Confirm & Upload ${parseResult.total_questions} Questions`}
                  </button>
                  <button
                    onClick={handleResetUpload}
                    className="flex-1 px-6 py-3 border text-gray-900 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
                  >
                    ✗ Cancel
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Success */}
            {uploadStep === "success" && successResult && (
              <div className="bg-white rounded-lg shadow p-8">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-center">
                  <p className="text-lg font-semibold text-green-900">
                    ✓ {successResult.total_questions} questions uploaded across {successResult.total_topics} topics
                  </p>
                  {successResult.total_skipped > 0 && (
                    <p className="text-sm text-green-800 mt-2">
                      {successResult.total_skipped} questions were skipped (no answer provided)
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setActiveTab("bank");
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="flex-1 px-6 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90"
                  >
                    View in Question Bank
                  </button>
                  <button
                    onClick={handleResetUpload}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Upload Another Document
                  </button>
                </div>
              </div>
            )}

            {/* Manual Add Section */}
            {uploadStep === "configure" && (
              <div className="bg-white rounded-lg shadow p-6">
                <button
                  onClick={() => setManualQuestionOpen(!manualQuestionOpen)}
                  className="text-lg font-bold text-navy flex items-center gap-2"
                >
                  <span className="text-xl">
                    {manualQuestionOpen ? "▼" : "▶"}
                  </span>
                  Add Single Question Manually
                </button>

                {manualQuestionOpen && (
                  <div className="space-y-6 pt-6 border-t mt-6">
                    <div className="grid grid-cols-3 gap-4">
                      <select
                        value={uploadSubject}
                        onChange={(e) => setUploadSubject(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                      >
                        <option value="">Select Subject</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={uploadUniversity}
                        onChange={(e) => setUploadUniversity(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                      >
                        <option value="">Select University</option>
                        {universities.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        value={uploadYear}
                        onChange={(e) => setUploadYear(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                    </div>

                    <textarea
                      placeholder="Question body..."
                      value={manualForm.body}
                      onChange={(e) =>
                        setManualForm((prev) => ({
                          ...prev,
                          body: e.target.value,
                        }))
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />

                    <textarea
                      placeholder="Explanation (optional)"
                      value={manualForm.explanation}
                      onChange={(e) =>
                        setManualForm((prev) => ({
                          ...prev,
                          explanation: e.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />

                    <div className="space-y-3">
                      {manualForm.options.map((opt, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <input
                            type="radio"
                            name="correct"
                            checked={opt.is_correct}
                            onChange={() => {
                              const newOpts = manualForm.options.map(
                                (o, i) => ({
                                  ...o,
                                  is_correct: i === idx,
                                }),
                              );
                              setManualForm((prev) => ({
                                ...prev,
                                options: newOpts,
                              }));
                            }}
                            className="cursor-pointer"
                          />
                          <input
                            type="text"
                            placeholder={`Option ${opt.label}`}
                            value={opt.body}
                            onChange={(e) => {
                              const newOpts = [...manualForm.options];
                              newOpts[idx].body = e.target.value;
                              setManualForm((prev) => ({
                                ...prev,
                                options: newOpts,
                              }));
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleAddManualQuestion}
                      className="w-full px-6 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90"
                    >
                      Add Question
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
