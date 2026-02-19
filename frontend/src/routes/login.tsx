import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Flame,
  Chrome,
  Smartphone,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { requireGuest } from "@/lib/auth-guard";

export const Route = createFileRoute("/login")({
  beforeLoad: requireGuest,
  component: LoginPage,
});

type LoginMethod = "extension" | "remote";

function LoginPage() {
  const [method, setMethod] = useState<LoginMethod>("extension");
  const [bunkerUrl, setBunkerUrl] = useState("");
  const navigate = useNavigate();
  const {
    isLoading,
    isSuccess,
    isError,
    error,
    pubkey,
    loginWithExtension,
    loginWithRemoteSigner,
    reset,
  } = useAuth();

  const handleExtensionLogin = async () => {
    try {
      await loginWithExtension();
      setTimeout(() => navigate({ to: "/" }), 1500);
    } catch {
      // error is already set in hook
    }
  };

  const handleRemoteLogin = async () => {
    if (!bunkerUrl.trim()) return;
    try {
      await loginWithRemoteSigner(bunkerUrl.trim());
      setTimeout(() => navigate({ to: "/" }), 1500);
    } catch {
      // error is already set in hook
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-150 h-150 bg-brand-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Back link */}
        <button
          onClick={() => navigate({ to: "/" })}
          className="flex items-center gap-2 text-muted hover:text-foreground transition-colors mb-8 group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Back to home</span>
        </button>

        {/* Card */}
        <div className="bg-surface/60 backdrop-blur-xl border border-outline rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <Flame className="w-8 h-8 text-brand-500" />
              <div className="absolute inset-0 bg-brand-500 blur-xl opacity-30" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
          </div>
          <p className="text-muted mb-8">
            Connect with your Nostr identity to start tracking streaks.
          </p>

          {/* Method Tabs */}
          <div className="flex gap-1 p-1 bg-section rounded-xl mb-8">
            <TabButton
              active={method === "extension"}
              onClick={() => {
                setMethod("extension");
                reset();
              }}
              icon={<Chrome className="w-4 h-4" />}
              label="Extension"
            />
            <TabButton
              active={method === "remote"}
              onClick={() => {
                setMethod("remote");
                reset();
              }}
              icon={<Smartphone className="w-4 h-4" />}
              label="Nostr Connect"
            />
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <SuccessState pubkey={pubkey} key="success" />
            ) : method === "extension" ? (
              <ExtensionLogin
                key="extension"
                isLoading={isLoading}
                isError={isError}
                error={error}
                onLogin={handleExtensionLogin}
              />
            ) : (
              <RemoteLogin
                key="remote"
                isLoading={isLoading}
                isError={isError}
                error={error}
                bunkerUrl={bunkerUrl}
                setBunkerUrl={setBunkerUrl}
                onLogin={handleRemoteLogin}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-subtle text-xs mt-6">
          Your private keys never leave your device.
        </p>
      </motion.div>
    </div>
  );
}

/* ─── Sub-components ─── */

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer border ${
        active
          ? "bg-surface text-foreground shadow-sm border-outline"
          : "text-muted hover:text-foreground border-transparent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ExtensionLogin({
  isLoading,
  isError,
  error,
  onLogin,
}: {
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  onLogin: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="space-y-4">
        <div className="bg-section/80 border border-outline rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground mb-2">
            How it works
          </h3>
          <ol className="space-y-2 text-sm text-muted">
            <li className="flex gap-2">
              <span className="text-brand-500 font-mono font-bold">1.</span>
              Click the button below to connect
            </li>
            <li className="flex gap-2">
              <span className="text-brand-500 font-mono font-bold">2.</span>
              Approve the key access in your extension
            </li>
            <li className="flex gap-2">
              <span className="text-brand-500 font-mono font-bold">3.</span>
              Sign the login challenge
            </li>
          </ol>
        </div>

        <Button
          variant="primary"
          className="w-full h-12"
          onClick={onLogin}
          isLoading={isLoading}
          icon={!isLoading ? <Chrome className="w-5 h-5" /> : undefined}
        >
          {isLoading ? "Waiting for extension..." : "Connect Extension"}
        </Button>

        {isError && <ErrorMessage message={error} />}

        <p className="text-xs text-subtle text-center">
          Supports Alby, nos2x, Nostr Connect, and other NIP-07 extensions.
        </p>
      </div>
    </motion.div>
  );
}

function RemoteLogin({
  isLoading,
  isError,
  error,
  bunkerUrl,
  setBunkerUrl,
  onLogin,
}: {
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  bunkerUrl: string;
  setBunkerUrl: (url: string) => void;
  onLogin: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="space-y-4">
        <div className="bg-section/80 border border-outline rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground mb-2">
            Remote Signer (NIP-46)
          </h3>
          <p className="text-sm text-muted">
            Use a remote signer like{" "}
            <a
              href="https://nsec.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:text-brand-400 underline underline-offset-2"
            >
              nsec.app
            </a>{" "}
            or{" "}
            <a
              href="https://amber.nostr.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:text-brand-400 underline underline-offset-2"
            >
              Amber
            </a>{" "}
            to sign in from mobile.
          </p>
        </div>

        <div>
          <label
            htmlFor="bunker-url"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Bunker URL
          </label>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <input
              id="bunker-url"
              type="text"
              value={bunkerUrl}
              onChange={(e) => setBunkerUrl(e.target.value)}
              placeholder="bunker://..."
              disabled={isLoading}
              className="w-full bg-section border border-outline rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all disabled:opacity-50"
            />
          </div>
        </div>

        <Button
          variant="primary"
          className="w-full h-12"
          onClick={onLogin}
          isLoading={isLoading}
          disabled={!bunkerUrl.trim() || isLoading}
          icon={!isLoading ? <Smartphone className="w-5 h-5" /> : undefined}
        >
          {isLoading ? "Connecting to signer..." : "Connect Remote Signer"}
        </Button>

        {isError && <ErrorMessage message={error} />}
      </div>
    </motion.div>
  );
}

function SuccessState({ pubkey }: { pubkey: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-6"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-status-gentle/10 mb-4">
        <CheckCircle className="w-8 h-8 text-status-gentle" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1">You're in!</h3>
      <p className="text-sm text-muted mb-2">
        Redirecting to your dashboard...
      </p>
      {pubkey && (
        <p className="text-xs text-subtle font-mono break-all">
          {pubkey.slice(0, 12)}...{pubkey.slice(-12)}
        </p>
      )}
    </motion.div>
  );
}

function ErrorMessage({ message }: { message: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 p-3 bg-status-chaos/10 border border-status-chaos/20 rounded-xl"
    >
      <AlertCircle className="w-4 h-4 text-status-chaos shrink-0 mt-0.5" />
      <p className="text-sm text-status-chaos">
        {message || "Something went wrong. Please try again."}
      </p>
    </motion.div>
  );
}
