import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  Check,
  Flame,
  LogOut,
  Home,
  ExternalLink,
  BadgeCheck,
} from "lucide-react";
import { streakApi, type LogEntry } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import ToggleBtn from "@/components/ui/toggleBtn";
import { motion, AnimatePresence } from "framer-motion";

interface TopbarProps {
  pubkey: string;
  user: any;
}

export function DashboardTopbar({ pubkey, user }: TopbarProps) {
  const [notifications, setNotifications] = useState<LogEntry[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await streakApi.getUnreadLogs();
        setNotifications(data.logs);
      } catch {
        // silent fail
      }
    };
    fetchNotifications();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await streakApi.markAllLogsAsRead();
      setNotifications([]);
      setShowDropdown(false);
    } catch {
      // silent fail
    }
  };

  const handleAcknowledge = async (logId: string) => {
    try {
      await streakApi.acknowledgeLogs(logId);
      setNotifications((prev) => prev.filter((n) => n.id !== logId));
    } catch {
      // silent fail
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-outline">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Left: Logo + Home link */}
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="relative flex items-center justify-center">
              <Flame className="w-6 h-6 text-brand-500 relative z-10 transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-brand-500 blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground group-hover:text-brand-400 transition-colors hidden sm:inline">
              STREAKSTR
            </span>
          </Link>

          <div className="h-5 w-px bg-outline hidden sm:block" />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <ToggleBtn />

          {/* Notification Bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowUserMenu(false);
              }}
              className="relative p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-80 bg-surface border border-outline rounded-2xl shadow-2xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-outline">
                    <span className="text-sm font-semibold text-foreground">
                      Notifications
                    </span>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-brand-500 hover:text-brand-400 cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-sm text-muted">All caught up!</p>
                      </div>
                    ) : (
                      notifications.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-background/50 transition-colors border-b border-outline last:border-none"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground font-medium">
                              {log.action}
                            </p>
                            {log.description && (
                              <p className="text-xs text-muted mt-0.5 line-clamp-2">
                                {log.description}
                              </p>
                            )}
                            <p className="text-[10px] text-subtle mt-1">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAcknowledge(log.id)}
                            className="p-1 rounded-lg hover:bg-surface text-muted hover:text-status-gentle transition-colors cursor-pointer shrink-0"
                            title="Acknowledge"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Avatar + Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowDropdown(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface transition-colors cursor-pointer"
            >
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.display_name || user.name || "User"}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-outline"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-brand-500">
                    {(user?.name || pubkey.slice(0, 2))
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </div>
              )}
              <span className="hidden sm:block text-xs font-medium text-foreground max-w-[100px] truncate">
                {user?.display_name ||
                  user?.name ||
                  pubkey.slice(0, 10) + "..."}
              </span>
            </button>

            {/* User Dropdown */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-56 bg-surface border border-outline rounded-xl shadow-2xl overflow-hidden"
                >
                  {/* User profile header */}
                  <div className="px-4 py-3 border-b border-outline">
                    <div className="flex items-center gap-3">
                      {user?.picture ? (
                        <img
                          src={user.picture}
                          alt={user.display_name || user.name || "User"}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-outline shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-brand-500">
                            {(user?.name || pubkey.slice(0, 2))
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {user?.display_name || user?.name || "Anon"}
                        </p>
                        {user?.nip05 && (
                          <p className="text-xs text-brand-500 truncate flex items-center gap-1">
                            <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                            {user.nip05}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] font-mono text-muted mt-2 truncate">
                      {pubkey.slice(0, 20)}...{pubkey.slice(-6)}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    {/* Home link */}
                    <Link
                      to="/"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-foreground hover:bg-background transition-colors"
                    >
                      <Home className="w-4 h-4" />
                      Home
                    </Link>

                    {user?.website && (
                      <a
                        href={user.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-foreground hover:bg-background transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Website
                      </a>
                    )}

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-muted hover:text-status-chaos hover:bg-status-chaos/5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
