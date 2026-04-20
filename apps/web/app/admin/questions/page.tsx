"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Subject, University } from "types";
import toast from "react-hot-toast";

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

interface Option {
  id: string;
  label: string;
  body: string;
  is_correct: boolean;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Tab 2: Upload
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadUniversity, setUploadUniversity] = useState("");
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear().toString());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [parsePreview, setParsePreview] = useState<any>(null);
  const [uploadToken, setUploadToken] = useState("");
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

  // Fetch questions when filters change
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
  }, [activeTab, pagination.page, selectedSubject, selectedUniversity, selectedYear]);

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;

    try {
      await api.delete(`/api/admin/questions/${id}`);
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (error) {
      console.error("Failed to delete question:", error);
      toast.error("Failed to delete question");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".docx")) {
      setSelectedFile(file);
    } else {
      toast.error("Please select a .docx file");
    }
  };

  const handleParseDocument = async () => {
    if (!selectedFile || !uploadSubject || !uploadUniversity || !uploadYear) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("subject_id", uploadSubject);
      formData.append("university_id", uploadUniversity);
      formData.append("year", uploadYear);

      const res = await api.post("/api/admin/upload/docx", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setParsePreview(res.data.data);
      setUploadToken(res.data.data.upload_token);
    } catch (error) {
      console.error("Failed to parse document:", error);
      toast.error("Failed to parse document");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!uploadToken) return;

    setUploadLoading(true);
    try {
      const res = await api.post("/api/admin/upload/confirm", {
        upload_token: uploadToken,
        subject_id: uploadSubject,
        university_id: uploadUniversity,
        year: uploadYear,
      });

      toast.success(`${res.data.data.created} questions uploaded successfully`);

      // Reset form
      setParsePreview(null);
      setUploadToken("");
      setSelectedFile(null);
    } catch (error) {
      console.error("Failed to confirm upload:", error);
      toast.error("Failed to upload questions");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAddManualQuestion = async () => {
    if (!uploadSubject || !uploadUniversity || !uploadYear || !manualForm.body) {
      toast.error("Please fill in required fields");
      return;
    }

    const correctCount = manualForm.options.filter(o => o.is_correct).length;
    if (correctCount !== 1) {
      toast.error("Exactly one option must be marked as correct");
      return;
    }

    try {
      await api.post("/api/admin/upload/manual", {
        subject_id: uploadSubject,
        university_id: uploadUniversity,
        year: uploadYear,
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
              onClick={() => setActiveTab("bank")}
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
              Upload Questions
            </button>
          </div>
        </div>

        {/* TAB 1: Question Bank */}
        {activeTab === "bank" && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <select
                  value={selectedUniversity}
                  onChange={(e) => {
                    setSelectedUniversity(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="">All Universities</option>
                  {universities.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Year"
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                />

                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
            </div>

            {/* Questions Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-20">#</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Question</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-32">Subject</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-32">University</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-20">Year</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-600">
                        Loading...
                      </td>
                    </tr>
                  ) : questions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-600">
                        No questions found
                      </td>
                    </tr>
                  ) : (
                    questions.map((question, idx) => (
                      <tr key={question.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {(pagination.page - 1) * pagination.limit + idx + 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {question.body}
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
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-600">
                Showing {questions.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} questions
              </p>
              <div className="space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.page + 1, prev.total_pages) }))}
                  disabled={pagination.page === pagination.total_pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Upload Questions */}
        {activeTab === "upload" && (
          <div className="space-y-8">
            {/* Upload Word Document */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-navy mb-6">Upload Word Document</h2>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900 font-semibold mb-2">Format your Word document like this:</p>
                <pre className="text-xs text-blue-900 overflow-x-auto bg-white p-3 rounded border border-blue-200">
{`1. Which of the following is required by leguminous plants?
I. Carbon cycle II. Nitrogen cycle III. Water cycle
A. Option A text B. Option B text
C. Option C text D. Option D text
Answer: B
Explanation: Leguminous plants require...

2. Next question...`}
                </pre>
              </div>

              {/* Select dropdowns */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Subject *</label>
                  <select
                    value={uploadSubject}
                    onChange={(e) => setUploadSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">University *</label>
                  <select
                    value={uploadUniversity}
                    onChange={(e) => setUploadUniversity(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="">Select University</option>
                    {universities.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Year *</label>
                  <input
                    type="number"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
              </div>

              {/* File upload */}
              {!parsePreview ? (
                <>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6">
                    <input
                      type="file"
                      accept=".docx"
                      onChange={handleFileSelect}
                      disabled={!uploadSubject || !uploadUniversity || !uploadYear}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="text-center">
                        <p className="text-gray-900 font-medium mb-2">
                          {selectedFile ? selectedFile.name : "Select or drag and drop a .docx file"}
                        </p>
                        <p className="text-sm text-gray-600">Max 10MB</p>
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={handleParseDocument}
                    disabled={!selectedFile || uploadLoading || !uploadSubject || !uploadUniversity || !uploadYear}
                    className="w-full px-6 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {uploadLoading ? "Parsing..." : "Parse Document"}
                  </button>
                </>
              ) : (
                <>
                  {/* Preview */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-amber-900">
                      ✓ {parsePreview.total_parsed} questions parsed{" "}
                      {parsePreview.skipped > 0 && `, ${parsePreview.skipped} skipped`}
                    </p>
                    {parsePreview.errors.length > 0 && (
                      <div className="mt-2 text-xs text-amber-800">
                        {parsePreview.errors.slice(0, 3).map((e, i) => (
                          <p key={i}>• {e}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Preview questions */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-96 overflow-y-auto">
                    {parsePreview.preview.map((q: any, idx: number) => (
                      <div key={idx} className="bg-white rounded p-4 mb-4">
                        <p className="font-semibold text-sm text-navy mb-2">{idx + 1}. {q.body.substring(0, 100)}...</p>
                        <div className="text-xs space-y-1">
                          {q.options.map((opt: any) => (
                            <p key={opt.label} className={opt.is_correct ? "text-green-600" : ""}>
                              {opt.label}. {opt.body}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleConfirmUpload}
                      disabled={uploadLoading}
                      className="flex-1 px-6 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50"
                    >
                      {uploadLoading ? "Uploading..." : `Confirm & Upload ${parsePreview.total_parsed} Questions`}
                    </button>
                    <button
                      onClick={() => {
                        setParsePreview(null);
                        setSelectedFile(null);
                      }}
                      className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Manual Question */}
            <div className="bg-white rounded-lg shadow p-6">
              <button
                onClick={() => setManualQuestionOpen(!manualQuestionOpen)}
                className="text-lg font-bold text-navy mb-6 flex items-center gap-2"
              >
                {manualQuestionOpen ? "▼" : "▶"} Add Single Question Manually
              </button>

              {manualQuestionOpen && (
                <div className="space-y-6 pt-4 border-t">
                  <div className="grid grid-cols-3 gap-4">
                    <select
                      value={uploadSubject}
                      onChange={(e) => setUploadSubject(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>

                    <select
                      value={uploadUniversity}
                      onChange={(e) => setUploadUniversity(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    >
                      <option value="">Select University</option>
                      {universities.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
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
                    onChange={(e) => setManualForm(prev => ({ ...prev, body: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />

                  <textarea
                    placeholder="Explanation (optional)"
                    value={manualForm.explanation}
                    onChange={(e) => setManualForm(prev => ({ ...prev, explanation: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />

                  <div className="space-y-3">
                    {manualForm.options.map((opt, idx) => (
                      <div key={idx} className="flex gap-3 items-end">
                        <input
                          type="radio"
                          name="correct"
                          checked={opt.is_correct}
                          onChange={() => {
                            const newOpts = manualForm.options.map((o, i) => ({
                              ...o,
                              is_correct: i === idx,
                            }));
                            setManualForm(prev => ({ ...prev, options: newOpts }));
                          }}
                          className="mt-1"
                        />
                        <input
                          type="text"
                          placeholder={`Option ${opt.label}`}
                          value={opt.body}
                          onChange={(e) => {
                            const newOpts = [...manualForm.options];
                            newOpts[idx].body = e.target.value;
                            setManualForm(prev => ({ ...prev, options: newOpts }));
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
          </div>
        )}
      </main>
    </div>
  );
}
