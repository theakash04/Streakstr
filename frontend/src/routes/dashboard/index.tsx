import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Plus, Flame, Trophy, Clock, Bell, RefreshCw } from "lucide-react";
import { streakApi, type Streak, type LogEntry } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { ActivityGraph } from "@/components/dashboard/ActivityGraph";
import { CreateStreakModal } from "@/components/dashboard/CreateStreakModal";
import { useApiErrorToast } from "@/hooks/useApiErrorToast";
import { useToast } from "@/components/ui/Toast";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [unreadLogs, setUnreadLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Show API errors as toasts
  useApiErrorToast();

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

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
      setIsLoading(false);
      setIsRefreshing(false);
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

  const handleManualRefresh = () => {
    fetchData(true);
    toast.info("Refreshing dashboard...");
  };

  const activeStreaks = streaks.filter((s) => s.status === "active");
  const highestCount = streaks.reduce(
    (max, s) => Math.max(max, s.highestCount),
    0,
  );
  const totalActive = activeStreaks.length;

  const stats = [
    {
      label: "Active Streaks",
      value: totalActive,
      icon: Flame,
      color: "text-brand-500",
      bg: "bg-brand-500/10",
    },
    {
      label: "Best Streak",
      value: `${highestCount}d`,
      icon: Trophy,
      color: "text-status-gentle",
      bg: "bg-status-gentle/10",
    },
    // {
    //   label: "Pending",
    //   value: streaks.filter((s) => s.status === "pending").length,
    //   icon: Clock,
    //   color: "text-status-firm",
    //   bg: "bg-status-firm/10",
    // },
    {
      label: "Notifications",
      value: unreadLogs.length,
      icon: Bell,
      color: "text-brand-400",
      bg: "bg-brand-400/10",
    },
  ];

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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted text-sm mt-1">
            Track your streaks, stay consistent.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleManualRefresh()}
            disabled={isRefreshing}
            className="flex items-center justify-center p-2.5 bg-surface border border-outline hover:border-brand-500/30 text-muted hover:text-foreground rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer shadow-sm shadow-brand-900/20"
          >
            <Plus className="w-4 h-4" />
            New Streak
          </motion.button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-surface border border-outline rounded-2xl p-3 sm:p-5"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div
                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${stat.bg}`}
              >
                <stat.icon
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${stat.color}`}
                />
              </div>
              <span className="text-[10px] sm:text-xs text-muted font-medium uppercase tracking-wider leading-tight">
                {stat.label}
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Streaks */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Your Streaks
        </h2>
        {streaks.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreateModal(true)} />
        ) : (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {streaks.map((streak, i) => (
                <motion.div
                  key={streak.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <StreakCard streak={streak} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Activity Graph */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-lg font-semibold text-foreground mb-4">Activity</h2>
        <ActivityGraph />
      </div>

      {/* Create Modal */}
      <CreateStreakModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => fetchData()}
      />
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-surface border border-outline border-dashed rounded-2xl p-12 text-center"
    >
      <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Flame className="w-8 h-8 text-brand-500" />
      </div>
      <h3 className="text-foreground font-semibold text-lg mb-2">
        No streaks yet
      </h3>
      <p className="text-muted text-sm mb-6 max-w-sm mx-auto">
        Create your first streak to start building consistency with Nostr.
      </p>
      <button
        onClick={onCreateClick}
        className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Create Streak
      </button>
    </motion.div>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-outline rounded-2xl p-3 sm:p-5 h-20 sm:h-24"
          />
        ))}
      </div>
      <div>
        <div className="h-5 w-28 bg-surface rounded-lg mb-4" />
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-outline rounded-2xl h-36 sm:h-44"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
