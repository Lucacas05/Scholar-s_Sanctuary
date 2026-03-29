import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center border-2 border-outline-variant bg-surface-container-low">
        <Icon size={24} className="text-outline-variant" />
      </div>
      <p className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
        {title}
      </p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-on-surface-variant">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
