import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Flame, Users, Plus } from "lucide-react";
import { streakApi, type Streak } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { CreateStreakModal } from "@/components/dashboard/CreateStreakModal";
import { useApiErrorToast } from "@/hooks/useApiErrorToast";

export const Route = createFileRoute("/dashboard/streaks")({
  component: StreaksPage,
});

function StreaksPage() {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get user pubkey from route context
  const { user } = Route.useRouteContext() as { user: { pubkey: string } };

  useApiErrorToast();

  const fetchStreaks = async () => {
    try {
      setIsLoading(true);
      const res = await streakApi.getAll();
      setStreaks(res.data.streaks);
    } catch (error) {
      console.error("Failed to fetch streaks", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStreaks();
  }, []);

  const soloStreaks = streaks.filter((s) => s.type === "solo");
  const duoStreaks = streaks.filter((s) => s.type === "duo");

  if (isLoading) {
    return <StreaksSkeleton />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-8xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 -ml-2 rounded-xl hover:bg-surface/50 text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              All Streaks
            </h1>
            <p className="text-muted text-sm mt-1">
              Manage and track all your active habits.
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer shadow-sm shadow-brand-900/20"
        >
          <Plus className="w-4 h-4" />
          New Streak
        </motion.button>
      </div>

      {/* Solo Streaks */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-brand-500" />
          <h2 className="text-lg font-semibold text-foreground">
            Solo Streaks
          </h2>
          <span className="text-xs font-medium text-muted bg-surface px-2 py-0.5 rounded-full border border-outline">
            {soloStreaks.length}
          </span>
        </div>
        {soloStreaks.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {soloStreaks.map((streak, i) => (
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
        ) : (
          <p className="text-muted text-sm italic">No solo streaks yet.</p>
        )}
      </div>

      {/* Duo Streaks */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-brand-400" />
          <h2 className="text-lg font-semibold text-foreground">Duo Streaks</h2>
          <span className="text-xs font-medium text-muted bg-surface px-2 py-0.5 rounded-full border border-outline">
            {duoStreaks.length}
          </span>
        </div>
        {duoStreaks.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {duoStreaks.map((streak, i) => (
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
        ) : (
          <p className="text-muted text-sm italic">No duo streaks yet.</p>
        )}
      </div>

      <CreateStreakModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => fetchStreaks()}
        streaks={streaks}
        userPubkey={user.pubkey}
      />
    </div>
  );
}

function StreaksSkeleton() {
  return (
    <div className="space-y-8 animate-pulse max-w-5xl mx-auto">
      <div className="h-10 w-48 bg-surface rounded-xl" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-outline rounded-2xl h-32"
          />
        ))}
      </div>
    </div>
  );
}
