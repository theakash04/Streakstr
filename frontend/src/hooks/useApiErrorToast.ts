import { useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

/**
 * Listens for `api-error` CustomEvents dispatched by the axios interceptor
 * and shows them as error toasts. Mount this once in the dashboard layout.
 */
export function useApiErrorToast() {
  const toast = useToast();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      toast.error(detail.message);
    };

    window.addEventListener("api-error", handler);
    return () => window.removeEventListener("api-error", handler);
  }, [toast]);
}
