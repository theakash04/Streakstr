import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Flame,
  Trophy,
  Calendar,
  Settings,
  Trash2,
  Clock,
  VolumeX,
  Heart,
  Shield,
  type LucideIcon,
} from "lucide-react";
import {
  streakApi,
  type StreakDetail,
  type StreakSettings,
  type StreakSettingsUpdate,
} from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { CountdownTimer } from "@/components/dashboard/CountdownTimer";

export const Route = createFileRoute("/dashboard/$streakId")({
  component: StreakDetailPage,
});

function StreakDetailPage() {
  const { streakId } = Route.useParams();
  const [detail, setDetail] = useState<StreakDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDetail = async () => {
    try {
      setIsLoading(true);
      const { data } = await streakApi.getSingle(streakId);
      setDetail(data.streak);
    } catch {
      setError("Failed to load streak details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [streakId]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await streakApi.deleteStreak(streakId);
      window.location.href = "/dashboard";
    } catch {
      setError("Failed to delete streak");
      setIsDeleting(false);
    }
  };

  if (isLoading) return <DetailSkeleton />;
  if (error || !detail)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-status-chaos mb-4">
            {error || "Streak not found"}
          </p>
          <Link
            to="/dashboard"
            className="text-brand-500 hover:text-brand-400 text-sm font-medium"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );

  const streak = detail.streak;
  const settings = detail.settings;
  const history = detail.history;

  // Check if the current window is completed (user already posted today)
  const windowCompleted = (() => {
    if (!streak.lastActivityAt || !streak.deadline) return false;
    const lastActivity = new Date(streak.lastActivityAt);
    const now = new Date();
    // Compare UTC dates — if last activity is today, window is done
    return (
      lastActivity.toISOString().split("T")[0] ===
      now.toISOString().split("T")[0]
    );
  })();

  const statusStyles: Record<string, string> = {
    active: "bg-status-gentle/10 text-status-gentle border-status-gentle/20",
    pending: "bg-status-firm/10 text-status-firm border-status-firm/20",
    broken: "bg-status-chaos/10 text-status-chaos border-status-chaos/20",
  };

  return (
    <div className="max-w-8xl space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard"
          className="p-2 rounded-xl bg-surface border border-outline hover:bg-outline transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{streak.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusStyles[streak.status]}`}
            >
              {streak.status}
            </span>
            <span className="text-xs text-muted capitalize">
              {streak.type} streak
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-xl bg-surface border border-outline hover:bg-outline transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-muted" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-xl bg-surface border border-status-chaos/20 hover:bg-status-chaos/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-status-chaos" />
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-outline rounded-2xl p-6 text-center"
        >
          <div className="w-12 h-12 bg-brand-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Flame className="w-6 h-6 text-brand-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {streak.currentCount}
          </p>
          <p className="text-xs text-muted mt-1">Current Count</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface border border-outline rounded-2xl p-6 text-center"
        >
          <div className="w-12 h-12 bg-status-gentle/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6 text-status-gentle" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {streak.highestCount}
          </p>
          <p className="text-xs text-muted mt-1">Best Record</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface border border-outline rounded-2xl p-6 text-center"
        >
          <div
            className={`w-12 h-12 ${windowCompleted ? "bg-status-gentle/10" : "bg-brand-400/10"} rounded-xl flex items-center justify-center mx-auto mb-3`}
          >
            <Clock
              className={`w-6 h-6 ${windowCompleted ? "text-status-gentle" : "text-brand-400"}`}
            />
          </div>
          {streak.deadline ? (
            <CountdownTimer
              deadline={streak.deadline}
              completed={windowCompleted}
            />
          ) : (
            <p className="text-xl font-bold text-muted">—</p>
          )}
          <p className="text-xs text-muted mt-1">
            {windowCompleted ? "Next Deadline" : "Time Left"}
          </p>
        </motion.div>
      </div>

      {/* Timeline Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-surface border border-outline rounded-2xl p-6"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted" />
          Timeline
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <TimelineItem label="Created" value={formatDate(streak.createdAt)} />
          <TimelineItem
            label="Started"
            value={streak.startedAt ? formatDate(streak.startedAt) : "—"}
          />
          <TimelineItem
            label="Last Activity"
            value={
              streak.lastActivityAt ? formatDate(streak.lastActivityAt) : "—"
            }
          />
          <TimelineItem
            label="Deadline"
            value={streak.deadline ? formatDate(streak.deadline) : "—"}
          />
        </div>
      </motion.div>

      {/* Break History */}
      {history && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-surface border border-outline rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Last Break
          </h3>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted">Count before break</p>
              <p className="text-lg font-bold text-foreground">
                {history.countBeforeBreak}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Broken at</p>
              <p className="text-sm font-medium text-foreground">
                {formatDate(history.brokenAt)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && settings && (
          <SettingsPanel
            settings={settings}
            streakId={streakId}
            onClose={() => setShowSettings(false)}
            onUpdated={fetchDetail}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <DeleteConfirmDialog
            streakName={streak.name}
            isDeleting={isDeleting}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ======================== Sub-components ======================== */

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function SettingsPanel({
  settings,
  streakId,
  onClose,
  onUpdated,
}: {
  settings: StreakSettings;
  streakId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [form, setForm] = useState<StreakSettingsUpdate>({
    dmReminder: settings.dmReminder,
    abuseLevel: settings.abuseLevel,
    reminderOffsetHours: settings.reminderOffsetHours,
    showInLeaderboard: settings.showInLeaderboard,
  });
  const [isSaving, setIsSaving] = useState(false);

  const motivationOptions: { label: string; icon: LucideIcon; desc: string }[] =
    [
      { label: "Off", icon: VolumeX, desc: "No messages" },
      { label: "Gentle", icon: Heart, desc: "Kind nudges" },
      { label: "Firm", icon: Shield, desc: "Tough love" },
      { label: "Chaos", icon: Flame, desc: "No mercy" },
    ];

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await streakApi.updateSettings(streakId, form);
      onUpdated();
      onClose();
    } catch {
      // Could show error toast
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="bg-surface border border-outline rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-outline bg-background/50">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-brand-500/10">
              <Settings className="w-3.5 h-3.5 text-brand-500" />
            </div>
            Streak Settings
          </h3>
          <button
            onClick={onClose}
            className="text-xs text-muted hover:text-foreground px-2.5 py-1 rounded-lg hover:bg-surface transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-6">
          {/* Notifications Section */}
          <div className="space-y-4">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Notifications
            </p>

            {/* DM Reminder Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  DM Reminders
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Get reminded before your deadline expires
                </p>
              </div>
              <button
                onClick={() =>
                  setForm((f) => ({ ...f, dmReminder: !f.dmReminder }))
                }
                className={`shrink-0 w-12 h-7 rounded-full transition-all duration-200 cursor-pointer relative ${
                  form.dmReminder
                    ? "bg-brand-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                    : "bg-outline"
                }`}
              >
                <span
                  className={`absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full transition-all duration-200 shadow-sm ${
                    form.dmReminder ? "left-[25px]" : "left-[3px]"
                  }`}
                />
              </button>
            </div>

            {/* Reminder Offset */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Reminder Timing
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Hours before deadline to send reminder
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      reminderOffsetHours: Math.max(
                        1,
                        f.reminderOffsetHours - 1,
                      ),
                    }))
                  }
                  className="w-8 h-8 rounded-lg bg-background border border-outline text-muted hover:text-foreground hover:border-brand-500/30 transition-colors cursor-pointer flex items-center justify-center text-sm font-medium"
                >
                  −
                </button>
                <span className="w-10 h-8 rounded-lg bg-background border border-outline flex items-center justify-center text-sm font-semibold text-foreground tabular-nums">
                  {form.reminderOffsetHours}
                </span>
                <button
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      reminderOffsetHours: Math.min(
                        23,
                        f.reminderOffsetHours + 1,
                      ),
                    }))
                  }
                  className="w-8 h-8 rounded-lg bg-background border border-outline text-muted hover:text-foreground hover:border-brand-500/30 transition-colors cursor-pointer flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-outline" />

          {/* Motivation Style */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Motivation Style
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {motivationOptions.map((opt, i) => (
                <button
                  key={opt.label}
                  onClick={() => setForm((f) => ({ ...f, abuseLevel: i }))}
                  className={`group relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                    form.abuseLevel === i
                      ? "bg-brand-500/10 border-brand-500/40 shadow-[0_0_12px_rgba(249,115,22,0.1)]"
                      : "bg-background border-outline hover:border-brand-500/20 hover:bg-brand-500/5"
                  }`}
                >
                  <opt.icon
                    className={`w-5 h-5 ${form.abuseLevel === i ? "text-brand-500" : "text-muted"}`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      form.abuseLevel === i
                        ? "text-brand-500"
                        : "text-foreground"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-muted">{opt.desc}</span>
                  {form.abuseLevel === i && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-outline" />

          {/* Visibility */}
          <div className="space-y-4">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Visibility
            </p>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Show in Leaderboard
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Display your streak rank publicly
                </p>
              </div>
              <button
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    showInLeaderboard: !f.showInLeaderboard,
                  }))
                }
                className={`shrink-0 w-12 h-7 rounded-full transition-all duration-200 cursor-pointer relative ${
                  form.showInLeaderboard
                    ? "bg-brand-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                    : "bg-outline"
                }`}
              >
                <span
                  className={`absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full transition-all duration-200 shadow-sm ${
                    form.showInLeaderboard ? "left-[25px]" : "left-[3px]"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-outline bg-background/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted hover:text-foreground rounded-xl hover:bg-surface transition-colors cursor-pointer font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-brand-900/20 hover:shadow-brand-900/30"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function DeleteConfirmDialog({
  streakName,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  streakName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-surface border border-outline rounded-2xl p-6 max-w-sm w-full"
      >
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Delete streak?
        </h3>
        <p className="text-sm text-muted mb-6">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-foreground">{streakName}</span>?
          This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-status-chaos hover:bg-status-chaos/80 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DetailSkeleton() {
  return (
    <div className="max-w-8xl space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-surface rounded-xl" />
        <div className="flex-1">
          <div className="h-7 w-48 bg-surface rounded-lg" />
          <div className="h-4 w-24 bg-surface rounded-lg mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-outline rounded-2xl h-32"
          />
        ))}
      </div>
      <div className="bg-surface border border-outline rounded-2xl h-24" />
    </div>
  );
}
