'use client';

export default function Error({ reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-6 text-lg">
      <p>Something went wrong loading this care circle.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="w-full rounded bg-black p-3 text-base font-medium text-white disabled:opacity-50"
      >
        Try again
      </button>
    </div>
  );
}
