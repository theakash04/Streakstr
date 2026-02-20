import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { streakApi } from "@/lib/api";
import { DailyProgress } from "@/components/dashboard/DailyProgress";
import { ConsolidatedStats } from "@/components/dashboard/ConsolidatedStats";
import { ActivityGraph } from "@/components/dashboard/ActivityGraph";
import { CreateStreakModal } from "@/components/dashboard/CreateStreakModal";
import { useApiErrorToast } from "@/hooks/useApiErrorToast";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { user } = Route.useRouteContext() as { user: { pubkey: string } };

  useApiErrorToast();

  const {
    data: streaks = [],
    isLoading: isLoadingStreaks,
    error: streaksError,
    refetch: refetchStreaks,
    isRefetching: isRefetchingStreaks,
  } = useQuery({
    queryKey: ["streaks"],
    queryFn: async () => {
      const { data } = await streakApi.getAll();
      return data.streaks;
    },
  });

  const {
    data: unreadLogs = [],
    isLoading: isLoadingLogs,
    error: logsError,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ["unreadLogs"],
    queryFn: async () => {
      const { data } = await streakApi.getUnreadLogs();
      return data.logs;
    },
  });

  const isLoading = isLoadingStreaks || isLoadingLogs;
  const error =
    streaksError || logsError ? "Failed to load dashboard data" : null;

  const handleRefresh = () => {
    refetchStreaks();
    refetchLogs();
  };

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
            onClick={handleRefresh}
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
      {/* Floating Refresh Button */}
      <button
        onClick={handleRefresh}
        disabled={isRefetchingStreaks}
        title="Refresh data"
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-lg shadow-brand-900/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-80 disabled:hover:scale-100 group"
      >
        <RefreshCw
          className={`w-5 h-5 ${isRefetchingStreaks ? "animate-spin" : "transition-transform duration-500 group-hover:rotate-180"}`}
        />
        <span className="hidden sm:inline text-sm font-semibold tracking-wide">
          {isRefetchingStreaks ? "Refreshing..." : "Refresh"}
        </span>
      </button>

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
        onCreated={() => refetchStreaks()}
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
