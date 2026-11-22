import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  className?: string;
};

const base =
  "press inline-flex items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-md)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-semibold no-underline transition-[filter,background-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "text-[color:var(--color-on-primary)] [background-image:var(--gradient-brand)] shadow-[var(--shadow-soft)] hover:brightness-110 hover:shadow-[var(--shadow-lift)]",
  secondary:
    "text-[color:var(--color-on-primary)] bg-[color:var(--color-secondary)] shadow-[var(--shadow-soft)] hover:brightness-110",
  ghost:
    "text-[color:var(--color-primary-ink)] bg-transparent hover:bg-[color:var(--color-border)]",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const classes = [base, variants[variant], className].filter(Boolean).join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}

