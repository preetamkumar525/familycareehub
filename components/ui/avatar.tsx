type AvatarProps = {
  name: string | null | undefined;
  className?: string;
};

// Initials from the first letter of the first two words; '?' when there is no name.
// Decorative only (aria-hidden): the caller renders the visible name text.
export function Avatar({ name, className = "" }: AvatarProps) {
  const initials = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  const classes = [
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-full)] text-sm font-semibold text-[color:var(--color-on-primary)] shadow-[var(--shadow-soft)] [background-image:linear-gradient(135deg,var(--color-primary),var(--color-primary-hover))]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-hidden="true">
      {initials || "?"}
    </span>
  );
}
