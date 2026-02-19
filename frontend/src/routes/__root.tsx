import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { AuthUser } from "@/lib/auth-guard";
import { ToastProvider } from "@/components/ui/Toast";
import { NotFound } from "@/components/NotFound";
import "../styles.css";

interface RootRouteContext {
  auth: AuthUser | null;
}

export const Route = createRootRouteWithContext<RootRouteContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <ToastProvider>
      <Outlet />
      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "TanStack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </ToastProvider>
  );
}
