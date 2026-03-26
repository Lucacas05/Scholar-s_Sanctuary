import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

interface StudyTimerProps {
  initialMinutes?: number;
  labels: {
    namePlate?: string;
    start: string;
    pause: string;
    reset: string;
  };
}

export function StudyTimer({ initialMinutes = 25, labels }: StudyTimerProps) {
  const initialSeconds = initialMinutes * 60;
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) {
      if (timeLeft <= 0) {
        setIsActive(false);
      }
      return;
    }

    const interval = window.setInterval(() => {
      setTimeLeft((current) => current - 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-surface-container-high pixel-border p-1 shadow-2xl max-w-sm w-full relative">
      <div className="absolute -top-4 left-4 bg-secondary-container text-primary-fixed px-3 py-1 font-headline font-bold text-xs uppercase tracking-tighter z-10">
        {labels.namePlate ?? "Foco profundo"}
      </div>
      <div className="bg-surface-container-highest p-6 flex flex-col items-center gap-2">
        <div className="font-headline text-7xl md:text-8xl font-black text-primary tracking-widest antialiased drop-shadow-[4px_4px_0px_#472a00]">
          {formatTime(timeLeft)}
        </div>
        <div className="flex gap-4 mt-4">
          <button
            type="button"
            onClick={() => setIsActive((current) => !current)}
            className="bg-primary text-on-primary border-b-[3px] border-on-primary-fixed-variant px-6 py-2 text-xs font-headline font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 steps-bezel hover:brightness-105"
          >
            {isActive ? <Pause size={16} /> : <Play size={16} />}
            {isActive ? labels.pause : labels.start}
          </button>
          <button
            type="button"
            onClick={() => {
              setTimeLeft(initialSeconds);
              setIsActive(false);
            }}
            className="bg-tertiary text-on-tertiary border-b-[3px] border-on-tertiary-fixed-variant px-6 py-2 text-xs font-headline font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 steps-bezel hover:brightness-105"
          >
            <RotateCcw size={16} />
            {labels.reset}
          </button>
        </div>
      </div>
    </div>
  );
}
