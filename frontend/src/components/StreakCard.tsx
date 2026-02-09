import { AlertTriangle, Clock, Flame, XCircle } from "lucide-react";

type StreakStatus = "active" | "warning" | "broken" | "pending";

export interface Streak {
  id: string;
  name: string;
  days: number;
  status: StreakStatus;
  lastActivity?: string;
}

interface StreakCardProps {
  streak: Streak;
  onClick?: (streak: Streak) => void;
}

const statusConfig: Record<
  StreakStatus,
  { color: string; icon: typeof Flame; label: string }
> = {
  active: { color: "var(--color-fire)", icon: Flame, label: "On Fire" },
  warning: {
    color: "var(--color-warning)",
    icon: AlertTriangle,
    label: "Time Running Out",
  },
  broken: { color: "var(--color-danger)", icon: XCircle, label: "Broken" },
  pending: {
    color: "var(--color-pending)",
    icon: Clock,
    label: "Pending",
  },
};

export function StreakCard({ streak, onClick }: StreakCardProps) {
  const config = statusConfig[streak.status];
  const StatusIcon = config.icon;

  return (
    <div
      onClick={() => onClick?.(streak)}
      className="p-5 rounded-2xl bg-surface border border-border hover:border-border-hover transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <StatusIcon className="w-6 h-6" style={{ color: config.color }} />
        </div>
        <span
          className="text-sm font-medium px-2 py-1 rounded-full"
          style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
          {config.label}
        </span>
      </div>

      <h3 className="text-lg font-semibold mb-1">{streak.name}</h3>

      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold" style={{ color: config.color }}>
          {streak.days}
        </span>
        <span className="text-text-secondary">days</span>
      </div>

      {streak.lastActivity && (
        <p className="text-sm text-text-muted mt-2">
          Last: {streak.lastActivity}
        </p>
      )}
    </div>
  );
}
