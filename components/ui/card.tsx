import type { HTMLAttributes, ReactNode } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Adds the 3D hover tilt (motion-allowed, pointer devices only). */
  tilt?: boolean;
  className?: string;
  children?: ReactNode;
};

export function Card({
  tilt = false,
  className = "",
  children,
  ...rest
}: CardProps) {
  const classes = [
    "glass rounded-[var(--radius-lg)] p-[var(--space-5)] shadow-[var(--shadow-soft)]",
    tilt ? "tilt-card" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

