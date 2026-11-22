'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded border border-zinc-400 px-4 py-2 text-base font-medium text-black"
    >
      Print
    </button>
  );
}
