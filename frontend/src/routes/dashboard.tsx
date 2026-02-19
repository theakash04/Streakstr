import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth-guard";
import { DashboardTopbar } from "@/components/dashboard/Topbar";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireAuth,
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user } = Route.useRouteContext();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopbar pubkey={user.pubkey} user={user.user} />
      <main className="flex-1 w-full max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
