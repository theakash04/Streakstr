import { useState, useEffect, useMemo, useCallback } from "react";
import { streakApi, type ActivityLog } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ActivityGraph() {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    posts: number;
    active: boolean;
    show: boolean;
  }>({ x: 0, y: 0, date: "", posts: 0, active: false, show: false });

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
        setIsInitialLoad(false);
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
      y: rect.top,
      date: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      posts: log?.postCount ?? 0,
      active: log?.streakActive ?? false,
      show: true,
    });
  };

  const handleCellLeave = () => {
    setTooltip((prev) => ({ ...prev, show: false }));
  };

  if (isInitialLoad) {
    return (
      <div className="bg-surface border border-outline rounded-2xl p-4 sm:p-6 transition-colors duration-300">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="h-6 w-24 bg-background rounded-lg animate-pulse" />
            <div className="h-5 w-32 bg-background rounded-lg animate-pulse hidden sm:block" />
          </div>
          <div className="h-4 w-24 bg-background rounded-lg animate-pulse hidden sm:block" />
        </div>
        <div className="flex gap-[3px] overflow-hidden opacity-40 grayscale">
          <div className="flex flex-col gap-[3px] mr-1.5 pt-[18px]">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-[11px] w-6 bg-background rounded-[3px] animate-pulse"
              />
            ))}
          </div>
          <div className="flex gap-[3px]">
            {Array.from({ length: 52 }).map((_, w) => (
              <div key={w} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }).map((_, d) => (
                  <div
                    key={d}
                    className="w-[11px] h-[11px] rounded-[3px] bg-background animate-pulse"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-outline rounded-2xl p-4 sm:p-6 relative transition-colors duration-300 overflow-hidden group">
      {/* Decorative Gradient Background */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none transition-opacity duration-500 group-hover:opacity-75 opacity-40 mix-blend-screen" />

      {/* Header: Year nav + stats + legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 relative z-10">
        {/* Year navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors duration-300 cursor-pointer"
            aria-label="Previous year"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-foreground tabular-nums min-w-[3ch] text-center transition-colors duration-300">
            {year}
          </span>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= new Date().getFullYear()}
            className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors duration-300 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label="Next year"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Inline stats */}
          <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-outline transition-colors duration-300">
            <span className="text-[11px] font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/50 border border-outline/30 text-muted transition-colors duration-300 hover:bg-background/80 hover:text-foreground">
              <span className="font-bold text-foreground transition-colors duration-300">
                {stats.totalPosts}
              </span>{" "}
              posts
            </span>
            <span className="text-[11px] font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/50 border border-outline/30 text-muted transition-colors duration-300 hover:bg-background/80 hover:text-foreground">
              <span className="font-bold text-foreground transition-colors duration-300">
                {stats.activeDays}
              </span>{" "}
              active days
            </span>
          </div>
        </div>

        {/* Legend  */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted transition-colors duration-300">
          <span>Less</span>
          <span className="w-[10px] h-[10px] rounded-[3px] bg-surface border border-outline/50 transition-colors duration-300" />
          <span className="w-[10px] h-[10px] rounded-[3px] bg-brand-500/15 transition-colors duration-300" />
          <span className="w-[10px] h-[10px] rounded-[3px] bg-brand-500/40 transition-colors duration-300" />
          <span className="w-[10px] h-[10px] rounded-[3px] bg-brand-500/70 transition-colors duration-300" />
          <span className="w-[10px] h-[10px] rounded-[3px] bg-brand-500 shadow-[0_0_8px_rgba(var(--color-brand-500),0.3)] transition-colors duration-300" />
          <span>More</span>
        </div>
      </div>

      {/* Mobile stats */}
      <div className="flex sm:hidden items-center gap-2 mb-4 text-xs text-muted transition-colors duration-300">
        <span className="text-[11px] font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/50 border border-outline/30 text-muted transition-colors duration-300">
          <span className="font-bold text-foreground transition-colors duration-300">
            {stats.totalPosts}
          </span>{" "}
          posts
        </span>
        <span className="text-[11px] font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/50 border border-outline/30 text-muted transition-colors duration-300">
          <span className="font-bold text-foreground transition-colors duration-300">
            {stats.activeDays}
          </span>{" "}
          active days
        </span>
      </div>

      {/* Graph with horizontal scroll */}
      <div className="relative -mx-4 sm:-mx-6 mt-2">
        {/* Scroll Indicators (Mobile) */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-surface to-transparent z-10 pointer-events-none sm:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-surface to-transparent z-10 pointer-events-none sm:hidden" />

        <div className="overflow-x-auto px-4 sm:px-6 pb-4 scrollbar-hide snap-x">
          <div
            className={`inline-flex gap-[3px] transition-all duration-500 ease-in-out origin-left pr-4 ${
              isLoading
                ? "opacity-40 grayscale blur-[1px] pointer-events-none scale-[0.99]"
                : "opacity-100 scale-100"
            }`}
            onMouseLeave={handleCellLeave}
          >
            {/* Day labels column */}
            <div className="flex flex-col gap-[3px] mr-1.5 pt-[18px]">
              {dayLabels.map((label, i) => (
                <div
                  key={i}
                  className="h-[11px] flex items-center text-[10px] text-subtle leading-none select-none transition-colors duration-300"
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
                      className="w-[11px] text-[10px] text-subtle leading-none select-none transition-colors duration-300"
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
                          onMouseLeave={handleCellLeave}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          left: tooltip.x,
          top: tooltip.y,
          transform: "translate(-50%, -100%)",
        }}
        aria-hidden="true"
      >
        <div
          className={`transition-all duration-200 ease-out will-change-transform ${
            tooltip.show
              ? "opacity-100 scale-100 translate-y-[-8px]"
              : "opacity-0 scale-95 translate-y-0"
          } bg-foreground text-background px-3 py-1.5 rounded-xl shadow-2xl flex flex-col items-center gap-0.5 relative`}
        >
          <div className="flex items-center gap-1.5 font-medium">
            <span className="font-bold text-xs">
              {tooltip.posts} {tooltip.posts === 1 ? "post" : "posts"}
            </span>
            {tooltip.active && (
              <span className="text-brand-400 text-xs text-shadow-glow">
                🔥
              </span>
            )}
          </div>
          <span className="text-[10px] text-background/80 font-medium">
            {tooltip.date}
          </span>
          {/* Bottom Arrow */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45 rounded-[2px]" />
        </div>
      </div>

      <style>{`
        .activity-cell {
          width: 11px;
          height: 11px;
          border-radius: 3px;
          transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
        }
        .activity-cell:hover {
          transform: scale(1.35);
          z-index: 10;
          position: relative;
          box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-brand-500);
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
          box-shadow: 0 0 6px color-mix(in srgb, var(--color-brand-500) 50%, transparent);
        }
        .cell-outside {
          background-color: transparent;
        }

        @media (min-width: 640px) {
          .activity-cell {
            width: 12px;
            height: 12px;
            border-radius: 4px;
          }
        }
        .text-shadow-glow {
          text-shadow: 0 0 8px color-mix(in srgb, var(--color-brand-400) 40%, transparent);
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
