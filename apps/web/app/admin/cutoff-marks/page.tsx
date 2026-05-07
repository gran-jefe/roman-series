"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/PageLoader";
import api from "@/lib/api";
import toast from "react-hot-toast";
import type { University, CutoffMark } from "types";

type Step = "upload" | "preview" | "done";

interface ParsedRecord {
  faculty: string;
  course: string;
  merit: number;
  catch: number;
  elds: number;
}

export default function CutoffMarksPage() {
  const { profile, loading } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<string>("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [existingRecords, setExistingRecords] = useState<CutoffMark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !profile) {
      return;
    }

    const fetchUniversities = async () => {
      try {
        const res = await api.get("/api/universities");
        setUniversities(res.data.data || []);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch universities:", error);
        setIsLoading(false);
      }
    };

    if (profile) {
      fetchUniversities();
    }
  }, [profile, loading]);

  const fetchExistingRecords = async () => {
    if (!selectedUniversity) return;
    try {
      const res = await api.get("/api/admin/cutoff-marks", {
        params: {
          universityId: selectedUniversity,
          year,
        },
      });
      setExistingRecords(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch existing records:", error);
    }
  };

  useEffect(() => {
    if (step === "done") {
      fetchExistingRecords();
    }
  }, [step, selectedUniversity, year]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleParsePDF = async () => {
    if (!file || !selectedUniversity) {
      toast.error("Please select a university and file");
      return;
    }

    setParsing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/api/admin/cutoff-marks/parse-pdf", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.status === "success") {
        setParsedRecords(res.data.data.records || []);
        setStep("preview");
        toast.success(`Parsed ${res.data.data.count} records`);
      } else {
        toast.error(res.data.message || "Failed to parse PDF");
      }
    } catch (error) {
      console.error("Failed to parse PDF:", error);
      toast.error("Failed to parse PDF. Please check the file format.");
    } finally {
      setParsing(false);
    }
  };

  const handleRemoveRecord = (index: number) => {
    setParsedRecords(parsedRecords.filter((_, i) => i !== index));
  };

  const handleConfirmUpload = async () => {
    if (parsedRecords.length === 0) {
      toast.error("No records to upload");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("/api/admin/cutoff-marks/bulk", {
        university_id: selectedUniversity,
        year,
        records: parsedRecords,
      });

      if (res.data.status === "success") {
        toast.success(`Successfully uploaded ${res.data.data.inserted} records`);
        setStep("done");
        setFile(null);
        setParsedRecords([]);
      } else {
        toast.error(res.data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Failed to upload records:", error);
      toast.error("Failed to upload records");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await api.delete(`/api/admin/cutoff-marks/${id}`);
      setExistingRecords(existingRecords.filter((r) => r.id !== id));
      toast.success("Record deleted");
    } catch (error) {
      console.error("Failed to delete record:", error);
      toast.error("Failed to delete record");
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-navy">Cut-off Marks Management</h1>
        <p className="text-gray-600 mt-1">Upload and manage university admission cut-off marks</p>
      </div>

      {/* University & Year Selection (shown in all steps) */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">University</label>
            <select
              value={selectedUniversity}
              onChange={(e) => setSelectedUniversity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent text-gray-900"
            >
              <option value="">Select a university</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-2xl font-bold text-navy">Step 1: Upload PDF</h2>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDragDrop}
            className="border-2 border-dashed border-forest rounded-lg p-12 text-center cursor-pointer hover:bg-blush transition-colors"
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-input"
            />
            <label htmlFor="pdf-input" className="cursor-pointer block">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-forest"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l-2 2m0 0a2 2 0 100-4h0a2 2 0 000 4zm0 0V4m0 4h12a2 2 0 110 4H7.414a1 1 0 00-.707.293l-4 4a1 1 0 001.414 1.414l2.293-2.293H17a2 2 0 110-4H9v4"
                />
              </svg>
              <p className="text-lg font-semibold text-navy mb-2">
                {file ? file.name : "Drop PDF or click to upload"}
              </p>
              <p className="text-sm text-gray-600">Upload a cut-off marks PDF (University of Ibadan format)</p>
            </label>
          </div>

          <button
            onClick={handleParsePDF}
            disabled={!file || !selectedUniversity || parsing}
            className={`w-full px-6 py-3 rounded-lg font-medium text-white transition-opacity ${
              parsing || !file || !selectedUniversity
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-forest hover:bg-opacity-90"
            }`}
          >
            {parsing ? "Parsing..." : "Parse PDF"}
          </button>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-2xl font-bold text-navy">Step 2: Preview & Confirm</h2>
          <p className="text-gray-600">
            {parsedRecords.length} records found. Review and remove any unwanted entries.
          </p>

          {/* Scrollable table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Faculty</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Course</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-900">Merit</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-900">Catch</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-900">ELDS</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {parsedRecords.map((record, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">{record.faculty}</td>
                    <td className="px-4 py-2 text-gray-900">{record.course}</td>
                    <td className="px-4 py-2 text-center text-gray-900">{record.merit}</td>
                    <td className="px-4 py-2 text-center text-gray-900">{record.catch}</td>
                    <td className="px-4 py-2 text-center text-gray-900">{record.elds}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => handleRemoveRecord(idx)}
                        className="text-ember hover:text-opacity-90 font-medium"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep("upload")}
              className="flex-1 px-6 py-3 rounded-lg font-medium text-gray-800 bg-gray-200 hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirmUpload}
              disabled={saving || parsedRecords.length === 0}
              className={`flex-1 px-6 py-3 rounded-lg font-medium text-white transition-opacity ${
                saving || parsedRecords.length === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-forest hover:bg-opacity-90"
              }`}
            >
              {saving ? "Uploading..." : "Confirm Upload"}
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-2xl font-bold text-navy">✓ Upload Complete</h2>
          <p className="text-gray-600">Records have been successfully saved to the database.</p>

          <button
            onClick={() => {
              setStep("upload");
              setFile(null);
              setParsedRecords([]);
            }}
            className="px-6 py-3 rounded-lg font-medium text-white bg-forest hover:bg-opacity-90 transition-opacity"
          >
            Upload Another
          </button>
        </div>
      )}

      {/* Existing Records Table */}
      {selectedUniversity && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-2xl font-bold text-navy">Existing Records</h2>
          <p className="text-sm text-gray-600">
            {selectedUniversity && year
              ? `Showing records for ${universities.find((u) => u.id === selectedUniversity)?.name} (${year})`
              : "Select university and year to view"}
          </p>

          {existingRecords.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No records found for this university and year</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900">Faculty</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900">Course</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-900">Merit</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-900">Catch</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-900">ELDS</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {existingRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900">{record.faculty || "—"}</td>
                      <td className="px-4 py-2 text-gray-900">{record.course}</td>
                      <td className="px-4 py-2 text-center text-gray-900">{record.merit_cutoff || "—"}</td>
                      <td className="px-4 py-2 text-center text-gray-900">{record.catch_cutoff || "—"}</td>
                      <td className="px-4 py-2 text-center text-gray-900">{record.elds_cutoff || "—"}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="text-ember hover:text-opacity-90 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
