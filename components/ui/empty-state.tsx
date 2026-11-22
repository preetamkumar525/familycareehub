import { Card } from "./card";

export type EmptyStateProps = {
  title: string;
  body: string;
  className?: string;
};

export function EmptyState({ title, body, className = "" }: EmptyStateProps) {
  return (
    <Card className={`text-center ${className}`.trim()}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-[var(--space-2)] text-[color:var(--color-text-muted)]">{body}</p>
    </Card>
  );
}

