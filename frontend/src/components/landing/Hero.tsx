import React from "react";
import { Flame, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import StreakGraph from "@/components/landing/StreakGraph";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 overflow-hidden">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-outline bg-surface/50 backdrop-blur-sm text-sm text-muted mb-8 hover:border-brand-500/50 transition-colors cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            Built on the Nostr Protocol
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-foreground mb-6">
            Build{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-400 via-orange-500 to-red-600">
              Unbreakable
            </span>{" "}
            <br className="hidden sm:block" />
            Habits on Nostr.
          </h1>

          <p className="max-w-2xl mx-auto text-xl text-muted mb-10 leading-relaxed px-2 sm:px-0">
            Streakstr tracks your daily Nostr activity and turns it into
            streaks. Post every day. Keep the streak alive. Break it, and
            everyone knows.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to={"/login"}>
              <Button
                variant="primary"
                className="w-full sm:w-auto text-lg h-14 px-8! shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:shadow-[0_0_30px_rgba(234,88,12,0.5)]"
                icon={<Flame className="w-5 h-5" />}
              >
                Start Your Streak
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Visual Element */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <StreakGraph />
          <div className="mt-4 flex items-center justify-center gap-6 text-sm text-subtle">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>NIP-07 Privacy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-status-gentle rounded-full" />
              <span>No Algorithm</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
