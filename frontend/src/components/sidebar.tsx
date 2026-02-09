import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronRight,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Sun,
  Users,
  X,
} from "lucide-react";
import React, { useMemo, useState, useEffect } from "react";
import SidebarItem from "./SidebarItem";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { StreakItem, useStreaksQuery } from "@/hooks/useStreaks";

type SidebarProps = {
  children: React.ReactNode;
  streaks?: StreakItem[];
  activeStreakId?: string;
  onSelectStreak?: (id: string) => void;
};

export default function Sidebar({ children }: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { data: streaks = [] } = useStreaksQuery();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const routePath = useRouterState({ select: (s) => s.location.pathname });
  const searchString = useRouterState({ select: (s) => s.location.search });
  const activeStreakId = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get("streakId") ?? undefined;
  }, [searchString]);

  useEffect(() => {
    if (routePath.startsWith("/dashboard") && !activeStreakId && streaks[0]) {
      navigate({ to: "/dashboard", search: { streakId: streaks[0].id } });
    }
  }, [routePath, activeStreakId, streaks, navigate]);

  const sidebarItems = useMemo(
    () => [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        isActive: routePath.startsWith("/dashboard"),
        onClick: () =>
          navigate({
            to: "/dashboard",
            search: { streakId: activeStreakId ?? streaks[0]?.id },
          }),
      },
      {
        label: "New Streak",
        icon: Plus,
        isActive: routePath.startsWith("/new"),
        onClick: () => navigate({ to: "/new" }),
      },
    ],
    [routePath, navigate, activeStreakId, streaks],
  );

  async function handleLogout() {
    await logout?.();
    navigate({ to: "/" });
  }

  return (
    <div className="max-h-screen bg-background flex font-sans text-text-primary transition-colors duration-300">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-surface border-r border-border transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0
      `}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate({ to: "/" })}
            >
              <span className="font-bold text-xl tracking-tight">
                Streakstr
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-text-secondary"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="px-4 space-y-1">
            {sidebarItems.map((item) => (
              <SidebarItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={item.isActive}
                onClick={() => {
                  item.onClick();
                  setMobileMenuOpen(false);
                }}
              />
            ))}
          </div>

          <div className="mt-8 px-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Your Streaks
              </h3>
              <span className="text-xs bg-surface-muted px-2 py-0.5 rounded-full text-text-secondary">
                {streaks.length}
              </span>
            </div>
            <div className="space-y-0.5 max-h-[30vh] overflow-y-auto pr-2 -mr-2 custom-scrollbar">
              {streaks.length === 0 ? (
                <p className="text-sm text-text-muted italic py-2">
                  No active streaks
                </p>
              ) : (
                streaks.map((streak) => (
                  <button
                    key={streak.id}
                    onClick={() => {
                      navigate({
                        to: "/dashboard",
                        search: { streakId: streak.id },
                      });
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between text-left py-2 px-2 rounded-md text-sm group transition-colors ${
                      activeStreakId === streak.id
                        ? "bg-surface-muted text-text-primary font-medium"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {streak.type === "solo" ? (
                        <Flame
                          className={`w-3.5 h-3.5 ${
                            activeStreakId === streak.id
                              ? "text-orange-500"
                              : "text-text-muted"
                          }`}
                        />
                      ) : (
                        <Users
                          className={`w-3.5 h-3.5 ${
                            activeStreakId === streak.id
                              ? "text-indigo-500"
                              : "text-text-muted"
                          }`}
                        />
                      )}
                      <span className="truncate max-w-35">{streak.name}</span>
                    </div>
                    {activeStreakId === streak.id && (
                      <ChevronRight className="w-3 h-3 text-text-muted" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-auto p-4 border-t border-border bg-surface-muted/30">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={user?.user?.picture}
                alt={user?.user?.name}
                className="w-10 h-10 rounded-full border border-border bg-surface object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {user?.user?.name}
                </p>
                <p className="text-xs text-text-muted truncate">
                  @{user?.user?.name?.toLowerCase().replace(/\s/g, "")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleTheme}
                className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover text-xs font-medium transition-colors cursor-pointer"
              >
                {isDark ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                {theme}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-surface border border-red-200 dark:border-red-900/30 text-danger hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">Streakstr</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-text-primary"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 w-full mx-auto p-4 md:p-8 lg:p-12">
          {children}
        </main>
      </div>
    </div>
  );
}
