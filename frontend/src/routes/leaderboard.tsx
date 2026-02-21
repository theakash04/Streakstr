import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { publicApi, type LeaderboardEntry } from "@/lib/api";
import { motion } from "framer-motion";
import {
  Trophy,
  Medal,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  Crown,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leaderboard", "top10"],
    queryFn: async () => {
      const resp = await publicApi.getLeaderboard();
      return resp.data.leaderboard;
    },
    staleTime: 5 * 60 * 1000,
  });

  const containerAnimation = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemAnimation = {
    hidden: { y: 10, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-brand-500/30">
      <Navbar />

      <main className="flex-1 w-full max-w-8xl mx-auto px-4 pt-24 pb-16">
        {/* Header Section */}
        <div className="text-center space-y-2 mb-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center p-3 rounded-full bg-brand-500/10 mb-2 mt-4"
          >
            <Crown className="w-8 h-8 text-brand-500" />
          </motion.div>

          <motion.h1
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-5xl font-black tracking-tight"
          >
            Top Streaks
          </motion.h1>

          <motion.p
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted text-sm md:text-base max-w-lg mx-auto"
          >
            The dedicated few keeping the fire burning across the Nostr
            ecosystem.
          </motion.p>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-in fade-in duration-500">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-muted text-sm font-medium">
              Loading rankings...
            </p>
          </div>
        ) : isError ? (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 flex flex-col items-center text-center space-y-3 animate-in fade-in duration-300">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <p className="text-sm font-medium text-red-500">
              Failed to load the leaderboard.
            </p>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center animate-in fade-in duration-300">
            <Trophy className="w-12 h-12 text-muted mb-4 opacity-50" />
            <p className="text-muted">No active streaks found.</p>
          </div>
        ) : (
          <motion.div
            variants={containerAnimation}
            initial="hidden"
            animate="show"
            className="bg-surface/50 border border-outline rounded-3xl shadow-sm backdrop-blur-xl group/list"
          >
            <div className="divide-y divide-outline/50">
              {data.map((entry: LeaderboardEntry, index: number) => {
                const displayName =
                  entry.userInfo?.display_name ||
                  entry.userInfo?.name ||
                  entry.userInfo?.pubkey?.slice(0, 8) ||
                  "Unknown User";

                const picture =
                  entry.userInfo?.picture ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.userInfo?.pubkey || index}`;

                const getRankDisplay = () => {
                  if (index === 0)
                    return <Trophy className="w-5 h-5 text-yellow-500" />;
                  if (index === 1)
                    return <Medal className="w-5 h-5 text-gray-400" />;
                  if (index === 2)
                    return <Medal className="w-5 h-5 text-amber-600" />;
                  return (
                    <span className="text-sm font-bold text-muted w-5 text-center">
                      {index + 1}
                    </span>
                  );
                };

                return (
                  <motion.a
                    key={index}
                    href={`https://nostria.app/p/${entry.userInfo?.pubkey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variants={itemAnimation}
                    className="flex items-center gap-4 p-3 sm:px-6 sm:py-4 transition-colors hover:bg-outline/30 group first:rounded-t-3xl last:rounded-b-3xl"
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center w-8 shrink-0">
                      {getRankDisplay()}
                    </div>

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={picture}
                        alt={displayName}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-1 ring-outline/50 bg-background"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${index}`;
                        }}
                      />
                      {index === 0 && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-500 border border-background rounded-full" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm sm:text-base font-bold text-foreground truncate group-hover:text-brand-400 transition-colors">
                          {displayName}
                        </span>
                        {entry.userInfo?.nip05 && (
                          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-brand-500/10 text-[10px] font-medium text-brand-500 truncate max-w-[150px]">
                            {entry.userInfo.nip05}
                          </span>
                        )}
                      </div>
                      {entry.userInfo?.nip05 && (
                        <p className="sm:hidden text-xs text-muted truncate mt-0.5">
                          {entry.userInfo.nip05}
                        </p>
                      )}
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end justify-center">
                        <span className="text-xl sm:text-2xl font-black tabular-nums tracking-tight">
                          {entry.currentCount} Days
                        </span>
                      </div>

                      <div className="hidden sm:flex items-center gap-2">
                        {entry.userInfo?.lud16 && (
                          <div className="relative">
                            <div className="absolute right-20 top-1/2 -translate-y-1/2 mr-8 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 bg-white p-3 rounded-2xl shadow-xl border border-gray-100 scale-95 group-hover:scale-100 origin-right flex flex-col items-center">
                              <QRCodeSVG
                                value={`lightning:${entry.userInfo.lud16}`}
                                size={160}
                              />
                              <p className="text-[10px] text-center mt-2 text-gray-800 font-bold max-w-[96px] break-all leading-tight">
                                {entry.userInfo.lud16}
                              </p>
                            </div>
                          </div>
                        )}
                        <LinkIcon className="w-4 h-4 text-muted opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </div>
                    </div>
                  </motion.a>
                );
              })}
            </div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
