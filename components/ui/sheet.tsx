"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@/components/ui/icons";
import { SAVED_EVENT } from "@/components/ui/feedback";

type AddSheetProps = {
  triggerLabel: string;
  title: string;
  children: ReactNode;
};

// Trigger button + native <dialog>. Mobile: bottom sheet. md+: centred modal.
export function AddSheet({ triggerLabel, title, children }: AddSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  function openSheet() {
    dialogRef.current?.showModal();
  }

  function closeSheet() {
    dialogRef.current?.close();
  }

  // A save elsewhere (e.g. the form inside this sheet) closes the sheet.
  useEffect(() => {
    function onSaved() {
      if (dialogRef.current?.open) dialogRef.current.close();
    }
    window.addEventListener(SAVED_EVENT, onSaved);
    return () => window.removeEventListener(SAVED_EVENT, onSaved);
  }, []);

  return (
    <>
      <Button onClick={openSheet} className="min-h-[44px]">
        <IconPlus />
        {triggerLabel}
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(event) => {
          // Escape: handle the close ourselves so it always closes.
          event.preventDefault();
          closeSheet();
        }}
        onClick={(event) => {
          // Backdrop click: the click landed on the dialog box itself, not its content.
          if (event.target === event.currentTarget) closeSheet();
        }}
        className={[
          "fixed m-0 max-h-[85vh] w-full max-w-none overflow-y-auto border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-0 text-[color:var(--color-text)] shadow-[var(--shadow-lift)]",
          "bottom-0 left-0 right-0 top-auto rounded-t-[var(--radius-lg)] rounded-b-none",
          "md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[calc(100%-2rem)] md:max-w-[560px] md:rounded-[var(--radius-lg)]",
          "backdrop:bg-[rgba(15,23,42,0.45)]",
          "motion-safe:animate-[fade-in_220ms_ease-out_both]",
        ].join(" ")}
      >
        <div className="flex flex-col gap-[var(--space-4)] p-[var(--space-5)]">
          <div className="flex items-center justify-between gap-[var(--space-3)]">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <Button variant="ghost" onClick={closeSheet} aria-label="Close" className="min-h-[44px]">
              Close
            </Button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
