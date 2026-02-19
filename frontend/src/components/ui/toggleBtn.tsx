import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "lucide-react";

const ToggleBtn = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface transition-all duration-300 cursor-pointer"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="relative w-5 h-5">
        {/* Sun icon */}
        <Sun
          className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
            isDark
              ? "opacity-0 rotate-90 scale-0"
              : "opacity-100 rotate-0 scale-100 text-amber-500"
          }`}
        />
        {/* Moon icon */}
        <Moon
          className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
            isDark
              ? "opacity-100 rotate-0 scale-100 text-brand-400"
              : "opacity-0 -rotate-90 scale-0"
          }`}
        />
      </div>
    </button>
  );
};

export default ToggleBtn;
