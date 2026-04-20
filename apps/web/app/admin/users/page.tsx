"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface User {
  id: string;
  full_name: string;
  email: string;
  subscription_status: string;
  created_at: string;
  target_university_id: string | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
          ...(search && { search }),
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
  }, [pagination.page, pagination.limit, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "free":
        return "bg-amber-100 text-amber-700";
      case "expired":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading users...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy mb-8">Users</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                Subscription
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-navy">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {user.full_name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {user.email}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                      user.subscription_status
                    )}`}
                  >
                    {user.subscription_status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
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
    </div>
  );
}
