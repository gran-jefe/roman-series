"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Subject, University } from "types";
import toast from "react-hot-toast";
import { TableRowSkeleton } from "@/components/skeletons";

interface OptionRow {
  id?: string;
  label: string;
  body: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  body: string;
  explanation: string | null;
  difficulty: string | null;
  subject_id: string;
  university_id: string;
  topic_id: string | null;
  subjects: { name: string } | null;
  universities: { name: string } | null;
  topics: { name: string } | null;
  options: OptionRow[];
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
  university_id: string;
  subjects: { name: string } | null;
  universities: { name: string } | null;
  question_count: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

type UploadStep = "configure" | "preview" | "success";

const emptyOptions = (): OptionRow[] => [
  { label: "A", body: "", is_correct: false },
  { label: "B", body: "", is_correct: false },
  { label: "C", body: "", is_correct: false },
  { label: "D", body: "", is_correct: false },
];

export default function AdminQuestionsPage() {
  const [activeTab, setActiveTab] = useState<"bank" | "topics" | "upload">("bank");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);

  // Tab 1: Question Bank
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [topicOptions, setTopicOptions] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [noTopicOnly, setNoTopicOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editExplanation, setEditExplanation] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("medium");
  const [editTopicId, setEditTopicId] = useState("");
  const [editOptions, setEditOptions] = useState<OptionRow[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Bulk topic assignment for topic-less questions
  const [bulkTopicId, setBulkTopicId] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // Tab 2: Topics management
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsSubjectFilter, setTopicsSubjectFilter] = useState("");
  const [topicsUniversityFilter, setTopicsUniversityFilter] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicSubject, setNewTopicSubject] = useState("");
  const [newTopicUniversity, setNewTopicUniversity] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [renamingTopicId, setRenamingTopicId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Tab 3: Upload
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadUniversity, setUploadUniversity] = useState("");
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
  const [manualTopicOptions, setManualTopicOptions] = useState<Topic[]>([]);
  const [manualTopicId, setManualTopicId] = useState("");
  const [manualNewTopicMode, setManualNewTopicMode] = useState(false);
  const [manualNewTopicName, setManualNewTopicName] = useState("");
  const [manualForm, setManualForm] = useState({
    body: "",
    explanation: "",
    options: emptyOptions(),
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

  // Fetch topic filter options for the Question Bank whenever subject/university filters change
  useEffect(() => {
    const fetchTopicOptions = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedSubject) params.append("subjectId", selectedSubject);
        if (selectedUniversity) params.append("universityId", selectedUniversity);
        const res = await api.get(`/api/admin/topics?${params.toString()}`);
        setTopicOptions(res.data.data || []);
      } catch (error) {
        console.error("Failed to fetch topics:", error);
      }
    };
    fetchTopicOptions();
  }, [selectedSubject, selectedUniversity]);

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
          ...(noTopicOnly
            ? { noTopic: "true" }
            : selectedTopic
            ? { topicId: selectedTopic }
            : {}),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    pagination.page,
    selectedSubject,
    selectedUniversity,
    selectedTopic,
    noTopicOnly,
  ]);

  // Fetch topics list for the Topics tab
  useEffect(() => {
    if (activeTab !== "topics") return;

    const fetchTopics = async () => {
      setTopicsLoading(true);
      try {
        const params = new URLSearchParams();
        if (topicsSubjectFilter) params.append("subjectId", topicsSubjectFilter);
        if (topicsUniversityFilter) params.append("universityId", topicsUniversityFilter);
        const res = await api.get(`/api/admin/topics?${params.toString()}`);
        setAllTopics(res.data.data || []);
      } catch (error) {
        console.error("Failed to fetch topics:", error);
        toast.error("Failed to load topics");
      } finally {
        setTopicsLoading(false);
      }
    };

    fetchTopics();
  }, [activeTab, topicsSubjectFilter, topicsUniversityFilter]);

  // Fetch topic options for the manual-add form, dependent on chosen subject/university
  useEffect(() => {
    if (!uploadSubject || !uploadUniversity) {
      setManualTopicOptions([]);
      return;
    }
    const fetchManualTopics = async () => {
      try {
        const params = new URLSearchParams({
          subjectId: uploadSubject,
          universityId: uploadUniversity,
        });
        const res = await api.get(`/api/admin/topics?${params.toString()}`);
        setManualTopicOptions(res.data.data || []);
      } catch (error) {
        console.error("Failed to fetch topics:", error);
      }
    };
    fetchManualTopics();
  }, [uploadSubject, uploadUniversity]);

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;

    try {
      await api.delete(`/api/admin/questions/${id}`);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("Question deleted");
    } catch (error: any) {
      console.error("Failed to delete question:", error);
      toast.error(error.response?.data?.message || "Failed to delete question");
    }
  };

  const openEditModal = (question: Question) => {
    setEditingQuestion(question);
    setEditBody(question.body);
    setEditExplanation(question.explanation || "");
    setEditDifficulty(question.difficulty || "medium");
    setEditTopicId(question.topic_id || "");
    setEditOptions(
      question.options.map((o) => ({
        id: o.id,
        label: o.label,
        body: o.body,
        is_correct: o.is_correct,
      }))
    );
  };

  const closeEditModal = () => {
    setEditingQuestion(null);
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;

    const correctCount = editOptions.filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      toast.error("Exactly one option must be marked as correct");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await api.patch(`/api/admin/questions/${editingQuestion.id}`, {
        body: editBody,
        explanation: editExplanation || null,
        difficulty: editDifficulty,
        topic_id: editTopicId,
        options: editOptions,
      });

      setQuestions((prev) =>
        prev.map((q) => (q.id === editingQuestion.id ? res.data.data : q))
      );
      toast.success("Question updated");
      closeEditModal();
    } catch (error: any) {
      console.error("Failed to update question:", error);
      toast.error(error.response?.data?.message || "Failed to update question");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleBulkAssignTopic = async () => {
    if (!bulkTopicId || questions.length === 0) return;

    setBulkAssigning(true);
    try {
      await api.patch("/api/admin/questions/bulk-assign-topic", {
        question_ids: questions.map((q) => q.id),
        topic_id: bulkTopicId,
      });
      toast.success(`Assigned topic to ${questions.length} question(s)`);
      setQuestions([]);
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - questions.length) }));
      setBulkTopicId("");
    } catch (error) {
      console.error("Failed to bulk-assign topic:", error);
      toast.error("Failed to assign topic");
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopicName || !newTopicSubject || !newTopicUniversity) {
      toast.error("Name, subject, and university are required");
      return;
    }

    setCreatingTopic(true);
    try {
      const res = await api.post("/api/admin/topics", {
        name: newTopicName,
        subject_id: newTopicSubject,
        university_id: newTopicUniversity,
      });
      toast.success("Topic created");
      setNewTopicName("");
      if (
        (!topicsSubjectFilter || topicsSubjectFilter === newTopicSubject) &&
        (!topicsUniversityFilter || topicsUniversityFilter === newTopicUniversity)
      ) {
        setAllTopics((prev) => [...prev, { ...res.data.data, question_count: 0 }]);
      }
    } catch (error: any) {
      console.error("Failed to create topic:", error);
      toast.error(error.response?.data?.message || "Failed to create topic");
    } finally {
      setCreatingTopic(false);
    }
  };

  const handleRenameTopic = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      await api.patch(`/api/admin/topics/${id}`, { name: renameValue.trim() });
      setAllTopics((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: renameValue.trim() } : t))
      );
      toast.success("Topic renamed");
      setRenamingTopicId(null);
    } catch (error) {
      console.error("Failed to rename topic:", error);
      toast.error("Failed to rename topic");
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm("Delete this topic? Only possible if it has no questions.")) return;
    try {
      await api.delete(`/api/admin/topics/${id}`);
      setAllTopics((prev) => prev.filter((t) => t.id !== id));
      toast.success("Topic deleted");
    } catch (error: any) {
      console.error("Failed to delete topic:", error);
      toast.error(error.response?.data?.message || "Failed to delete topic");
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

      if (!jsonData.subject || !jsonData.university || !jsonData.topics) {
        toast.error("Invalid JSON structure. Required fields: subject, university, topics");
        setUploadLoading(false);
        return;
      }

      setUploadProgress(75);
      let totalQuestions = 0;
      let totalSkipped = 0;

      jsonData.topics.forEach((topic: any) => {
        topic.questions.forEach((q: any) => {
          if (q.answer === null || q.answer === undefined) {
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
    setSuccessResult(null);
  };

  const handleAddManualQuestion = async () => {
    if (!uploadSubject || !uploadUniversity || !manualForm.body) {
      toast.error("Please fill in required fields");
      return;
    }

    if (!manualNewTopicMode && !manualTopicId) {
      toast.error("Please select a topic (or create a new one)");
      return;
    }

    const correctCount = manualForm.options.filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      toast.error("Exactly one option must be marked as correct");
      return;
    }

    try {
      let topicId = manualTopicId;

      if (manualNewTopicMode) {
        if (!manualNewTopicName.trim()) {
          toast.error("Please enter a name for the new topic");
          return;
        }
        const topicRes = await api.post("/api/admin/topics", {
          name: manualNewTopicName.trim(),
          subject_id: uploadSubject,
          university_id: uploadUniversity,
        });
        topicId = topicRes.data.data.id;
      }

      await api.post("/api/admin/upload/manual", {
        subject_id: uploadSubject,
        university_id: uploadUniversity,
        topic_id: topicId,
        body: manualForm.body,
        explanation: manualForm.explanation || null,
        options: manualForm.options,
      });

      toast.success("Question added successfully");
      setManualForm({ body: "", explanation: "", options: emptyOptions() });
      setManualNewTopicMode(false);
      setManualNewTopicName("");
      // Refresh topic dropdown (new topic or unchanged) and keep selection
      if (manualNewTopicMode) {
        const params = new URLSearchParams({
          subjectId: uploadSubject,
          universityId: uploadUniversity,
        });
        const res = await api.get(`/api/admin/topics?${params.toString()}`);
        setManualTopicOptions(res.data.data || []);
        setManualTopicId(topicId);
      }
    } catch (error: any) {
      console.error("Failed to add question:", error);
      toast.error(error.response?.data?.message || "Failed to add question");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-navy text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Questions Management</h1>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex gap-8 overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab("bank");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`pb-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === "bank"
                  ? "border-b-2 border-forest text-forest"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Question Bank
            </button>
            <button
              onClick={() => setActiveTab("topics")}
              className={`pb-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === "topics"
                  ? "border-b-2 border-forest text-forest"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Topics
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`pb-4 font-medium transition-colors whitespace-nowrap ${
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setSelectedTopic("");
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
                    setSelectedTopic("");
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

                <select
                  value={noTopicOnly ? "__no_topic__" : selectedTopic}
                  onChange={(e) => {
                    if (e.target.value === "__no_topic__") {
                      setNoTopicOnly(true);
                      setSelectedTopic("");
                    } else {
                      setNoTopicOnly(false);
                      setSelectedTopic(e.target.value);
                    }
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="">All Topics</option>
                  <option value="__no_topic__">⚠ No Topic Assigned</option>
                  {topicOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.question_count})
                    </option>
                  ))}
                </select>

                <div className="text-sm text-gray-600 flex items-center">
                  {pagination.total} questions in database
                </div>
              </div>

              {noTopicOnly && questions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-amber-200 bg-amber-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <p className="text-sm text-amber-900 flex-1">
                    These questions have no topic — practice/mock exams can't reliably surface them.
                    Assign a topic to all {pagination.total} shown below:
                  </p>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <select
                      value={bulkTopicId}
                      onChange={(e) => setBulkTopicId(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm flex-1 sm:flex-none"
                    >
                      <option value="">Select topic...</option>
                      {topicOptions.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleBulkAssignTopic}
                      disabled={!bulkTopicId || bulkAssigning}
                      className="px-4 py-2 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50 whitespace-nowrap"
                    >
                      {bulkAssigning ? "Assigning..." : "Assign to page"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Questions Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-16">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-32">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-36">
                      Topic
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-24">
                      Difficulty
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-32">
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
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {question.body.substring(0, 100)}
                          {question.body.length > 100 ? "…" : ""}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {question.subjects?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {question.topics?.name ? (
                            <span className="text-gray-700">{question.topics.name}</span>
                          ) : (
                            <span className="text-amber-600 font-semibold">No topic</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 capitalize">
                          {question.difficulty || "medium"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-3">
                            <button
                              onClick={() => openEditModal(question)}
                              className="text-forest hover:text-opacity-80 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(question.id)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Delete
                            </button>
                          </div>
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
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total}
                </p>
                <div className="space-x-2">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))
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

        {/* TAB 2: Topics */}
        {activeTab === "topics" && (
          <div>
            {/* Create Topic */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-bold text-navy mb-4">Create Topic</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <select
                  value={newTopicSubject}
                  onChange={(e) => setNewTopicSubject(e.target.value)}
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
                  value={newTopicUniversity}
                  onChange={(e) => setNewTopicUniversity(e.target.value)}
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
                  type="text"
                  placeholder="Topic name"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              <button
                onClick={handleCreateTopic}
                disabled={creatingTopic}
                className="px-6 py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50"
              >
                {creatingTopic ? "Creating..." : "+ Create Topic"}
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  value={topicsSubjectFilter}
                  onChange={(e) => setTopicsSubjectFilter(e.target.value)}
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
                  value={topicsUniversityFilter}
                  onChange={(e) => setTopicsUniversityFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="">All Universities</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Topics Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-32">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-32">
                      University
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-28">
                      Questions
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-navy w-40">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topicsLoading ? (
                    <>
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                    </>
                  ) : allTopics.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-600">
                        No topics found
                      </td>
                    </tr>
                  ) : (
                    allTopics.map((topic) => (
                      <tr key={topic.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {renamingTopicId === topic.id ? (
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-gray-900 w-full"
                              autoFocus
                            />
                          ) : (
                            topic.name
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {topic.subjects?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {topic.universities?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {topic.question_count}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {renamingTopicId === topic.id ? (
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleRenameTopic(topic.id)}
                                className="text-forest hover:text-opacity-80 font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setRenamingTopicId(null)}
                                className="text-gray-500 hover:text-gray-700 font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-3">
                              <button
                                onClick={() => {
                                  setRenamingTopicId(topic.id);
                                  setRenameValue(topic.name);
                                }}
                                className="text-forest hover:text-opacity-80 font-medium"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => handleDeleteTopic(topic.id)}
                                disabled={topic.question_count > 0}
                                title={
                                  topic.question_count > 0
                                    ? "Can't delete a topic that still has questions"
                                    : ""
                                }
                                className="text-red-600 hover:text-red-800 font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Upload Questions */}
        {activeTab === "upload" && (
          <div className="space-y-8">
            {/* STEP 1: Configure */}
            {uploadStep === "configure" && (
              <div className="bg-white rounded-lg shadow p-8">
                <h2 className="text-2xl font-bold text-navy mb-2">
                  Upload Questions from JSON
                </h2>
                <p className="text-gray-600 mb-6">
                  Import questions with topics and options from a JSON file. Topics
                  are matched by name and created automatically if they don't already exist.
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                  <p className="text-sm text-blue-900 font-semibold mb-2">JSON format:</p>
                  <p className="text-sm text-blue-900 mb-3">
                    File should contain subject, university code (e.g. &quot;UI&quot;), and topics with questions. Questions without an answer will be skipped.
                  </p>
                </div>

                <div className="space-y-6">
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
                      <label htmlFor="file-upload" className="cursor-pointer block">
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
                <h2 className="text-2xl font-bold text-navy mb-8">Preview Upload</h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 mb-1">Subject</p>
                    <p className="text-lg font-bold text-blue-900">{parseResult.subject}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 mb-1">University</p>
                    <p className="text-lg font-bold text-blue-900">{parseResult.university}</p>
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

                {parseResult.total_skipped > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
                    <p className="text-sm text-amber-900">
                      ⚠{" "}
                      <strong>{parseResult.total_skipped} questions have no answer</strong>{" "}
                      and will be skipped during upload.
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
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
                    ✓ {successResult.total_questions} questions uploaded across{" "}
                    {successResult.total_topics} topics
                  </p>
                  {successResult.total_skipped > 0 && (
                    <p className="text-sm text-green-800 mt-2">
                      {successResult.total_skipped} questions were skipped (no answer provided)
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
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
                  <span className="text-xl">{manualQuestionOpen ? "▼" : "▶"}</span>
                  Add Single Question Manually
                </button>

                {manualQuestionOpen && (
                  <div className="space-y-6 pt-6 border-t mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <select
                        value={uploadSubject}
                        onChange={(e) => {
                          setUploadSubject(e.target.value);
                          setManualTopicId("");
                        }}
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
                        onChange={(e) => {
                          setUploadUniversity(e.target.value);
                          setManualTopicId("");
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                      >
                        <option value="">Select University</option>
                        {universities.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Topic selection */}
                    {uploadSubject && uploadUniversity && (
                      <div>
                        {!manualNewTopicMode ? (
                          <div className="flex flex-col sm:flex-row gap-3">
                            <select
                              value={manualTopicId}
                              onChange={(e) => setManualTopicId(e.target.value)}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                            >
                              <option value="">Select Topic</option>
                              {manualTopicOptions.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setManualNewTopicMode(true)}
                              className="px-4 py-2 border border-forest text-forest rounded-lg font-medium hover:bg-forest/5 whitespace-nowrap"
                            >
                              + New Topic
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input
                              type="text"
                              placeholder="New topic name"
                              value={manualNewTopicName}
                              onChange={(e) => setManualNewTopicName(e.target.value)}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setManualNewTopicMode(false);
                                setManualNewTopicName("");
                              }}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 whitespace-nowrap"
                            >
                              Use Existing Topic
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <textarea
                      placeholder="Question body..."
                      value={manualForm.body}
                      onChange={(e) =>
                        setManualForm((prev) => ({ ...prev, body: e.target.value }))
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />

                    <textarea
                      placeholder="Explanation (optional)"
                      value={manualForm.explanation}
                      onChange={(e) =>
                        setManualForm((prev) => ({ ...prev, explanation: e.target.value }))
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
                              const newOpts = manualForm.options.map((o, i) => ({
                                ...o,
                                is_correct: i === idx,
                              }));
                              setManualForm((prev) => ({ ...prev, options: newOpts }));
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
                              setManualForm((prev) => ({ ...prev, options: newOpts }));
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

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-navy mb-6">Edit Question</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Body
                </label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                  <select
                    value={editTopicId}
                    onChange={(e) => setEditTopicId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="">No topic</option>
                    {topicOptions
                      .filter(
                        (t) =>
                          t.subject_id === editingQuestion.subject_id &&
                          t.university_id === editingQuestion.university_id
                      )
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Explanation (optional)
                </label>
                <textarea
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options — select the correct one
                </label>
                <div className="space-y-3">
                  {editOptions.map((opt, idx) => (
                    <div key={opt.id || idx} className="flex gap-3 items-center">
                      <input
                        type="radio"
                        name="edit-correct"
                        checked={opt.is_correct}
                        onChange={() => {
                          setEditOptions((prev) =>
                            prev.map((o, i) => ({ ...o, is_correct: i === idx }))
                          );
                        }}
                        className="cursor-pointer"
                      />
                      <span className="w-6 text-sm font-semibold text-gray-700">
                        {opt.label}.
                      </span>
                      <input
                        type="text"
                        value={opt.body}
                        onChange={(e) => {
                          const updated = [...editOptions];
                          updated[idx] = { ...updated[idx], body: e.target.value };
                          setEditOptions(updated);
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex-1 px-6 py-3 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={closeEditModal}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
