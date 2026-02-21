import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { streakApi, type InteractionStat } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Medal,
  AlertCircle,
  Loader2,
  MessageCircle,
  Heart,
  Zap,
  Users,
  Info,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/interactions")({
  component: InteractionsPage,
});

function InteractionsPage() {
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "all">(
    "monthly",
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["interactions", timeframe],
    queryFn: async () => {
      const resp = await streakApi.getInteractions(timeframe);
      return resp.data.interactions;
    },
    staleTime: 5 * 60 * 1000,
  });

  const containerAnimation = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemAnimation = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
      },
    },
  };

  return (
    <div className="flex-1 w-full max-w-8xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            Top Interactions
            <div className="group relative pt-1">
              <Info className="w-5 h-5 text-muted hover:text-brand-500 transition-colors cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 p-3 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                <h4 className="text-sm font-bold text-gray-900 mb-2 whitespace-nowrap">
                  Point Calculation
                </h4>
                <ul className="text-xs text-gray-600 space-y-1.5 w-full">
                  <li className="flex justify-between items-center w-full">
                    <span>Notes / Mentions</span>
                    <span className="font-semibold text-brand-500">+1 pt</span>
                  </li>
                  <li className="flex justify-between items-center w-full">
                    <span>Reactions</span>
                    <span className="font-semibold text-brand-500">+1 pt</span>
                  </li>
                  <li className="flex justify-between items-center w-full">
                    <span>Replies</span>
                    <span className="font-semibold text-brand-500">+2 pts</span>
                  </li>
                  <li className="flex justify-between items-center w-full">
                    <span>Zaps</span>
                    <span className="font-semibold text-brand-500">+3 pts</span>
                  </li>
                </ul>
              </div>
            </div>
          </h1>
          <p className="text-muted mt-2 text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
            The top 10 Nostr users you interact with the most based on your
            recent notes, replies, reactions, and zaps over the selected
            timeframe.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 w-fit drop-shadow-sm gap-1 relative overflow-hidden gap-4">
        {(["weekly", "monthly", "all"] as const).map((tab) => {
          const isActive = timeframe === tab;

          return (
            <button
              key={tab}
              onClick={() => setTimeframe(tab)}
              className={`relative px-4 py-2 sm:px-6 sm:py-2.5 rounded-lg text-sm font-semibold transition-colors duration-300 capitalize cursor-pointer z-10 ${
                isActive
                  ? "text-brand-600"
                  : "text-muted hover:text-foreground hover:bg-outline/20"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBadge"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm border border-outline/50"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                  style={{ zIndex: -1 }}
                />
              )}
              {tab === "all" ? "All Time" : tab}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 sm:p-24 space-y-4">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-sm font-medium text-muted animate-pulse">
            Analyzing your Nostr interactions...
          </p>
        </div>
      ) : isError ? (
        <div className="bg-status-chaos/10 border border-status-chaos/20 rounded-2xl p-6 sm:p-8 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-status-chaos shrink-0 mt-0.5" />
          <div>
            <h3 className="text-status-chaos font-semibold">
              Failed to load interactions
            </h3>
            <p className="text-status-chaos/80 text-sm mt-1">
              Please try again later or verify your Nostr connection.
            </p>
          </div>
        </div>
      ) : (
        <motion.div
          variants={containerAnimation}
          initial="hidden"
          animate="show"
          className="flex flex-wrap gap-x-6 gap-y-10 sm:gap-x-10 sm:gap-y-12 justify-center sm:justify-start p-4 sm:p-8"
        >
          {!data || data.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center animate-in fade-in duration-300 w-full">
              <Users className="w-12 h-12 text-muted mb-4 opacity-50" />
              <p className="text-muted">No recent interactions found.</p>
            </div>
          ) : (
            data.map((entry: InteractionStat, index: number) => (
              <InteractionRow
                key={index}
                entry={entry}
                index={index}
                itemAnimation={itemAnimation}
              />
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}

function InteractionRow({
  entry,
  index,
  itemAnimation,
}: {
  entry: InteractionStat;
  index: number;
  itemAnimation: any;
}) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const displayName =
    entry.userInfo?.display_name ||
    entry.userInfo?.name ||
    entry.pubkey?.slice(0, 8) ||
    "Unknown User";

  const picture =
    entry.userInfo?.picture ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.pubkey || index}`;

  const getRankDisplay = () => {
    if (index === 0) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (index === 1) return <Medal className="w-4 h-4 text-gray-400" />;
    if (index === 2) return <Medal className="w-4 h-4 text-amber-600" />;
    return (
      <span className="text-xs font-bold text-muted w-4 h-4 flex items-center justify-center">
        {index + 1}
      </span>
    );
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <motion.a
        href={`https://nostria.app/p/${entry.pubkey}`}
        target="_blank"
        rel="noopener noreferrer"
        variants={itemAnimation}
        whileHover={{ y: -5, scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={handleMouseMove}
        className="flex flex-col items-center gap-3 relative group w-28 sm:w-32 cursor-pointer z-10"
      >
        <div className="relative">
          <motion.img
            src={picture}
            alt={displayName}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-outline/30 group-hover:ring-brand-500/80 transition-all duration-300 bg-background shadow-md group-hover:shadow-2xl z-10"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                `https://api.dicebear.com/7.x/bottts/svg?seed=${index}`;
            }}
          />
          {/* Rank Badge */}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface border-2 border-background flex items-center justify-center shadow-sm">
            {getRankDisplay()}
          </div>
        </div>

        <div className="flex flex-col items-center w-full">
          <span className="text-sm font-bold text-foreground truncate w-full text-center group-hover:text-brand-500 transition-colors">
            {displayName}
          </span>
          <span className="text-xs text-brand-500 font-semibold mt-0.5">
            {entry.stats.total} pts
          </span>
        </div>
      </motion.a>

      {/* Hover Portal */}
      <AnimatePresence>
        {isHovering && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed pointer-events-none z-50 bg-white p-5 rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center"
            style={{
              left: mousePos.x + 20,
              top: mousePos.y + 20,
            }}
          >
            {/* User display */}
            <div className="text-center mb-4">
              <h4 className="font-bold text-gray-900 text-lg max-w-[200px] truncate">
                {displayName}
              </h4>
              {entry.userInfo?.nip05 && (
                <p className="text-xs text-brand-500 font-medium max-w-[200px] truncate">
                  {entry.userInfo.nip05}
                </p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4 w-full bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs">Replies</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {entry.stats.replies}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Heart className="w-4 h-4" />
                  <span className="text-xs">Reactions</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {entry.stats.reactions}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs">Zaps</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {entry.stats.zaps}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-gray-700">
                  Total
                </span>
                <span className="text-sm font-black text-brand-500">
                  {entry.stats.total}
                </span>
              </div>
            </div>

            {/* QR Code */}
            {entry.userInfo?.lud16 && (
              <div className="flex flex-col items-center border-t border-gray-100 pt-4 w-full">
                <div className="flex items-center gap-1.5 mb-3 text-yellow-500 font-bold text-[10px] uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Lightning</span>
                </div>
                <div className="bg-white p-2 flex items-center justify-center rounded-xl border border-gray-100 shadow-sm aspect-square">
                  <QRCodeSVG
                    value={`lightning:${entry.userInfo.lud16}`}
                    size={120}
                  />
                </div>
                <p className="text-[10px] text-center mt-3 text-gray-500 font-bold max-w-[160px] break-all leading-tight">
                  {entry.userInfo.lud16}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
