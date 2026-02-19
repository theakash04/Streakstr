import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Global error interceptor — dispatches a DOM event so React can show toasts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Something went wrong";

    // Don't toast auth errors (401) — those are handled by the auth guard
    if (error.response?.status !== 401) {
      window.dispatchEvent(
        new CustomEvent("api-error", { detail: { message } }),
      );
    }

    return Promise.reject(error);
  },
);

// Auth API calls
export const authApi = {
  getChallenge: (pubkey: string) =>
    api.post<{ challenge: string; expiresAt: number }>("/auth/challenge", {
      pubkey,
    }),

  verify: (signedEvent: object) =>
    api.post<{ success: boolean; pubkey: string; expiresAt: number }>(
      "/auth/verify",
      { signedEvent },
    ),

  logout: () => api.post("/auth/logout"),

  me: () =>
    api.get<{ pubkey: string; user: object | null; authenticated: boolean }>(
      "/auth/me",
    ),
};

// Streak API calls
export const streakApi = {
  getAll: () => api.get<{ streaks: Streak[] }>("/streaks/all"),

  getSingle: (streakId: string) =>
    api.get<{ streak: StreakDetail }>(`/streaks/${streakId}`),

  createSolo: (name: string) =>
    api.post<{ streak: Streak }>("/streaks/solo", { name }),

  deleteStreak: (streakId: string) => api.delete(`/streaks/${streakId}`),

  getSettings: (streakId: string) =>
    api.get<{ settings: StreakSettings }>(`/streaks/${streakId}/settings`),

  updateSettings: (streakId: string, data: Partial<StreakSettingsUpdate>) =>
    api.patch(`/streaks/${streakId}/settings`, data),

  getActivity: (year: number) =>
    api.get<{ activityLogs: ActivityLog[] }>("/streaks/activity", {
      params: { year },
    }),

  getUnreadLogs: () => api.get<{ logs: LogEntry[] }>("/streaks/logs/unread"),

  acknowledgeLogs: (streakId: string, logsId: string) =>
    api.patch(`/streaks/${streakId}/logs/${logsId}/acknowledge`, { logsId }),

  markAllLogsAsRead: (streakId: string) =>
    api.patch(`/streaks/${streakId}/logs/mark-read`),
};

// Types
export interface Streak {
  id: string;
  type: "solo" | "duo";
  name: string;
  user1Pubkey: string;
  user2Pubkey: string | null;
  status: "pending" | "active" | "broken";
  currentCount: number;
  highestCount: number;
  lastActivityAt: string | null;
  deadline: string | null;
  startedAt: string | null;
  createdAt: string;
}

export interface StreakDetail {
  streak: Streak;
  settings: StreakSettings | null;
  history: StreakHistoryEntry | null;
}

export interface StreakSettings {
  id: string;
  streakId: string;
  dmReminder: boolean;
  abuseLevel: number;
  reminderOffsetHours: number;
  showInLeaderboard: boolean;
}

export interface StreakSettingsUpdate {
  dmReminder: boolean;
  abuseLevel: number;
  reminderOffsetHours: number;
  showInLeaderboard: boolean;
}

export interface StreakHistoryEntry {
  id: string;
  streakId: string;
  countBeforeBreak: number;
  startedAt: string;
  brokenAt: string;
}

export interface ActivityLog {
  date: string;
  postCount: number;
  streakActive: boolean;
}

export interface LogEntry {
  id: string;
  startedByPubkey: string;
  relatedPubkey2: string | null;
  action: string;
  description: string | null;
  createdAt: string;
  acknowledged: boolean;
}
