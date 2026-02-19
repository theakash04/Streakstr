import React from "react";
import { Github, Zap } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-outline py-12 bg-app w-full">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand-500" />
            <span className="text-lg font-bold text-foreground">Streakstr</span>
          </div>

          <div className="text-sm text-subtle text-center md:text-right">
            <p>Streakstr. Built on Nostr.</p>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-subtle hover:text-foreground transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            {/* Nostr icon isn't standard in lucide yet, using generic or skipping */}
          </div>
        </div>
      </div>
    </footer>
  );
};
