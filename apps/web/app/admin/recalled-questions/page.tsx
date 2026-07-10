"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";

interface RecalledQuestion {
  id: string;
  body: string;
  year?: number;
  difficulty_level: string;
  subject_id: string;
  university_id: string;
  subject_name?: string;
  university_name?: string;
}

interface Subject {
  id: string;
  name: string;
}

interface University {
  id: string;
  name: string;
}

export default function AdminRecalledQuestionsPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [questions, setQuestions] = useState<RecalledQuestion[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    subject_id: "",
    university_id: "",
    body: "",
    explanation: "",
    year: new Date().getFullYear(),
    difficulty_level: "medium",
    options: [
      { label: "A", body: "", is_correct: false },
      { label: "B", body: "", is_correct: false },
      { label: "C", body: "", is_correct: false },
      { label: "D", body: "", is_correct: false },
    ],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const [subjectsRes, unisRes, questionsRes] = await Promise.all([
        api.get("/api/subjects"),
        api.get("/api/universities"),
        api.get("/api/admin/recalled-questions?limit=100"),
      ]);
      setSubjects(subjectsRes.data.data || []);
      setUniversities(unisRes.data.data || []);
      setQuestions(questionsRes.data.data.questions || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    }
  };

  const handleOptionChange = (index: number, field: string, value: any) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };

    // Ensure only one option is marked correct
    if (field === "is_correct" && value) {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.is_correct = false;
      });
    }

    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation
      if (!formData.subject_id || !formData.university_id || !formData.body) {
        toast.error("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      if (!formData.options.some((opt) => opt.is_correct)) {
        toast.error("Please mark one option as correct");
        setIsSubmitting(false);
        return;
      }

      if (formData.options.some((opt) => !opt.body)) {
        toast.error("Please fill in all option bodies");
        setIsSubmitting(false);
        return;
      }

      const response = await api.post("/api/admin/recalled-questions", {
        subject_id: formData.subject_id,
        university_id: formData.university_id,
        body: formData.body,
        explanation: formData.explanation || null,
        year: formData.year || null,
        difficulty_level: formData.difficulty_level,
        options: formData.options,
      });

      if (response.data.status === "success") {
        toast.success("Recalled question uploaded successfully!");
        setShowForm(false);
        setFormData({
          subject_id: "",
          university_id: "",
          body: "",
          explanation: "",
          year: new Date().getFullYear(),
          difficulty_level: "medium",
          options: [
            { label: "A", body: "", is_correct: false },
            { label: "B", body: "", is_correct: false },
            { label: "C", body: "", is_correct: false },
            { label: "D", body: "", is_correct: false },
          ],
        });
        fetchData();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to upload question";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
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

        {/* Upload Form Toggle */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-8 bg-forest text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-opacity"
          >
            + Upload New Question
          </button>
        )}

        {/* Upload Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-navy mb-6">
              Upload Recalled Question
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Subject and University Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) =>
                      setFormData({ ...formData, subject_id: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    University *
                  </label>
                  <select
                    value={formData.university_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        university_id: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                  >
                    <option value="">Select University</option>
                    {universities.map((uni) => (
                      <option key={uni.id} value={uni.id}>
                        {uni.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Year and Difficulty Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        year: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={formData.difficulty_level}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        difficulty_level: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
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

              {/* Explanation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Explanation (Optional)
                </label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) =>
                    setFormData({ ...formData, explanation: e.target.value })
                  }
                  rows={3}
                  placeholder="Enter explanation for the answer..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                />
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Answer Options * (Mark one as correct)
                </label>
                <div className="space-y-3">
                  {formData.options.map((option, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="min-w-fit pt-2">
                        <span className="font-bold text-navy min-w-fit">
                          {option.label}.
                        </span>
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={option.body}
                          onChange={(e) =>
                            handleOptionChange(idx, "body", e.target.value)
                          }
                          placeholder={`Option ${option.label}`}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
                        />
                      </div>
                      <label className="flex items-center gap-2 pt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={option.is_correct}
                          onChange={(e) =>
                            handleOptionChange(
                              idx,
                              "is_correct",
                              e.target.checked,
                            )
                          }
                          className="w-5 h-5 text-forest rounded focus:ring-2 focus:ring-forest"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Correct
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
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
                      University
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-navy">
                      Year
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-navy">
                      Difficulty
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
                        {question.subject_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {question.university_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {question.year}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            question.difficulty_level === "hard"
                              ? "bg-red-100 text-red-800"
                              : question.difficulty_level === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {question.difficulty_level}
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
