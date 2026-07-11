"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { firebaseAuth } from "@/lib/firebase";
import { TableRowSkeleton } from "@/components/skeletons";
import toast from "react-hot-toast";

interface User {
  id: string;
  full_name: string;
  email: string;
  subscription_status: string;
  target_course: string | null;
  subject_combination: string[] | null;
  created_at: string;
  target_university_id: string | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface Subject {
  id: string;
  name: string;
}

interface AudiencePreview {
  count: number;
  sample: { full_name: string; email: string }[];
}

interface ExportedResult {
  recipient_count: number;
  quota_remaining: number;
  reason: "quota" | "not_configured";
  recipients: { full_name: string; email: string }[];
}

const PLAN_OPTIONS = [
  { value: "explorer", label: "Explorer" },
  { value: "scholar", label: "Scholar" },
  { value: "elite", label: "Elite" },
];

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full sm:w-48 px-3 py-2 text-left border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-forest"
      >
        {selected.length === 0 ? `All` : `${selected.length} selected`}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg p-2">
          {options.length === 0 ? (
            <p className="text-xs text-gray-500 px-2 py-1">No options</p>
          ) : (
            options.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm text-gray-800"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="rounded border-gray-300 text-forest focus:ring-forest"
                />
                {opt.label}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);

  const [search, setSearch] = useState("");
  const [plans, setPlans] = useState<string[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<Subject[]>([]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  const [showComposeModal, setShowComposeModal] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceSubject, setAnnounceSubject] = useState("");
  const [announceBody, setAnnounceBody] = useState("");
  const [sending, setSending] = useState(false);
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);
  const [exportedResult, setExportedResult] = useState<ExportedResult | null>(null);

  const buildFilterParams = (extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (plans.length) params.set("plans", plans.join(","));
    if (courses.length) params.set("courses", courses.join(","));
    if (subjectIds.length) params.set("subjects", subjectIds.join(","));
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (search) params.set("search", search);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params;
  };

  // Load filter dropdown options once
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [courseRes, subjectRes] = await Promise.all([
          api.get("/api/admin/users/filter-options"),
          api.get("/api/subjects"),
        ]);
        setCourseOptions(courseRes.data.data.courses || []);
        setSubjectOptions(subjectRes.data.data || []);
      } catch (error) {
        console.error("Failed to load filter options:", error);
      }
    };
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const params = buildFilterParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
        });
        const res = await api.get(`/api/admin/users?${params.toString()}`);
        setUsers(res.data.data);
        setPagination(res.data.pagination);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, search, plans, courses, subjectIds, dateFrom, dateTo]);

  const resetToFirstPage = () => setPagination((prev) => ({ ...prev, page: 1 }));

  const handleSearch = (value: string) => {
    setSearch(value);
    resetToFirstPage();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "elite":
        return "bg-purple-100 text-purple-700";
      case "scholar":
        return "bg-green-100 text-green-700";
      case "explorer":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const toggleRowSelected = (id: string) => {
    if (selectAllMatching) setSelectAllMatching(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectPage = () => {
    if (selectAllMatching) setSelectAllMatching(false);
    setSelectedIds((prev) => {
      const allOnPageSelected = users.length > 0 && users.every((u) => prev.has(u.id));
      const next = new Set(prev);
      users.forEach((u) => (allOnPageSelected ? next.delete(u.id) : next.add(u.id)));
      return next;
    });
  };

  const toggleSelectAllMatching = () => {
    setSelectAllMatching((prev) => {
      const next = !prev;
      if (next) setSelectedIds(new Set());
      return next;
    });
  };

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const token = await firebaseAuth.currentUser?.getIdToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const params = buildFilterParams();

      const response = await fetch(`${apiUrl}/api/admin/users/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Users exported!");
    } catch (error) {
      console.error("Failed to export users:", error);
      toast.error("Failed to export users");
    } finally {
      setExportingCsv(false);
    }
  };

  const handleOpenCompose = async () => {
    setShowComposeModal(true);
    setExportedResult(null);
    setAnnounceTitle("");
    setAnnounceSubject("");
    setAnnounceBody("");
    setAudiencePreview(null);

    if (selectAllMatching) {
      try {
        const params = buildFilterParams();
        const res = await api.get(`/api/admin/announcements/preview?${params.toString()}`);
        setAudiencePreview(res.data.data);
      } catch (error) {
        console.error("Failed to preview audience:", error);
      }
    } else {
      const selectedUsers = users.filter((u) => selectedIds.has(u.id));
      setAudiencePreview({
        count: selectedIds.size,
        sample: selectedUsers.slice(0, 20).map((u) => ({ full_name: u.full_name, email: u.email })),
      });
    }
  };

  const handleSend = async () => {
    if (!announceSubject.trim() || !announceBody.trim()) {
      toast.error("Subject and body are required");
      return;
    }

    setSending(true);
    try {
      const payload: {
        title: string;
        subject: string;
        body: string;
        filters?: Record<string, unknown>;
        user_ids?: string[];
      } = {
        title: announceTitle.trim() || announceSubject.trim(),
        subject: announceSubject.trim(),
        body: announceBody.trim(),
      };

      if (selectAllMatching) {
        payload.filters = {
          plans,
          courses,
          subjects: subjectIds,
          date_from: dateFrom,
          date_to: dateTo,
          search,
        };
      } else {
        payload.user_ids = Array.from(selectedIds);
      }

      const res = await api.post("/api/admin/announcements/send", payload);
      const result = res.data.data;

      if (result.mode === "sent") {
        toast.success(
          `Sent to ${result.sent_count} user(s)${result.failed_count ? `, ${result.failed_count} failed` : ""}`
        );
        setShowComposeModal(false);
        setSelectedIds(new Set());
        setSelectAllMatching(false);
      } else {
        setExportedResult(result);
      }
    } catch (error) {
      console.error("Failed to send announcement:", error);
      toast.error("Failed to send announcement");
    } finally {
      setSending(false);
    }
  };

  const handleCopyEmails = async () => {
    if (!exportedResult) return;
    await navigator.clipboard.writeText(exportedResult.recipients.map((r) => r.email).join(", "));
    toast.success("Emails copied to clipboard");
  };

  const handleDownloadRecipientsCsv = () => {
    if (!exportedResult) return;
    const csv = [
      ["Name", "Email"],
      ...exportedResult.recipients.map((r) => [r.full_name, r.email]),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `announcement-recipients-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const canAnnounce = selectAllMatching || selectedIds.size > 0;
  const allOnPageSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-navy">Users</h1>
        <button
          onClick={handleExportCsv}
          disabled={exportingCsv}
          className="px-4 py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition disabled:opacity-50"
        >
          {exportingCsv ? "Exporting..." : "📥 Export CSV"}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest"
          />
        </div>

        <MultiSelectDropdown
          label="Plan"
          options={PLAN_OPTIONS}
          selected={plans}
          onChange={(v) => {
            setPlans(v);
            resetToFirstPage();
          }}
        />

        <MultiSelectDropdown
          label="Target Course"
          options={courseOptions.map((c) => ({ value: c, label: c }))}
          selected={courses}
          onChange={(v) => {
            setCourses(v);
            resetToFirstPage();
          }}
        />

        <MultiSelectDropdown
          label="Subject"
          options={subjectOptions.map((s) => ({ value: s.id, label: s.name }))}
          selected={subjectIds}
          onChange={(v) => {
            setSubjectIds(v);
            resetToFirstPage();
          }}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Joined From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              resetToFirstPage();
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Joined To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              resetToFirstPage();
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest"
          />
        </div>
      </div>

      {/* Selection banner */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectAllMatching}
              onChange={toggleSelectAllMatching}
              className="rounded border-gray-300 text-forest focus:ring-forest"
            />
            Select all {pagination.total} user(s) matching these filters
          </label>
          {!selectAllMatching && selectedIds.size > 0 && (
            <span className="text-gray-500">({selectedIds.size} selected on this page)</span>
          )}
        </div>
        <button
          onClick={handleOpenCompose}
          disabled={!canAnnounce}
          className="px-4 py-2 bg-navy text-white rounded-lg font-medium hover:bg-opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          📣 Send Announcement
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectPage}
                  className="rounded border-gray-300 text-forest focus:ring-forest"
                />
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Plan</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Course</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Joined</th>
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  No users match these filters
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectAllMatching || selectedIds.has(user.id)}
                      onChange={() => toggleRowSelected(user.id)}
                      disabled={selectAllMatching}
                      className="rounded border-gray-300 text-forest focus:ring-forest"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.full_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        user.subscription_status
                      )}`}
                    >
                      {user.subscription_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{user.target_course || "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(user.created_at).toLocaleDateString()}
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
          Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
          {pagination.total} users
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
            className="px-4 py-2 border text-gray-900 border-gray-300 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-900">
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
            className="px-4 py-2 border text-gray-900 border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Announcement compose modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            {exportedResult ? (
              <div>
                <h3 className="text-xl font-bold text-navy mb-4">
                  {exportedResult.reason === "not_configured"
                    ? "Email Sending Not Set Up Yet"
                    : "Free Email Quota Exceeded"}
                </h3>
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  {exportedResult.reason === "not_configured"
                    ? "Email sending isn't configured yet. No email was sent — here are the recipient addresses so you can send this manually instead."
                    : `Sending to ${exportedResult.recipient_count} user(s) would exceed the remaining free email quota (${exportedResult.quota_remaining} left right now). No email was sent — here are the recipient addresses so you can send this manually instead.`}
                </p>
                <textarea
                  readOnly
                  value={exportedResult.recipients.map((r) => r.email).join(", ")}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 mb-4"
                />
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={handleCopyEmails}
                    className="px-4 py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition"
                  >
                    Copy all emails
                  </button>
                  <button
                    onClick={handleDownloadRecipientsCsv}
                    className="px-4 py-2 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 transition"
                  >
                    Download CSV
                  </button>
                  <button
                    onClick={() => setShowComposeModal(false)}
                    className="px-4 py-2 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-navy mb-1">Send Announcement</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {audiencePreview
                    ? `Audience: ${audiencePreview.count} user(s)`
                    : "Loading audience..."}
                </p>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title (internal label)
                    </label>
                    <input
                      type="text"
                      value={announceTitle}
                      onChange={(e) => setAnnounceTitle(e.target.value)}
                      placeholder="e.g. July mock exam reminder"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={announceSubject}
                      onChange={(e) => setAnnounceSubject(e.target.value)}
                      placeholder="Subject line students will see"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={announceBody}
                      onChange={(e) => setAnnounceBody(e.target.value)}
                      placeholder="Write your announcement..."
                      className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowComposeModal(false)}
                    disabled={sending}
                    className="flex-1 px-4 py-2 border border-gray-300 text-navy rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="flex-1 px-4 py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
