import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";

import { streakApi, type Streak, type LogEntry } from "@/lib/api";
import { DailyProgress } from "@/components/dashboard/DailyProgress";
import { ConsolidatedStats } from "@/components/dashboard/ConsolidatedStats";
import { ActivityGraph } from "@/components/dashboard/ActivityGraph";
import { CreateStreakModal } from "@/components/dashboard/CreateStreakModal";
import { useApiErrorToast } from "@/hooks/useApiErrorToast";
import { Flame, Plus } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [unreadLogs, setUnreadLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = Route.useRouteContext() as { user: { pubkey: string } };

  useApiErrorToast();

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);

      const [streaksRes, logsRes] = await Promise.all([
        streakApi.getAll(),
        streakApi.getUnreadLogs(),
      ]);
      setStreaks(streaksRes.data.streaks);
      setUnreadLogs(logsRes.data.logs);
      setError(null);
    } catch {
      if (!silent) setError("Failed to load dashboard data");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 seconds (silent)
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const activeStreaks = streaks.filter((s) => s.status === "active");
  const highCount = streaks.reduce(
    (max, s) => Math.max(max, s.highestCount),
    0,
  );
  const totalActive = activeStreaks.length;

  const pendingInvitations = streaks.filter(
    (s) =>
      s.type === "duo" &&
      s.inviteStatus === "pending" &&
      s.user2Pubkey === user.pubkey,
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-status-chaos mb-4">{error}</p>
          <button
            onClick={() => fetchData()}
            className="text-brand-500 hover:text-brand-400 text-sm font-medium cursor-pointer"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Daily Progress Section */}
      <DailyProgress
        streaks={streaks}
        onCreateClick={() => setShowCreateModal(true)}
      />

      {/* Consolidated Stats */}
      <ConsolidatedStats
        stats={{
          active: totalActive,
          best: highCount,
          notifications: unreadLogs.length,
          pendingInvites: pendingInvitations.length,
        }}
      />

      {/* Activity Graph */}
      <div className="max-w-7xl mx-auto pt-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">Activity</h2>
        <ActivityGraph />
      </div>

      {/* Create Modal */}
      <CreateStreakModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => fetchData()}
        streaks={streaks}
        userPubkey={user.pubkey}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <div className="h-6 sm:h-7 w-36 bg-surface rounded-lg" />
          <div className="h-4 w-52 bg-surface rounded-lg mt-2" />
        </div>
        <div className="h-10 w-full sm:w-32 bg-surface rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-outline rounded-2xl p-3 sm:p-5 h-20 sm:h-24"
          />
        ))}
      </div>
      <div>
        <div className="h-5 w-28 bg-surface rounded-lg mb-4" />
        <div className="space-y-3 sm:space-y-4">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-outline rounded-2xl h-28 sm:h-32"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
