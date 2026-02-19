import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styleMap = {
  success: "border-status-gentle/30 text-status-gentle",
  error: "border-status-chaos/30 text-status-chaos",
  warning: "border-status-firm/30 text-status-firm",
  info: "border-brand-500/30 text-brand-400",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string, dur?: number) => addToast("success", msg, dur),
    error: (msg: string, dur?: number) => addToast("error", msg, dur ?? 6000),
    warning: (msg: string, dur?: number) => addToast("warning", msg, dur),
    info: (msg: string, dur?: number) => addToast("info", msg, dur),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-9999 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const Icon = iconMap[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto bg-surface/95 backdrop-blur-lg border ${styleMap[t.type]} rounded-xl px-4 py-3 flex items-start gap-3 shadow-lg`}
              >
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-sm text-foreground flex-1 leading-snug">
                  {t.message}
                </p>
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-muted hover:text-foreground transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
