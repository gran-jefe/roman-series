"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import toast from "react-hot-toast";

type EventType = "session" | "feedback" | "flag" | "signup" | "subscription";

interface ActivityEvent {
  id: string;
  type: EventType;
  user_id: string;
  user_name: string;
  user_email: string | null;
  timestamp: string;
  description: string;
  subject_name: string | null;
  metadata?: Record<string, unknown>;
}

const TYPE_META: Record<EventType, { emoji: string; label: string; colour: string }> = {
  session: { emoji: "📝", label: "Practice", colour: "bg-blue-50 text-blue-700 border-blue-200" },
  feedback: { emoji: "💬", label: "Feedback", colour: "bg-purple-50 text-purple-700 border-purple-200" },
  flag: { emoji: "🚩", label: "Flag", colour: "bg-red-50 text-red-700 border-red-200" },
  signup: { emoji: "🎉", label: "Signup", colour: "bg-green-50 text-green-700 border-green-200" },
  subscription: { emoji: "💳", label: "Payment", colour: "bg-amber-50 text-amber-700 border-amber-200" },
};

const ALL_TYPES: EventType[] = ["session", "feedback", "flag", "signup", "subscription"];

function timeAgo(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

export default function AdminActivityPage() {
  const router = useRouter();
  const { profile, loading } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>(ALL_TYPES);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!loading && profile?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [loading, profile, router]);

  const fetchActivity = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        types: selectedTypes.join(","),
        limit: "75",
      });
      if (search) params.set("search", search);

      const res = await api.get(`/api/admin/activity?${params}`);
      if (res.data.status === "success") {
        setEvents(res.data.data.events);
      }
    } catch (error) {
      console.error("Failed to fetch activity:", error);
      toast.error("Failed to load activity feed");
    } finally {
      setIsLoading(false);
    }
  }, [selectedTypes, search]);

  useEffect(() => {
    if (!loading && profile?.role === "admin") {
      setIsLoading(true);
      fetchActivity();
    }
  }, [loading, profile?.role, fetchActivity]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchActivity]);

  const toggleType = (type: EventType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">Loading...</div>
    );
  }

  if (profile?.role !== "admin") {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-navy">User Activity</h1>
          <p className="text-gray-600 mt-1">What students are doing on Roman Series, live from the database.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          Auto-refresh every 30s
        </label>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg shadow-sm p-4 mb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((type) => {
            const meta = TYPE_META[type];
            const active = selectedTypes.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  active ? meta.colour : "bg-gray-50 text-gray-400 border-gray-200"
                }`}
              >
                {meta.emoji} {meta.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by student name or email..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-forest text-white rounded-lg font-medium hover:bg-opacity-90 transition text-sm"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSearchInput("");
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition text-sm"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-600">Loading activity...</div>
      ) : events.length === 0 ? (
        <div className="bg-white border rounded-lg shadow-sm p-12 text-center text-gray-500">
          No activity found for these filters.
        </div>
      ) : (
        <div className="bg-white border rounded-lg shadow-sm divide-y">
          {events.map((event) => {
            const meta = TYPE_META[event.type];
            return (
              <div key={event.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition">
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg border ${meta.colour}`}
                >
                  {meta.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">{event.user_name}</span>{" "}
                    <span className="text-gray-700">{event.description}</span>
                    {event.subject_name && (
                      <span className="text-gray-500"> · {event.subject_name}</span>
                    )}
                  </p>
                  {event.user_email && (
                    <p className="text-xs text-gray-400 mt-0.5">{event.user_email}</p>
                  )}
                </div>
                <span className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">
                  {timeAgo(event.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
