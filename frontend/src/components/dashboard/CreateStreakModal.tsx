import { useState } from "react";
import { X, Flame, Loader2 } from "lucide-react";
import { streakApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface CreateStreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateStreakModal({
  isOpen,
  onClose,
  onCreated,
}: CreateStreakModalProps) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Streak name is required");
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      await streakApi.createSolo(name.trim());
      setName("");
      onCreated();
      onClose();
    } catch {
      setError("Failed to create streak");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      handleCreate();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className="bg-surface border border-outline rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center">
                  <Flame className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    New Streak
                  </h2>
                  <p className="text-xs text-muted">Start a new solo streak</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Streak Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., Daily Nostr Post"
                  autoFocus
                  className="w-full bg-background border border-outline rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 transition-colors"
                />
              </div>

              {error && <p className="text-xs text-status-chaos">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm text-muted hover:text-foreground border border-outline rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isCreating || !name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Streak"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
