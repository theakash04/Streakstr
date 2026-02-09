import { useTheme } from "@/hooks/useTheme";
import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";

export function Header() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <header className="bg-background/50 border-b border-border backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight text-text-primary">
              {import.meta.env.VITE_NAME}
            </span>
          </div>
        </Link>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}
