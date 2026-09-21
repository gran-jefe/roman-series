"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { TableRowSkeleton } from "@/components/skeletons";

interface Announcement {
  id: string;
  title: string;
  subject: string;
  filters: Record<string, unknown>;
  recipient_count: number;
  mode: "sent" | "exported";
  sent_count: number;
  failed_count: number;
  created_at: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
        });
        const res = await api.get(`/api/admin/announcements?${params.toString()}`);
        setAnnouncements(res.data.data);
        setPagination(res.data.pagination);
      } catch (error) {
        console.error("Failed to fetch announcements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [pagination.page, pagination.limit]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy mb-8">Announcements</h1>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Title</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-navy">Subject</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-navy">Recipients</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-navy">Mode</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-navy">Sent / Failed</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
              </>
            ) : announcements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  No announcements sent yet
                </td>
              </tr>
            ) : (
              announcements.map((a) => (
                <tr key={a.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{a.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{a.subject}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">{a.recipient_count}</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        a.mode === "sent" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {a.mode === "sent" ? "Sent" : "Exported"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">
                    {a.mode === "sent" ? `${a.sent_count} / ${a.failed_count}` : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-600">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
          {pagination.total} announcements
        </p>
        <div className="space-x-2">
          <button
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))
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
    </div>
  );
}
