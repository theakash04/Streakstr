import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-4">
      <motion.div className="text-center">
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="inline-block mb-6"
        >
          <Flame className="w-20 h-20 text-brand-500 opacity-30" />
        </motion.div>

        <h1 className="text-8xl font-black text-brand-500 tracking-tight">
          404
        </h1>

        <p className="text-2xl font-semibold text-body mt-4">
          You broke your streak… of finding pages.
        </p>

        <p className="text-muted mt-2 text-sm">
          This page ghosted you harder than your gym routine.
        </p>

        <Link
          to="/"
          className="inline-block mt-8 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors"
        >
          Back to safety
        </Link>
      </motion.div>
    </div>
  );
}
