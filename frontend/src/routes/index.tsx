import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Clock,
  Shield,
  Zap,
  Flame,
  AlertCircle,
  Users,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.ts";
import { Button } from "@/components/Button.tsx";
import { Header } from "@/components/Header.tsx";
import { detectBrowser, EXTENSION_URLS } from "../utils/Browser.ts";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    pubkey,
    isLoading,
    error,
    login,
    hasExtension,
    clearError,
  } = useAuth();

  async function handleLogin() {
    // If already authenticated, just navigate to dashboard
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
      return;
    }

    try {
      clearError();
      await login();
      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("Login failed:", err);
    }
  }

  async function handleDownloadExtension() {
    const browser = detectBrowser();

    const url =
      EXTENSION_URLS[browser] ??
      "https://www.google.com/search?q=browser+extension+store";

    window.open(url, "_blank");
  }

  return (
    <>
      <Header />
      <div className="flex flex-col items-center justify-center w-full bg-background">
        {/* Hero Section */}
        <div className="w-full max-w-5xl mx-auto px-6 py-20 sm:py-32 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-border shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <span className="text-sm font-medium text-text-secondary">
              {isAuthenticated && pubkey
                ? "Welcome back!"
                : "Don't be lazy join now!"}
            </span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-text-primary mb-6 max-w-4xl leading-tight">
            Don't break the <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-500 to-red-600">
              chain.
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-text-secondary max-w-2xl mb-10 leading-relaxed">
            The only habit tracker that defends itself. <br />
            We monitor your public notes. If you stop posting, we start
            roasting.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {hasExtension ? (
              <>
                {" "}
                <Button
                  onClick={handleLogin}
                  isLoading={isLoading}
                  className="h-14 px-8 text-lg font-bold  transition-all transform hover:-translate-y-1"
                >
                  {isAuthenticated && pubkey ? "Dashboard" : "Connect Nostr"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate({ to: "/leaderboard" })}
                  className="h-14 px-8 text-lg font-medium bg-background hover:bg-surface"
                >
                  See Leaderboard
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                onClick={handleDownloadExtension}
                className="h-14 px-8 text-lg font-bold transition-all transform hover:-translate-y-1"
              >
                Download Extension
              </Button>
            )}
          </div>

          {error && (
            <div className="text-danger bg-danger/10 border border-danger/20 px-4 py-3 rounded-lg text-sm mt-8 animate-in fade-in">
              {error}
            </div>
          )}

          <div className="mt-12 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-text-muted text-sm grayscale opacity-70">
            <span>No Email Required</span>
            <span className="hidden sm:inline">•</span>
            <span>Keyless Login</span>
            <span className="hidden sm:inline">•</span>
            <span>Open Protocol</span>
          </div>
        </div>

        {/* Visual Demo Section */}
        <div className="w-full bg-background py-20 relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <h2 className="text-3xl font-bold text-text-primary">
                  How it works
                </h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center font-bold text-text-secondary shrink-0">
                      1
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary text-lg">
                        Start a streak
                      </h3>
                      <p className="text-text-secondary">
                        Create a solo streak for yourself or a duo streak with a
                        friend. Both of you commit to a daily habit.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center font-bold text-text-secondary shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary text-lg">
                        Check in daily
                      </h3>
                      <p className="text-text-secondary">
                        Complete your habit and mark it done. We track your
                        progress and keep your streak alive.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center font-bold text-text-secondary shrink-0">
                      3
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary text-lg">
                        Get reminded (or roasted)
                      </h3>
                      <p className="text-text-secondary">
                        Enable DM reminders before your deadline. Break your
                        streak? We can post a public shame note.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Streak Preview */}
              <div className="relative mx-auto w-full max-w-sm">
                <div className="absolute inset-0 bg-linear-to-tr from-orange-500/20 to-indigo-500/20 blur-3xl rounded-full" />
                <div className="relative bg-background border border-border rounded-2xl p-6 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                        <Flame className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xs text-text-secondary">
                          Daily Post Streak
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <div>
                        <div className="text-2xl font-bold text-orange-500">
                          7
                        </div>
                        <div className="text-xs text-text-muted uppercase">
                          Days
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Clock className="w-4 h-4" />
                      <span>Reminder: 2 hours before deadline</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Activity className="w-4 h-4" />
                      <span>Last post: 3 hours ago</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-xs text-danger font-medium">
                    <AlertCircle className="w-4 h-4" />
                    <span>Shame mode: ON — Break it and get roasted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison / Value Props */}
        <div className="max-w-4xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Why use Streakstr?
            </h2>
            <p className="text-text-secondary">
              Most habit trackers are passive. We are active.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-surface p-6 rounded-2xl border border-border hover:shadow-lg hover:border-orange-500/20 transition-all group">
              <Zap className="w-8 h-8 text-orange-500 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-text-primary mb-2">Automated</h3>
              <p className="text-sm text-text-secondary">
                Your public notes are your proof of work. Just use Nostr as
                usual.
              </p>
            </div>
            <div className="bg-surface p-6 rounded-2xl border border-border hover:shadow-lg hover:border-indigo-500/20 transition-all group">
              <Users className="w-8 h-8 text-indigo-500 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-text-primary mb-2">Social</h3>
              <p className="text-sm text-text-secondary">
                Challenge friends to Duo streaks. If one fails, both fail.
              </p>
            </div>
            <div className="bg-surface p-6 rounded-2xl border border-border hover:shadow-lg hover:border-green-500/20 transition-all group">
              <Shield className="w-8 h-8 text-green-500 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-text-primary mb-2">Private</h3>
              <p className="text-sm text-text-secondary">
                No email, no password, no tracking pixels. Just signatures.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
