import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  User as UserIcon,
  type LucideIcon,
} from "lucide-react";
import {
  streakApi,
  type StreakSettings,
  type StreakSettingsUpdate,
} from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { CountdownTimer } from "@/components/dashboard/CountdownTimer";
import { useNostrProfile } from "@/hooks/useNostrProfile";
import { nip19 } from "nostr-tools";

export const Route = createFileRoute("/dashboard/$streakId")({
  component: StreakDetailPage,
});

function StreakDetailPage() {
  const { streakId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: detail,
    isLoading,
    error,
    refetch: fetchDetail,
  } = useQuery({
    queryKey: ["streak", streakId],
    queryFn: async () => {
      const { data } = await streakApi.getSingle(streakId);
      return data.streak;
    },
  });

  // Partner determination for duo streaks
  const partnerPubkey = useMemo(() => {
    if (!detail || !user?.pubkey || detail.streak.type !== "duo") return null;
    const { user1Pubkey, user2Pubkey } = detail.streak;
    return user1Pubkey === user.pubkey ? user2Pubkey : user1Pubkey;
  }, [detail, user?.pubkey]);

  // Fetch partner's profile
  const { profile: partnerProfile, isLoading: isLoadingProfile } =
    useNostrProfile(partnerPubkey);

  // Fetch user's profile
  const { profile: userProfile } = useNostrProfile(user?.pubkey);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await streakApi.deleteStreak(streakId);
      window.location.href = "/dashboard";
    } catch {
      window.dispatchEvent(
        new CustomEvent("api-error", {
          detail: { message: "Failed to delete streak" },
        }),
      );
      setIsDeleting(false);
    }
  };

  if (isLoading) return <DetailSkeleton />;
  if (error || !detail)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-status-chaos mb-4">
            {error instanceof Error ? error.message : "Streak not found"}
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
    <div className="max-w-8xl space-y-6 sm:space-y-8">
      {/* Back + Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <Link
            to="/dashboard"
            className="p-2.5 rounded-xl bg-surface border border-outline hover:bg-outline transition-colors mt-1 shrink-0 group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-muted group-hover:text-foreground transition-colors group-hover:-translate-x-0.5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight truncate">
              {streak.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-widest ${statusStyles[streak.status]}`}
              >
                {streak.status}
              </span>
              <span className="text-sm font-medium text-muted capitalize px-3 py-1 bg-surface border border-outline rounded-full">
                {streak.type} streak
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {streak.status !== "broken" && (
            <button
              onClick={() => {
                console.log("Settings clicked");
                setShowSettings(!showSettings);
              }}
              className="p-2.5 rounded-xl bg-surface border border-outline hover:bg-outline hover:text-foreground transition-colors cursor-pointer"
            >
              <Settings className="w-5 h-5 text-muted" />
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2.5 rounded-xl bg-surface border border-status-chaos/20 hover:bg-status-chaos/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-5 h-5 text-status-chaos" />
          </button>
        </div>
      </div>

      {/* Duo Streak Banner & Timer */}
      {streak.type === "duo" && partnerPubkey && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden bg-surface border ${
            windowCompleted ? "border-status-gentle/30" : "border-brand-500/30"
          } rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center shadow-lg group`}
        >
          {/* Subtle Background Glow */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-full bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] ${windowCompleted ? "from-status-gentle/20 via-transparent to-transparent" : "from-brand-500/20 via-transparent to-transparent"} pointer-events-none opacity-60`}
          />

          <div className="flex flex-row items-center justify-between w-full max-w-2xl relative z-10 gap-2 sm:gap-4">
            {/* User */}
            <div
              className="flex flex-col items-center gap-3 w-1/3 cursor-pointer"
              onClick={() =>
                window.open(
                  `https://nostria.app/p/${nip19.npubEncode(user?.pubkey)}`,
                  "_blank",
                )
              }
            >
              <Avatar
                profile={userProfile}
                pubkey={user?.pubkey}
                className="w-16 h-16 sm:w-24 sm:h-24 ring-4 ring-background shadow-xl rounded-full transition-transform "
              />
              <span className="text-sm sm:text-base font-bold text-foreground bg-background/80 px-4 py-1.5 rounded-full border border-outline backdrop-blur-sm shadow-sm">
                You
              </span>
            </div>

            {/* Connection / Timer */}
            <div className="flex flex-col items-center justify-center w-1/3 min-w-[120px] sm:min-w-[160px]">
              <div
                className={`flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 mb-4 rounded-full shadow-inner border transition-transform duration-500 ${
                  windowCompleted
                    ? "bg-status-gentle/10 text-status-gentle border-status-gentle/20"
                    : "bg-brand-500/10 text-brand-500 border-brand-500/20"
                }`}
              >
                {windowCompleted ? (
                  <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
                ) : (
                  <Flame className="w-6 h-6 sm:w-8 sm:h-8" />
                )}
              </div>

              <div className="text-xl sm:text-4xl font-black tracking-tighter text-foreground whitespace-nowrap mb-1 flex items-center justify-center drop-shadow-sm">
                {streak.deadline ? (
                  <CountdownTimer
                    deadline={streak.deadline}
                    completed={windowCompleted}
                  />
                ) : (
                  <span className="text-muted">—</span>
                )}
              </div>
              <span
                className={`text-[10px] sm:text-sm font-bold uppercase tracking-widest text-center ${windowCompleted ? "text-status-gentle" : "text-brand-500"}`}
              >
                {windowCompleted ? "Next Deadline" : "Time Left"}
              </span>
            </div>

            {/* Partner */}
            <div
              className="flex flex-col items-center gap-3 w-1/3 cursor-pointer"
              onClick={() =>
                window.open(
                  `https://nostria.app/p/${nip19.npubEncode(partnerPubkey)}`,
                  "_blank",
                )
              }
            >
              <Avatar
                profile={partnerProfile}
                pubkey={partnerPubkey}
                isLoading={isLoadingProfile}
                className="w-16 h-16 sm:w-24 sm:h-24 ring-4 ring-background shadow-xl rounded-full transition-transform"
              />
              <span className="text-sm sm:text-base font-bold text-foreground bg-background/80 px-4 py-1.5 rounded-full border border-outline backdrop-blur-sm shadow-sm max-w-[100px] sm:max-w-[160px] truncate text-center">
                {isLoadingProfile
                  ? "..."
                  : partnerProfile?.name ||
                    nip19.npubEncode(partnerPubkey).slice(0, 8)}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats & Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Current & Best Record Unified Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-outline rounded-3xl p-6 sm:p-8 flex flex-col justify-center relative overflow-hidden group hover:border-brand-500/30 transition-colors shadow-sm"
        >
          <div className="flex items-center justify-around w-full relative z-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-brand-500/10 text-brand-500 rounded-2xl flex items-center justify-center mb-3 shadow-inner border border-brand-500/20">
                <Flame className="w-6 h-6" />
              </div>
              <p className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">
                {streak.currentCount}
              </p>
              <p className="text-[10px] sm:text-xs font-semibold text-muted mt-2 uppercase tracking-widest">
                Current Count
              </p>
            </div>

            <div className="w-px h-24 bg-outline/50 hidden sm:block mx-4" />

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-status-gentle/10 text-status-gentle rounded-2xl flex items-center justify-center mb-3 shadow-inner border border-status-gentle/20">
                <Trophy className="w-6 h-6" />
              </div>
              <p className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">
                {streak.highestCount}
              </p>
              <p className="text-[10px] sm:text-xs font-semibold text-muted mt-2 uppercase tracking-widest">
                Best Record
              </p>
            </div>
          </div>
        </motion.div>

        {/* Timeline Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface border border-outline rounded-3xl p-6 sm:p-8 flex flex-col justify-center shadow-sm hover:border-outline/80 transition-colors"
        >
          <h3 className="text-sm sm:text-base font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface border border-outline flex items-center justify-center shadow-inner">
              <Calendar className="w-4 h-4 text-muted" />
            </div>
            Timeline
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <TimelineItem
              label="Created"
              value={formatDate(streak.createdAt)}
            />
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

        {/* Solo Streak Timer (Only show here if NOT a duo streak to avoid duplicate) */}
        {streak.type !== "duo" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`bg-linear-to-br from-surface ${windowCompleted ? "to-status-gentle/5" : "to-brand-400/5"} border border-outline rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-outline transition-colors ${history ? "lg:col-span-1" : "lg:col-span-2"}`}
          >
            <div
              className={`absolute -right-4 -top-4 w-32 h-32 ${windowCompleted ? "bg-status-gentle/10" : "bg-brand-400/10"} rounded-full blur-2xl transition-colors`}
            />
            <div
              className={`w-14 h-14 ${windowCompleted ? "bg-status-gentle/10 text-status-gentle border-status-gentle/20" : "bg-brand-400/10 text-brand-400 border-brand-400/20"} rounded-2xl flex items-center justify-center mb-4 relative z-10 shadow-inner border`}
            >
              <Clock className="w-7 h-7" />
            </div>
            <div className="relative z-10 flex items-center justify-center text-3xl sm:text-4xl font-black tracking-tight w-full h-12">
              {streak.deadline ? (
                <CountdownTimer
                  deadline={streak.deadline}
                  completed={windowCompleted}
                />
              ) : (
                <p className="text-muted">—</p>
              )}
            </div>
            <p className="text-[10px] sm:text-xs font-semibold text-muted mt-3 relative z-10 uppercase tracking-widest">
              {windowCompleted ? "Next Deadline" : "Time Left"}
            </p>
          </motion.div>
        )}

        {/* Break History */}
        {history && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`bg-linear-to-br from-status-chaos/5 to-surface border border-status-chaos/10 rounded-3xl p-6 sm:p-8 flex flex-col justify-center relative overflow-hidden shadow-sm ${streak.type === "duo" ? "lg:col-span-2" : "lg:col-span-1"}`}
          >
            <div className="absolute -top-4 -right-4 p-8 opacity-5 pointer-events-none">
              <Trophy className="w-32 h-32 text-status-chaos" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2.5 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-status-chaos/10 border border-status-chaos/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-status-chaos" />
              </div>
              Last Break
            </h3>
            <div className="flex flex-row gap-8 sm:gap-12 relative z-10">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Count before
                </p>
                <p className="text-2xl sm:text-4xl font-black text-status-chaos tracking-tighter">
                  {history.countBeforeBreak}
                </p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Broken at
                </p>
                <p className="text-sm sm:text-lg font-bold text-foreground mt-1">
                  {formatDate(history.brokenAt)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && settings && (
          <SettingsPanel
            settings={settings}
            streakId={streakId}
            onClose={() => setShowSettings(false)}
            onUpdated={fetchDetail}
            streakType={streak.type}
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

function Avatar({
  profile,
  className = "",
  isLoading,
}: {
  profile?: any;
  pubkey?: string;
  isLoading?: boolean;
  className?: string;
}) {
  if (isLoading)
    return (
      <div
        className={`animate-pulse bg-surface border border-outline ${className}`}
      />
    );
  if (profile?.picture) {
    return (
      <>
        <img
          src={profile.picture}
          alt={profile.name || "User avatar"}
          className={`object-cover bg-surface border border-outline ${className}`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            const next = (e.target as HTMLImageElement)
              .nextElementSibling as HTMLElement;
            if (next) {
              next.style.display = "flex";
            }
          }}
        />
        <div
          style={{ display: "none" }}
          className={`bg-brand-500/10 flex-col items-center justify-center border border-brand-500/20 text-brand-500 ${className}`}
        >
          <UserIcon className="w-1/2 h-1/2" />
        </div>
      </>
    );
  }
  return (
    <div
      className={`bg-brand-500/10 flex flex-col items-center justify-center border border-brand-500/20 text-brand-500 ${className}`}
    >
      <UserIcon className="w-1/2 h-1/2" />
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] sm:text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm sm:text-base font-bold text-foreground">{value}</p>
    </div>
  );
}

function SettingsPanel({
  settings,
  streakId,
  onClose,
  onUpdated,
  streakType,
}: {
  settings: StreakSettings;
  streakId: string;
  onClose: () => void;
  onUpdated: () => void;
  streakType: "duo" | "solo";
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-surface border border-outline rounded-2xl w-full max-w-lg overflow-hidden my-auto flex flex-col max-h-[90vh] shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-outline bg-background/50 shrink-0">
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

        <div className="px-5 sm:px-6 py-5 space-y-6 overflow-y-auto">
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
          {streakType === "solo" && (
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
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-outline bg-background/50 shrink-0">
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
      </motion.div>
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
