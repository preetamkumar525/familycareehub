import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const fieldBase =
  "w-full rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-[var(--space-3)] py-[var(--space-2)] text-[color:var(--color-text)] shadow-[var(--shadow-soft)] placeholder:text-[color:var(--color-text-muted)] transition-[border-color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] disabled:opacity-50";

function joinClasses(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export function Input({ className, ...rest }: InputProps) {
  return <input className={joinClasses(fieldBase, className)} {...rest} />;
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string;
};

export function Textarea({ className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={joinClasses(fieldBase, "min-h-24", className)}
      {...rest}
    />
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  className?: string;
};

export function Select({ className, children, ...rest }: SelectProps) {
  return (
    <select className={joinClasses(fieldBase, className)} {...rest}>
      {children}
    </select>
  );
}

