import { motion } from "framer-motion";
import { Link2, Smartphone } from "lucide-react";
import { Button } from "./ui/Button";

interface LocalSignerLoginProps {
  bunkerUrl: string;
  setBunkerUrl: (url: string) => void;
  onBunkerLogin: () => void;
  isBunkerLoading: boolean;
  isBunkerError: boolean;
  bunkerError: string | null;
}

export const LocalSignerLogin = ({
  bunkerUrl,
  setBunkerUrl,
  onBunkerLogin,
  isBunkerLoading,
  isBunkerError,
  bunkerError,
}: LocalSignerLoginProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.15 }}
    >
      <div className="space-y-4">
        <div className="bg-section/80 border border-outline rounded-xl p-4 text-sm text-muted space-y-2">
          <p className="font-medium text-foreground">Bunker URL Login</p>
          <p>
            Paste your <code className="font-mono">bunker://</code> URL from Amber (Connect) or
            another NIP-46 signer.
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
              disabled={isBunkerLoading}
              className="w-full bg-section border border-outline rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all disabled:opacity-50"
            />
          </div>
          <p className="text-xs text-subtle mt-1.5">
            Get this from your signer app (e.g. Amber → Connect → Bunker URL).
          </p>
        </div>

        <Button
          variant="primary"
          className="w-full h-12"
          onClick={onBunkerLogin}
          isLoading={isBunkerLoading}
          disabled={!bunkerUrl.trim() || isBunkerLoading}
          icon={!isBunkerLoading ? <Smartphone className="w-5 h-5" /> : undefined}
        >
          {isBunkerLoading ? "Connecting to signer..." : "Connect Remote Signer"}
        </Button>

        {isBunkerError && <ErrorMessage message={bunkerError} />}
      </div>
    </motion.div>
  );
};

function ErrorMessage({ message }: { message: string | null }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-status-chaos/10 border border-status-chaos/20 rounded-xl">
      <p className="text-sm text-status-chaos">
        {message || "Something went wrong. Please try again."}
      </p>
    </div>
  );
}
