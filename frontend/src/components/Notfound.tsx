import { ArrowLeft, Hash, Network, SearchX } from "lucide-react";
import { Button } from "./Button";
import { useNavigate } from "@tanstack/react-router";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in zoom-in-95 duration-500 w-full h-screen bg-background">
      {/* Glitchy/Tech visual */}
      <div className="relative mb-8 group cursor-default">
        <div className="absolute inset-0 bg-linear-to-tr from-orange-500/20 to-red-600/20 blur-2xl w-full h-full rounded-full opacity-100 transition-opacity duration-700"></div>
        <div className="relative p-8 rounded-2xl transition-all duration-300">
          <SearchX className="w-16 h-16 text-text-secondary transition-colors duration-300" />
        </div>
        {/* Floating particles */}
        <div className="absolute -top-2 -right-2 p-1.5 bg-background border border-border rounded-full shadow-sm">
          <Hash className="w-4 h-4 text-text-muted" />
        </div>
        <div className="absolute -bottom-2 -left-2 p-1.5 bg-background border border-border rounded-full shadow-sm">
          <Network className="w-4 h-4 text-text-muted" />
        </div>
      </div>

      <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-3 tracking-tight">
        Event Not Found
      </h1>

      <p className="text-lg text-text-secondary max-w-md mb-8 leading-relaxed">
        The signal was lost. This page may have been pruned from the relay or
        never signed in the first place.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Button
          onClick={() => navigate({ to: "/" })}
          className="min-w-[160px] shadow-lg shadow-orange-500/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}
