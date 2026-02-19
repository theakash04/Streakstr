import { useState, useEffect, useMemo, useCallback } from "react";
import { streakApi, type ActivityLog } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ActivityGraph() {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    posts: number;
    active: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setIsLoading(true);
        const { data } = await streakApi.getActivity(year);
        setActivity(data.activityLogs);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivity();
  }, [year]);

  const activityMap = useMemo(() => {
    const map = new Map<string, ActivityLog>();
    for (const log of activity) {
      map.set(log.date, log);
    }
    return map;
  }, [activity]);

  // Generate all weeks for the year (Sun-Sat columns)
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    const start = new Date(year, 0, 1);
    const firstSunday = new Date(start);
    firstSunday.setDate(firstSunday.getDate() - firstSunday.getDay());

    const end = new Date(year, 11, 31);
    const current = new Date(firstSunday);

    while (current <= end) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      result.push(week);
    }

    return result;
  }, [year]);

  const getColor = useCallback(
    (date: Date) => {
      const dateStr = formatDateKey(date);
      const log = activityMap.get(dateStr);
      if (!log || log.postCount === 0) return "cell-empty";
      if (log.streakActive && log.postCount > 3) return "cell-high";
      if (log.streakActive && log.postCount > 1) return "cell-med";
      if (log.streakActive) return "cell-low";
      return "cell-min";
    },
    [activityMap],
  );

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks.length; w++) {
      const relevantDay = weeks[w].find((d) => d.getFullYear() === year);
      if (!relevantDay) continue;
      const month = relevantDay.getMonth();
      if (month !== lastMonth) {
        labels.push({
          label: relevantDay.toLocaleDateString("en-US", { month: "short" }),
          col: w,
        });
        lastMonth = month;
      }
    }
    return labels;
  }, [weeks, year]);

  // Stats summary
  const stats = useMemo(() => {
    let totalPosts = 0;
    let activeDays = 0;
    for (const log of activity) {
      totalPosts += log.postCount;
      if (log.postCount > 0) activeDays++;
    }
    return { totalPosts, activeDays };
  }, [activity]);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleCellHover = (
    e: React.MouseEvent,
    date: Date,
    isCurrentYear: boolean,
  ) => {
    if (!isCurrentYear) return;
    const dateStr = formatDateKey(date);
    const log = activityMap.get(dateStr);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      date: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      posts: log?.postCount ?? 0,
      active: log?.streakActive ?? false,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-surface border border-outline rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-5 w-24 bg-background rounded-lg animate-pulse" />
          <div className="ml-auto h-4 w-32 bg-background rounded-lg animate-pulse" />
        </div>
        <div className="h-[120px] bg-background rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-surface border border-outline rounded-2xl p-4 sm:p-6 relative">
      {/* Header: Year nav + stats + legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        {/* Year navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors cursor-pointer"
            aria-label="Previous year"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-foreground tabular-nums min-w-[3ch] text-center">
            {year}
          </span>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= new Date().getFullYear()}
            className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label="Next year"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Inline stats */}
          <div className="hidden sm:flex items-center gap-3 ml-3 pl-3 border-l border-outline">
            <span className="text-xs text-muted">
              <span className="font-semibold text-foreground">
                {stats.totalPosts}
              </span>{" "}
              posts
            </span>
            <span className="text-xs text-muted">
              <span className="font-semibold text-foreground">
                {stats.activeDays}
              </span>{" "}
              active days
            </span>
          </div>
        </div>

        {/* Legend  */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted">
          <span>Less</span>
          <span className="w-[10px] h-[10px] rounded-[3px] bg-surface border border-outline/50" />
          <span className="w-[10px] h-[10px] rounded-[3px] bg-brand-500/15" />
          <span className="w-[10px] h-[10px] rounded-[3px] bg-brand-500/40" />
          <span className="w-[10px] h-[10px] rounded-[3px] bg-brand-500/70" />
          <span className="w-[10px] h-[10px] rounded-[3px] bg-brand-500" />
          <span>More</span>
        </div>
      </div>

      {/* Mobile stats */}
      <div className="flex sm:hidden items-center gap-4 mb-4 text-xs text-muted">
        <span>
          <span className="font-semibold text-foreground">
            {stats.totalPosts}
          </span>{" "}
          posts
        </span>
        <span>
          <span className="font-semibold text-foreground">
            {stats.activeDays}
          </span>{" "}
          active days
        </span>
      </div>

      {/* Graph */}
      <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 pb-2">
        <div
          className="inline-flex gap-[3px]"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Day labels column */}
          <div className="flex flex-col gap-[3px] mr-1.5 pt-[18px]">
            {dayLabels.map((label, i) => (
              <div
                key={i}
                className="h-[11px] flex items-center text-[10px] text-subtle leading-none select-none"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Weeks grid */}
          <div>
            {/* Month labels */}
            <div className="flex gap-[3px] mb-[3px] h-[14px]">
              {weeks.map((_, w) => {
                const monthLabel = monthLabels.find((m) => m.col === w);
                return (
                  <div
                    key={w}
                    className="w-[11px] text-[10px] text-subtle leading-none select-none"
                  >
                    {monthLabel?.label || ""}
                  </div>
                );
              })}
            </div>

            {/* Cells */}
            <div className="flex gap-[3px]">
              {weeks.map((week, w) => (
                <div key={w} className="flex flex-col gap-[3px]">
                  {week.map((date, d) => {
                    const isCurrentYear = date.getFullYear() === year;
                    const colorClass = isCurrentYear
                      ? getColor(date)
                      : "cell-outside";
                    return (
                      <div
                        key={d}
                        className={`activity-cell ${colorClass}`}
                        onMouseEnter={(e) =>
                          handleCellHover(e, date, isCurrentYear)
                        }
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-foreground text-background text-[11px] px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap font-medium">
            <span className="font-bold">
              {tooltip.posts} {tooltip.posts === 1 ? "post" : "posts"}
            </span>
            {tooltip.active && <span className="text-brand-400 ml-1">🔥</span>}
            <span className="block text-[10px] opacity-70 font-normal">
              {tooltip.date}
            </span>
          </div>
        </div>
      )}

      <style>{`
        .activity-cell {
          width: 11px;
          height: 11px;
          border-radius: 3px;
          transition: all 0.15s ease;
        }
        .activity-cell:hover {
          transform: scale(1.4);
          outline: 2px solid var(--color-brand-500);
          outline-offset: 1px;
          z-index: 10;
          position: relative;
        }
        .cell-empty {
          background-color: var(--color-surface);
          border: 1px solid color-mix(in srgb, var(--color-outline) 50%, transparent);
        }
        .cell-min {
          background-color: color-mix(in srgb, var(--color-brand-500) 15%, transparent);
        }
        .cell-low {
          background-color: color-mix(in srgb, var(--color-brand-500) 40%, transparent);
        }
        .cell-med {
          background-color: color-mix(in srgb, var(--color-brand-500) 70%, transparent);
        }
        .cell-high {
          background-color: var(--color-brand-500);
        }
        .cell-outside {
          background-color: transparent;
        }

        @media (min-width: 640px) {
          .activity-cell {
            width: 12px;
            height: 12px;
          }
        }
      `}</style>
    </div>
  );
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
