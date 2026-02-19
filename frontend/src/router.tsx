import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { getAuthUser } from "@/lib/auth-guard";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    context: {
      auth: undefined!,
    },
  });

  return router;
}

export async function initRouter() {
  const router = getRouter();
  const auth = await getAuthUser();
  router.update({
    context: { auth },
  });
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
