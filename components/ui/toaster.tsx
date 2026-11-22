"use client";

import { useEffect, useRef, useState } from "react";
import { SAVED_EVENT } from "@/components/ui/feedback";

const HIDE_AFTER_MS = 2500;

type ToastState = { id: number; message: string } | null;

// Fixed bottom-centre status pill. Listens for SAVED_EVENT and auto-hides.
export function Toaster() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onSaved(event: Event) {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      const message = detail?.message ?? "Saved";
      if (timer.current) clearTimeout(timer.current);
      setToast((prev) => ({ id: (prev?.id ?? 0) + 1, message }));
      timer.current = setTimeout(() => setToast(null), HIDE_AFTER_MS);
    }

    window.addEventListener(SAVED_EVENT, onSaved);
    return () => {
      window.removeEventListener(SAVED_EVENT, onSaved);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const visible = toast !== null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[var(--radius-full)] bg-[color:var(--color-primary)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-semibold text-[color:var(--color-on-primary)] shadow-[var(--shadow-lift)] transition-opacity duration-200 motion-safe:transition-[opacity,transform]",
        visible ? "opacity-100" : "opacity-0",
        visible ? "motion-safe:animate-[fade-in_300ms_ease-out_both]" : "",
      ].join(" ")}
    >
      {toast?.message ?? ""}
    </div>
  );
}
