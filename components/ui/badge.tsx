import type { HTMLAttributes, ReactNode } from "react";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  className?: string;
  children?: ReactNode;
};

const base =
  "inline-flex items-center rounded-[var(--radius-full)] px-[var(--space-3)] py-[var(--space-1)] text-xs font-semibold tracking-wide";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-[color:var(--tone-neutral-bg)] text-[color:var(--tone-neutral-fg)]",
  info: "bg-[color:var(--tone-info-bg)] text-[color:var(--tone-info-fg)]",
  success: "bg-[color:var(--tone-success-bg)] text-[color:var(--tone-success-fg)]",
  warning: "bg-[color:var(--tone-warning-bg)] text-[color:var(--tone-warning-fg)]",
  danger: "bg-[color:var(--tone-danger-bg)] text-[color:var(--tone-danger-fg)]",
  accent: "bg-[color:var(--tone-accent-bg)] text-[color:var(--tone-accent-fg)]",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
  ...rest
}: BadgeProps) {
  const classes = [base, tones[tone], className].filter(Boolean).join(" ");

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}

