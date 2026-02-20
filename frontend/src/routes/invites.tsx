import { requireAuth } from "@/lib/auth-guard";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { streakApi } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Check, X, Loader2, Mail, Flame, ArrowLeft } from "lucide-react";
import { getUserDetails } from "@/utils";
import { motion } from "framer-motion";
import { AxiosError } from "axios";

export const Route = createFileRoute("/invites")({
  beforeLoad: requireAuth,
  component: InvitePage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: search.token as string | undefined,
      sender: search.sender as string | undefined,
      sname: search.sname as string | undefined,
    };
  },
});

function InvitePage() {
  const { token, sender, sname } = Route.useSearch();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [senderUser, setSenderUser] = useState<{
    name: string;
    picture: string;
    pubkey: string;
  } | null>(null);

  useEffect(() => {
    if (!token || !sender) {
      setLoading(false);
      return;
    }

    async function fetchSenderUser(sender: string) {
      const senderUser = await getUserDetails(sender);
      if (senderUser) {
        setSenderUser({
          name: senderUser.name || "",
          picture: senderUser.picture || "",
          pubkey: sender,
        });
      }
      setLoading(false);
    }

    fetchSenderUser(sender);
  }, [token, sender]);

  async function handleResponse(action: "accept" | "decline") {
    setProcessing(true);
    try {
      await streakApi.respondToInvitation(action, { token: token! });
      toast.success(
        `Streak ${action === "accept" ? "accepted" : "declined"} successfully!`,
      );
      navigate({ to: "/dashboard", replace: true });
    } catch (error: any) {
      if (error instanceof AxiosError) {
        const errorMsg =
          error.response?.data?.error || "Failed to respond to invitation";
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        const errorMsg = error.message || "An unexpected error occurred";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setProcessing(false);
    }
  }

  // No token — empty state
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-surface border border-outline rounded-2xl p-12 text-center max-w-md w-full"
        >
          <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-brand-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            No Invitation Found
          </h1>
          <p className="text-muted mb-8">
            Use the invitation link sent to you via DM to accept or decline a
            streak invitation.
          </p>
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-surface border border-outline rounded-3xl overflow-hidden relative">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 p-8 pb-6 text-center">
            <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Flame className="w-7 h-7 text-brand-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Streak Invitation
            </h1>
            <p className="text-muted text-sm">
              You've been invited to a Duo Streak
            </p>
          </div>

          {/* Content */}
          <div className="relative z-10 px-8 pb-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-3" />
                <p className="text-muted text-sm">Loading details...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-status-chaos/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <X className="w-7 h-7 text-status-chaos" />
                </div>
                <p className="text-foreground font-medium mb-1">
                  Something went wrong
                </p>
                <p className="text-muted text-sm mb-6">{error}</p>
                <button
                  onClick={() => navigate({ to: "/dashboard" })}
                  className="text-brand-500 hover:text-brand-400 text-sm font-medium cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Sender */}
                <div className="bg-background rounded-2xl p-4 border border-outline">
                  <p className="text-xs font-medium text-subtle uppercase tracking-wider mb-3">
                    Invited by
                  </p>
                  <div className="flex items-center gap-3">
                    {senderUser?.picture ? (
                      <img
                        src={senderUser.picture}
                        alt={senderUser.name}
                        className="w-10 h-10 rounded-full border border-outline object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-500/15 flex items-center justify-center text-sm font-bold text-brand-500">
                        {senderUser?.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-foreground font-medium truncate">
                        {senderUser?.name || "Unknown User"}
                      </p>
                      <p className="text-subtle text-xs font-mono truncate">
                        {sender?.slice(0, 16)}...
                      </p>
                    </div>
                  </div>
                </div>

                {/* Streak Name */}
                <div className="text-center py-4">
                  <p className="text-xs font-medium text-subtle uppercase tracking-wider mb-2">
                    Streak
                  </p>
                  <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-brand-400 via-brand-500 to-brand-700">
                    {sname}
                  </p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleResponse("decline")}
                    disabled={processing}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer border border-outline text-muted hover:text-status-chaos hover:border-status-chaos/30 hover:bg-status-chaos/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                    Decline
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleResponse("accept")}
                    disabled={processing}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Accept
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-subtle mt-6">
          A duo streak means you both need to post on Nostr every day to keep it
          alive.
        </p>
      </motion.div>
    </div>
  );
}
