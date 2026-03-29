import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBlockProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBlock({ message, onRetry }: ErrorBlockProps) {
  return (
    <div className="border-2 border-error/40 bg-error/10 px-5 py-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-error" />
        <div className="flex-1">
          <p className="font-headline text-sm font-bold uppercase tracking-tight text-on-surface">
            {message}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 border-2 border-error/40 bg-surface-container px-4 py-2 font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface hover:border-error/70 steps-bezel"
            >
              <RefreshCw size={12} />
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
