import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Flame, LayoutDashboard, LogOut, X, Menu, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ToggleBtn from "@/components/ui/toggleBtn";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  pubkey: string;
}

const navItems = [
  { icon: LayoutDashboard, label: "Overview", to: "/dashboard" as const },
];

export function DashboardSidebar({ pubkey }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const isNavActive = (to: string) => {
    if (to === "/dashboard") {
      return (
        location.pathname === "/dashboard" ||
        location.pathname === "/dashboard/"
      );
    }
    return location.pathname.startsWith(to);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link to="/" className="p-6 flex items-center gap-3 group">
        <div className="relative flex items-center justify-center">
          <Flame className="w-7 h-7 text-brand-500 relative z-10 transition-transform group-hover:scale-110" />
          <div className="absolute inset-0 bg-brand-500 blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground group-hover:text-brand-400 transition-colors">
          Streakstr
        </span>
      </Link>

      {/* Nav Links */}
      <nav className="flex-1 px-3 mt-2 space-y-1">
        {navItems.map((item) => {
          const active = isNavActive(item.to);
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-500/10 text-brand-500"
                  : "text-muted hover:text-foreground hover:bg-surface"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}

        {/* Back to home */}
        <Link
          to="/"
          onClick={() => setIsMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-surface transition-colors mt-4"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </nav>

      {/* Bottom section */}
      <div className="p-4 mt-auto border-t border-outline space-y-4">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between px-3">
          <span className="text-xs text-muted">Theme</span>
          <ToggleBtn />
        </div>

        {/* User */}
        <div className="flex items-center gap-3 px-3">
          <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
            <span className="text-xs font-bold text-brand-500">
              {pubkey.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate font-mono">
              {pubkey.slice(0, 12)}...
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-muted hover:text-status-chaos hover:bg-status-chaos/5 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-64 md:flex-col bg-section border-r border-outline z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed bottom-4 left-4 md:hidden z-50 p-3 bg-brand-600 text-white rounded-full shadow-lg shadow-brand-900/30 cursor-pointer"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-64 bg-section border-r border-outline z-50 md:hidden"
            >
              <button
                onClick={() => setIsMobileOpen(false)}
                className="absolute top-4 right-4 p-1 text-muted hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
