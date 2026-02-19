import { createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Zap, Heart, Bot } from "lucide-react";

export const Route = createFileRoute("/sponsor")({
  component: SponsorPage,
});

function SponsorPage() {
  const [addressCopied, setAddressCopied] = useState(false);
  const [npubCopied, setNpubCopied] = useState(false);

  const LIGHTNING_ADDRESS = "streakstr@rizful.com";
  const NPUB_ADDR =
    "npub17kmyqx5r7ec6aqnlfaqlejwt9qk2th5yny82fewvgd4x5k5elpwqnrya96";

  const copyToClipboard = (text: string, type: "address" | "npub") => {
    navigator.clipboard.writeText(text);
    if (type === "address") {
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    } else {
      setNpubCopied(true);
      setTimeout(() => setNpubCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 pt-6 pb-12">
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="max-w-lg w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/10 mb-2">
            <Heart className="w-6 h-6 text-brand-500" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Support Streakstr
          </h1>
          <p className="text-muted text-sm leading-relaxed max-w-sm mx-auto">
            Help keep the fire burning. Your sats fuel development and keep
            streaks alive for everyone.
          </p>
        </div>

        {/* Lightning Card */}
        <div className="bg-surface border border-outline rounded-2xl overflow-hidden">
          {/* Card header */}
          <div className="bg-linear-to-r from-brand-600/20 to-brand-500/10 border-b border-outline px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 text-black"
                  fill="currentColor"
                >
                  <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Bitcoin Only
                </h2>
                <p className="text-xs text-muted">
                  Peer-to-peer. No middlemen.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-900/50 border border-brand-500/20 text-brand-400 text-[11px] font-medium">
              <Zap className="w-3 h-3" />
              Lightning
            </span>
          </div>

          {/* Card body */}
          <div className="p-6 space-y-5">
            {/* QR + Address side by side on larger, stacked on mobile */}
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* QR Code */}
              <div className="bg-white p-3 rounded-xl shrink-0">
                <QRCodeSVG
                  value={LIGHTNING_ADDRESS}
                  size={140}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              {/* Address + Copy */}
              <div className="flex-1 space-y-3 text-center sm:text-left w-full">
                <div>
                  <p className="text-[10px] text-subtle uppercase tracking-widest mb-1">
                    Lightning Address
                  </p>
                  <p className="text-brand-400 font-mono text-sm break-all">
                    {LIGHTNING_ADDRESS}
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(LIGHTNING_ADDRESS, "address")}
                  className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {addressCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Address
                    </>
                  )}
                </button>

                <p className="text-[11px] text-subtle text-center sm:text-left">
                  Scan QR or copy the address into any Lightning wallet
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bot Nostr Card */}
        <div className="bg-surface border border-outline rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Follow the bot on Nostr
              </p>
              <p className="text-xs text-muted">
                Get streak updates and reminders
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              copyToClipboard(NPUB_ADDR, "npub");
              window.open("https://nostria.app/p/" + NPUB_ADDR);
            }}
            className="w-full bg-section rounded-lg p-3 hover:bg-outline/30 transition-colors cursor-pointer group"
          >
            <p className="text-xs font-mono text-muted break-all text-center group-hover:text-brand-400 transition-colors">
              {npubCopied ? (
                <span className="text-brand-400 font-sans font-medium">
                  Copied to clipboard!
                </span>
              ) : (
                NPUB_ADDR
              )}
            </p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
