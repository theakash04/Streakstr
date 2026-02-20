import { Link } from "@tanstack/react-router";
import { Bell, Flame, Trophy, Mail } from "lucide-react";
import { motion } from "framer-motion";

interface ConsolidatedStatsProps {
  stats: {
    active: number;
    best: number;
    notifications: number;
    pendingInvites: number;
  };
}

export function ConsolidatedStats({ stats }: ConsolidatedStatsProps) {
  const items = [
    {
      label: "Active Streaks",
      value: stats.active,
      icon: Flame,
      color: "text-brand-500",
      bg: "bg-brand-500/10",
      border: "border-brand-500/20",
      link: "/dashboard/streaks",
    },
    {
      label: "Best Streak",
      value: `${stats.best}d`,
      icon: Trophy,
      color: "text-status-gentle",
      bg: "bg-status-gentle/10",
      border: "border-status-gentle/20",
      link: null, // Just a stat
    },
    {
      label: "Notifications",
      value: stats.notifications,
      icon: Bell,
      color: "text-brand-400",
      bg: "bg-brand-400/10",
      border: "border-brand-400/20",
      link: null, // Could add a logs page later?
    },
    {
      label: "Pending Invites",
      value: stats.pendingInvites,
      icon: Mail,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      link: "/dashboard/invitations",
      highlight: stats.pendingInvites > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {items.map((item, i) => {
        const Content = (
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className={`p-2 sm:p-3 rounded-xl ${item.bg} transition-colors duration-300`}
            >
              <item.icon
                className={`w-5 h-5 sm:w-6 sm:h-6 ${item.color} transition-colors duration-300`}
              />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-foreground transition-colors duration-300">
                {item.value}
              </p>
              <p className="text-xs text-muted font-medium uppercase tracking-wider transition-colors duration-300">
                {item.label}
              </p>
            </div>
            {item.highlight && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500 animate-pulse transition-colors duration-300" />
            )}
          </div>
        );

        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-surface border ${item.highlight ? item.border : "border-outline"} rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:border-opacity-50`}
          >
            {item.link ? (
              <Link to={item.link} className="block w-full h-full">
                {Content}
              </Link>
            ) : (
              Content
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
