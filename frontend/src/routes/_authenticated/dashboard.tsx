import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { useStreaksQuery } from "@/hooks/useStreaks";
import { Activity } from "lucide-react";
import { Button } from "@/components/Button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: RouteComponent,
  validateSearch: (search) => ({
    streakId: typeof search.streakId === "string" ? search.streakId : undefined,
  }),
});

function RouteComponent() {
  const { user } = useAuth();
  const { isLoading, data: streaks = [] } = useStreaksQuery();
  const { streakId: activeStreakId } = Route.useSearch();

  const activeStreak = streaks.find((s) => s.id === activeStreakId);

  const navigate = useNavigate();
  if (streaks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-3xl animate-in fade-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-surface-muted rounded-full flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-text-muted" />
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-1">
          Your dashboard is empty
        </h3>
        <p className="text-text-secondary text-sm max-w-xs text-center mb-6">
          Time to commit. Create a streak and we'll start tracking.
        </p>
        <Button onClick={() => navigate({ to: "/new" })}>Create Streak</Button>
      </div>
    );
  }

  if (!activeStreak) {
    return (
      <div className="text-center py-10 text-text-muted">Loading streak...</div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            {activeStreak.name}
          </h2>
          <p className="text-sm text-text-secondary">
            Status: {activeStreak.status}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-text-primary">
            {activeStreak.currentCount}
          </div>
          <div className="text-xs text-text-muted uppercase">Current</div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="text-text-secondary">
            Highest: {activeStreak.highestCount}
          </div>
          <div className="text-text-secondary">
            Type: {activeStreak.type}
          </div>
          <div className="text-text-secondary">
            Last Activity: {activeStreak.lastActivityAt ?? "—"}
          </div>
          <div className="text-text-secondary">
            Invite: {activeStreak.inviteStatus}
          </div>
        </div>
      </div>
    </div>
  );

  // return (
  //   <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
  //     {/* Tabs for fast switching */}
  //     <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 custom-scrollbar">
  //       {streaks.map((streak) => (
  //         <button
  //           key={streak.id}
  //           onClick={() => setActiveStreakId(streak.id)}
  //           className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
  //             activeStreakId === streak.id
  //               ? "bg-text-primary text-background shadow-md"
  //               : "bg-surface border border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary"
  //           }`}
  //         >
  //           {streak.type === StreakType.SOLO ? (
  //             <Flame className="w-3.5 h-3.5" />
  //           ) : (
  //             <Users className="w-3.5 h-3.5" />
  //           )}
  //           {streak.title}
  //         </button>
  //       ))}
  //       <button
  //         onClick={() => setView(View.CREATE)}
  //         className="p-2 rounded-full bg-surface border border-border text-text-secondary hover:text-primary hover:border-primary transition-colors"
  //         title="Add New"
  //       >
  //         <Plus className="w-4 h-4" />
  //       </button>
  //     </div>

  //     {/* Detailed View Card */}
  //     <div className="bg-surface border border-border rounded-3xl p-6 md:p-10 shadow-sm relative overflow-hidden">
  //       {/* Background pattern */}
  //       <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
  //         {activeStreak.type === StreakType.SOLO ? (
  //           <Flame className="w-64 h-64 text-text-primary" />
  //         ) : (
  //           <Users className="w-64 h-64 text-text-primary" />
  //         )}
  //       </div>

  //       <div className="relative z-10">
  //         <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
  //           <div>
  //             <div className="flex items-center gap-3 mb-2">
  //               <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
  //                 {activeStreak.title}
  //               </h2>
  //               <span
  //                 className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
  //                   activeStreak.type === StreakType.SOLO
  //                     ? "bg-orange-50 border-orange-100 text-orange-700 dark:bg-orange-900/10 dark:border-orange-900/30 dark:text-orange-400"
  //                     : "bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-900/10 dark:border-indigo-900/30 dark:text-indigo-400"
  //                 }`}
  //               >
  //                 {activeStreak.type}
  //               </span>
  //             </div>
  //             <div className="flex items-center gap-4 text-sm text-text-secondary">
  //               <span className="flex items-center gap-1.5">
  //                 <Activity className="w-4 h-4" />
  //                 Last Active:{" "}
  //                 {Math.floor(
  //                   (Date.now() - activeStreak.lastActivity) / (1000 * 60 * 60),
  //                 )}
  //                 h ago
  //               </span>
  //               {activeStreak.type === StreakType.DUO &&
  //                 activeStreak.partnerPubkey && (
  //                   <span
  //                     className="flex items-center gap-1.5"
  //                     title={activeStreak.partnerPubkey}
  //                   >
  //                     <Share2 className="w-4 h-4" />
  //                     With Partner
  //                   </span>
  //                 )}
  //             </div>
  //           </div>

  //           <div className="flex items-center gap-3">
  //             <div className="text-right mr-2">
  //               <p className="text-4xl font-bold text-text-primary">
  //                 {activeStreak.count}
  //               </p>
  //               <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">
  //                 Day Streak
  //               </p>
  //             </div>
  //             <div className="h-12 w-px bg-border mx-2 hidden md:block"></div>
  //             <Button
  //               variant="secondary"
  //               onClick={() => setEditingStreak(activeStreak)}
  //               className="gap-2"
  //             >
  //               <Settings2 className="w-4 h-4" />
  //               Manage Settings
  //             </Button>
  //           </div>
  //         </div>

  //         {/* Main Calendar Area */}
  //         <div className="bg-background/50 rounded-2xl p-6 border border-border mb-8">
  //           <Calendar history={activeStreak.history} />
  //         </div>

  //         {/* Quick Settings Summary */}
  //         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  //           <div className="p-4 rounded-xl border border-border bg-surface-muted/30">
  //             <div className="flex items-center gap-2 mb-2">
  //               <Zap className="w-4 h-4 text-primary" />
  //               <span className="font-semibold text-sm text-text-primary">
  //                 Reminder Settings
  //               </span>
  //             </div>
  //             <p className="text-sm text-text-secondary">
  //               Receive{" "}
  //               <strong>{activeStreak.settings.reminderFrequency}</strong> DMs
  //               if inactivity is detected.
  //             </p>
  //           </div>

  //           {activeStreak.type === StreakType.SOLO && (
  //             <div
  //               className={`p-4 rounded-xl border ${activeStreak.settings.publicShame ? "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10" : "border-border bg-surface-muted/30"}`}
  //             >
  //               <div className="flex items-center gap-2 mb-2">
  //                 <Flame
  //                   className={`w-4 h-4 ${activeStreak.settings.publicShame ? "text-red-600" : "text-text-muted"}`}
  //                 />
  //                 <span
  //                   className={`font-semibold text-sm ${activeStreak.settings.publicShame ? "text-red-700 dark:text-red-300" : "text-text-primary"}`}
  //                 >
  //                   Public Roast
  //                 </span>
  //               </div>
  //               <p
  //                 className={`text-sm ${activeStreak.settings.publicShame ? "text-red-600/80 dark:text-red-200/70" : "text-text-secondary"}`}
  //               >
  //                 {activeStreak.settings.publicShame
  //                   ? `Enabled. Intensity Level: ${activeStreak.settings.shameIntensity}/10`
  //                   : "Disabled. Safe mode on."}
  //               </p>
  //             </div>
  //           )}
  //         </div>
  //       </div>
  //     </div>
  //   </div>
  // );
}
