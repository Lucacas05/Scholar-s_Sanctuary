interface SpinnerProps {
  label?: string;
  size?: "sm" | "md";
}

export function Spinner({ label, size = "md" }: SpinnerProps) {
  const px = size === "sm" ? "h-4 w-4 border-2" : "h-6 w-6 border-[3px]";

  return (
    <div className="flex items-center gap-3" role="status">
      <div
        className={`${px} animate-spin border-outline-variant border-t-primary`}
        style={{ borderRadius: "50%" }}
      />
      {label ? (
        <span className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
          {label}
        </span>
      ) : null}
    </div>
  );
}
