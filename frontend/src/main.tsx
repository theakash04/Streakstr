import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { initRouter } from "./router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchInterval: 60 * 1000,
    },
  },
});

async function mount() {
  const router = await initRouter();

  const rootElement = document.getElementById("app")!;
  rootElement.innerHTML = "";
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

mount();

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("SW registration failed:", error);
    });
  });
}
