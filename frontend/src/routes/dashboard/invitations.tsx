import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Check, X, Users, Loader2, Mail, User } from "lucide-react";
import { streakApi, type Streak } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useApiErrorToast } from "@/hooks/useApiErrorToast";
import { useToast } from "@/components/ui/Toast";

export const Route = createFileRoute("/dashboard/invitations")({
  component: InvitationsPage,
});

function InvitationsPage() {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const toast = useToast();

  const { user } = Route.useRouteContext() as { user: { pubkey: string } };

  useApiErrorToast();

  const fetchStreaks = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await streakApi.getAll();
      setStreaks(res.data.streaks);
    } catch {
      // handled by interceptor
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  const handleRespond = async (
    streakId: string,
    action: "accept" | "decline",
  ) => {
    try {
      setRespondingId(streakId);
      await streakApi.respondToInvitation(action, { streakId });
      toast.success(
        action === "accept" ? "Duo streak accepted! 🔥" : "Invitation declined",
      );
      await fetchStreaks();
    } catch {
      toast.error("Failed to respond to invitation");
    } finally {
      setRespondingId(null);
    }
  };

  // Pending invitations where current user is the invitee (user2)
  const pendingInvitations = streaks.filter(
    (s) =>
      s.type === "duo" &&
      s.inviteStatus === "pending" &&
      s.user2Pubkey === user.pubkey,
  );

  // Sent invitations where current user is the inviter (user1)
  const sentInvitations = streaks.filter(
    (s) =>
      s.type === "duo" &&
      s.inviteStatus === "pending" &&
      s.user1Pubkey === user.pubkey,
  );

  if (isLoading) {
    return <InvitationsSkeleton />;
  }

  return (
    <div className="max-w-8xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="p-2 text-muted hover:text-foreground bg-surface border border-outline rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Invitations</h1>
          <p className="text-sm text-muted mt-0.5">
            Manage your duo streak invitations
          </p>
        </div>
      </div>

      {/* Pending Invitations */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-brand-500" />
          <h2 className="text-base font-semibold text-foreground">
            Received ({pendingInvitations.length})
          </h2>
        </div>

        {pendingInvitations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-surface border border-outline border-dashed rounded-2xl p-8 text-center"
          >
            <div className="w-12 h-12 bg-section rounded-xl flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-subtle" />
            </div>
            <p className="text-sm text-muted">No pending invitations</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {pendingInvitations.map((streak, i) => (
                <motion.div
                  key={streak.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-surface border border-outline rounded-2xl p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-brand-400/10 rounded-xl flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">
                        {streak.name}
                      </h3>
                      <p className="text-xs text-muted mt-0.5">
                        From:{" "}
                        <span className="font-mono text-subtle">
                          {streak.user1Pubkey.slice(0, 12)}...
                        </span>
                      </p>
                      <p className="text-xs text-subtle mt-1">
                        Created{" "}
                        {new Date(streak.createdAt).toLocaleDateString()}
                      </p>

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleRespond(streak.id, "accept")}
                          disabled={respondingId === streak.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-status-gentle/10 hover:bg-status-gentle/20 text-status-gentle border border-status-gentle/20 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {respondingId === streak.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespond(streak.id, "decline")}
                          disabled={respondingId === streak.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-status-chaos/10 hover:bg-status-chaos/20 text-status-chaos border border-status-chaos/20 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {respondingId === streak.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sent Invitations */}
      {sentInvitations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-muted" />
            <h2 className="text-base font-semibold text-foreground">
              Sent ({sentInvitations.length})
            </h2>
          </div>
          <div className="space-y-3">
            {sentInvitations.map((streak, i) => (
              <motion.div
                key={streak.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-surface border border-outline rounded-2xl p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-section rounded-xl flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-subtle" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      {streak.name}
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      To:{" "}
                      <span className="font-mono text-subtle">
                        {streak.user2Pubkey?.slice(0, 12)}...
                      </span>
                    </p>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-status-firm/10 text-status-firm border-status-firm/20">
                    pending
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InvitationsSkeleton() {
  return (
    <div className="max-w-8xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-surface rounded-xl" />
        <div>
          <div className="h-6 w-32 bg-surface rounded-lg" />
          <div className="h-4 w-48 bg-surface rounded-lg mt-1.5" />
        </div>
      </div>
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-outline rounded-2xl h-32"
          />
        ))}
      </div>
    </div>
  );
}
