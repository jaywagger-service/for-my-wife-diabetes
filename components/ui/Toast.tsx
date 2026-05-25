"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ToastState {
  message: string;
  visible: boolean;
}

let showToastFn: ((msg: string) => void) | null = null;

export function toast(msg: string) {
  showToastFn?.(msg);
}

export function ToastProvider() {
  const [state, setState] = useState<ToastState>({ message: "", visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    showToastFn = (msg: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setState({ message: msg, visible: true });
      timerRef.current = setTimeout(
        () => setState((s) => ({ ...s, visible: false })),
        1800
      );
    };
    return () => {
      showToastFn = null;
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed bottom-28 left-1/2 -translate-x-1/2 z-50",
        "bg-accent-deep text-bg px-5 py-3 rounded-full text-sm",
        "shadow-lg pointer-events-none transition-all duration-200",
        state.visible
          ? "opacity-100 -translate-y-2 -translate-x-1/2"
          : "opacity-0 translate-y-0 -translate-x-1/2"
      )}
    >
      {state.message}
    </div>
  );
}
