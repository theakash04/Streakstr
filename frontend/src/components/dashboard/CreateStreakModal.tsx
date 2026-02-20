import { useState, useEffect, useRef } from "react";
import {
  X,
  Flame,
  Loader2,
  Users,
  User,
  Search,
  Check,
  AlertCircle,
} from "lucide-react";
import { streakApi, type Streak } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface CreateStreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  streaks: Streak[];
  userPubkey: string;
}

type TabMode = "solo" | "duo";

export function CreateStreakModal({
  isOpen,
  onClose,
  onCreated,
  streaks,
  userPubkey,
}: CreateStreakModalProps) {
  const [tab, setTab] = useState<TabMode>("solo");
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Duo-specific state
  const [partnerInput, setPartnerInput] = useState("");
  const [partnerPubkey, setPartnerPubkey] = useState<string | null>(null);
  const [following, setFollowing] = useState<
    { pubkey: string; npub: string; name?: string; picture?: string }[]
  >([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingLoaded, setFollowingLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const hasActiveSolo = streaks.some(
    (s) => s.type === "solo" && s.status === "active",
  );

  // Reset state on close / tab switch
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setPartnerInput("");
      setPartnerPubkey(null);
      setError(null);
      setSearchQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    setError(null);
    setPartnerInput("");
    setPartnerPubkey(null);
    setSearchQuery("");
  }, [tab]);

  // Fetch following list when duo tab is first opened
  useEffect(() => {
    if (tab !== "duo" || followingLoaded || followingLoading) return;

    let cancelled = false;

    async function fetchFollowing() {
      setFollowingLoading(true);
      const { SimplePool } = await import("nostr-tools");
      const { npubEncode } = await import("nostr-tools/nip19");
      const { authApi } = await import("@/lib/api");

      const pool = new SimplePool();
      let relays: string[] = [];

      try {
        // Fetch relays from backend
        try {
          const res = await authApi.getRelays();
          relays = res.data.relays;
        } catch (e) {
          console.warn(
            "Failed to fetch relays from backend, using defaults",
            e,
          );
          relays = [
            "wss://relay.damus.io",
            "wss://nos.lol",
            "wss://relay.nostr.band",
          ];
        }

        // If backend returned empty list, use defaults
        if (relays.length === 0) {
          relays = [
            "wss://relay.damus.io",
            "wss://nos.lol",
            "wss://relay.nostr.band",
          ];
        }

        // Fetch user's kind-3 (contact list)
        const contactEvent = await pool.get(relays, {
          kinds: [3],
          authors: [userPubkey],
        });

        if (!contactEvent) {
          setFollowingLoading(false);
          setFollowingLoaded(true);
          return;
        }

        // Extract pubkeys from tags
        const contactPubkeys = contactEvent.tags
          .filter((t) => t[0] === "p" && t[1])
          .map((t) => t[1])
          .slice(0, 200); // limit

        if (contactPubkeys.length === 0) {
          setFollowingLoading(false);
          setFollowingLoaded(true);
          return;
        }

        // Fetch kind-0 profiles for contacts
        const profiles = await pool.querySync(relays, {
          kinds: [0],
          authors: contactPubkeys,
        });

        const profileMap = new Map<
          string,
          { name?: string; picture?: string }
        >();
        for (const ev of profiles) {
          try {
            const content = JSON.parse(ev.content);
            profileMap.set(ev.pubkey, {
              name: content.display_name || content.displayName || content.name,
              picture: content.picture,
            });
          } catch {
            // skip
          }
        }

        const contacts = contactPubkeys.map((pk) => ({
          pubkey: pk,
          npub: npubEncode(pk),
          name: profileMap.get(pk)?.name,
          picture: profileMap.get(pk)?.picture,
        }));

        setFollowing(contacts);
        setFollowingLoaded(true);
      } catch (err) {
        console.error("Failed to fetch following list:", err);
      } finally {
        if (!cancelled) setFollowingLoading(false);
        pool.close(relays);
      }
    }

    fetchFollowing();
    return () => {
      cancelled = true;
    };
  }, [tab, followingLoaded, userPubkey]);

  const handlePartnerInput = async () => {
    const value = partnerInput.trim();
    if (!value) return;

    try {
      const { decode } = await import("nostr-tools/nip19");

      // Try decoding as npub
      if (value.startsWith("npub1")) {
        const decoded = decode(value);
        if (decoded.type === "npub") {
          if (decoded.data === userPubkey) {
            setError("You can't create a duo streak with yourself");
            return;
          }
          setPartnerPubkey(decoded.data);
          setError(null);
          return;
        }
      }

      // Try as raw hex pubkey (64 chars)
      if (/^[0-9a-fA-F]{64}$/.test(value)) {
        if (value === userPubkey) {
          setError("You can't create a duo streak with yourself");
          return;
        }
        setPartnerPubkey(value);
        setError(null);
        return;
      }

      setError("Invalid npub or hex pubkey");
    } catch {
      setError("Invalid npub format");
    }
  };

  const selectFollowing = (pubkey: string) => {
    if (pubkey === userPubkey) {
      setError("You can't create a duo streak with yourself");
      return;
    }
    setPartnerPubkey(pubkey);
    setPartnerInput("");
    setError(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Streak name is required");
      return;
    }

    if (tab === "solo" && hasActiveSolo) {
      setError("You already have an active solo streak");
      return;
    }

    if (tab === "duo" && !partnerPubkey) {
      setError("Select a partner for the duo streak");
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      if (tab === "solo") {
        await streakApi.createSolo(name.trim());
      } else {
        await streakApi.createDuo(name.trim(), partnerPubkey!);
      }

      setName("");
      setPartnerPubkey(null);
      setPartnerInput("");
      onCreated();
      onClose();
    } catch {
      setError(
        tab === "solo"
          ? "Failed to create streak"
          : "Failed to create duo streak",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      if (tab === "solo") handleCreate();
      else if (!partnerPubkey) handlePartnerInput();
      else handleCreate();
    }
  };

  const filteredFollowing = searchQuery
    ? following.filter(
        (f) =>
          f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.npub.includes(searchQuery.toLowerCase()),
      )
    : following;

  // Get the display name for the selected partner
  const selectedPartnerInfo = partnerPubkey
    ? following.find((f) => f.pubkey === partnerPubkey)
    : null;

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
            className="bg-surface border border-outline rounded-2xl p-6 max-w-md w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center">
                  <Flame className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    New Streak
                  </h2>
                  <p className="text-xs text-muted">
                    {tab === "solo"
                      ? "Track your own consistency"
                      : "Challenge a partner"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Toggle */}
            <div className="flex gap-1 p-0.5 bg-section/60 rounded-lg mb-5">
              <button
                onClick={() => setTab("solo")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  tab === "solo"
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Solo
              </button>
              <button
                onClick={() => setTab("duo")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  tab === "duo"
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Duo
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
              <AnimatePresence mode="wait">
                {tab === "solo" ? (
                  <motion.div
                    key="solo"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    {hasActiveSolo && (
                      <div className="flex items-start gap-2 bg-status-firm/10 border border-status-firm/20 rounded-xl p-3">
                        <AlertCircle className="w-4 h-4 text-status-firm shrink-0 mt-0.5" />
                        <p className="text-xs text-status-firm">
                          You already have an active solo streak. Only one solo
                          streak is allowed at a time.
                        </p>
                      </div>
                    )}
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
                        disabled={hasActiveSolo}
                        className="w-full bg-background border border-outline rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 transition-colors disabled:opacity-50"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="duo"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Streak Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g., Daily Post Buddies"
                        autoFocus
                        className="w-full bg-background border border-outline rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 transition-colors"
                      />
                    </div>

                    {/* Partner Selection */}
                    {partnerPubkey ? (
                      <div className="flex items-center gap-3 bg-status-gentle/10 border border-status-gentle/20 rounded-xl p-3">
                        <div className="w-8 h-8 bg-status-gentle/20 rounded-full flex items-center justify-center">
                          {selectedPartnerInfo?.picture ? (
                            <img
                              src={selectedPartnerInfo.picture}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-status-gentle" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {selectedPartnerInfo?.name || "Partner Selected"}
                          </p>
                          <p className="text-[10px] text-muted font-mono truncate">
                            {partnerPubkey.slice(0, 16)}...
                          </p>
                        </div>
                        <button
                          onClick={() => setPartnerPubkey(null)}
                          className="p-1 text-muted hover:text-foreground transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* npub input */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            Partner npub
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={partnerInput}
                              onChange={(e) => setPartnerInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handlePartnerInput();
                                }
                              }}
                              placeholder="npub1..."
                              className="flex-1 bg-background border border-outline rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 transition-colors font-mono"
                            />
                            <button
                              onClick={handlePartnerInput}
                              disabled={!partnerInput.trim()}
                              className="px-3 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-outline" />
                          <span className="text-[10px] text-subtle uppercase tracking-wider">
                            or select from following
                          </span>
                          <div className="flex-1 h-px bg-outline" />
                        </div>

                        {/* Following list */}
                        <div>
                          {followingLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-5 h-5 text-muted animate-spin" />
                              <span className="text-sm text-muted ml-2">
                                Loading contacts...
                              </span>
                            </div>
                          ) : following.length === 0 ? (
                            <div className="text-center py-6">
                              <p className="text-sm text-muted">
                                No contacts found. Paste an npub above.
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="relative mb-2">
                                <Search className="w-3.5 h-3.5 text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) =>
                                    setSearchQuery(e.target.value)
                                  }
                                  placeholder="Search contacts..."
                                  className="w-full bg-background border border-outline rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 transition-colors"
                                />
                              </div>
                              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                                {filteredFollowing.map((contact) => (
                                  <button
                                    key={contact.pubkey}
                                    onClick={() =>
                                      selectFollowing(contact.pubkey)
                                    }
                                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-section/80 transition-colors cursor-pointer text-left"
                                  >
                                    <div className="w-7 h-7 bg-brand-500/10 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                                      {contact.picture ? (
                                        <img
                                          src={contact.picture}
                                          alt=""
                                          className="w-7 h-7 rounded-full object-cover"
                                        />
                                      ) : (
                                        <User className="w-3.5 h-3.5 text-brand-500" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-foreground truncate">
                                        {contact.name || "Unknown"}
                                      </p>
                                      <p className="text-[10px] text-muted font-mono truncate">
                                        {contact.npub.slice(0, 20)}...
                                      </p>
                                    </div>
                                  </button>
                                ))}
                                {filteredFollowing.length === 0 && (
                                  <p className="text-xs text-muted text-center py-3">
                                    No matching contacts
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {error && <p className="text-xs text-status-chaos">{error}</p>}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 mt-2 border-t border-outline">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm text-muted hover:text-foreground border border-outline rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  isCreating ||
                  !name.trim() ||
                  (tab === "solo" && hasActiveSolo) ||
                  (tab === "duo" && !partnerPubkey)
                }
                className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : tab === "solo" ? (
                  "Create Streak"
                ) : (
                  "Send Invitation"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
