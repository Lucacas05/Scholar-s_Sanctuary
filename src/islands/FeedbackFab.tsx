import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquarePlus, Bug, Lightbulb, X, Send } from "lucide-react";

type FeedbackType = "bug" | "idea";

interface FeedbackEntry {
  type: FeedbackType;
  comment: string;
  createdAt: string;
}

const STORAGE_KEY = "lumina:feedback";

function loadFeedback(): FeedbackEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FeedbackEntry[]) : [];
  } catch {
    return [];
  }
}

function saveFeedback(entry: FeedbackEntry): void {
  const entries = loadFeedback();
  entries.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function FeedbackFab() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("idea");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openModal = useCallback(() => {
    setOpen(true);
    setSubmitted(false);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
    setComment("");
    setType("idea");
    setSubmitted(false);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      textareaRef.current?.focus();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed) return;

    saveFeedback({
      type,
      comment: trimmed,
      createdAt: new Date().toISOString(),
    });
    setSubmitted(true);
    setTimeout(closeModal, 1200);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label="Enviar feedback"
        className="fixed left-4 bottom-4 z-40 md:left-auto md:right-6 md:bottom-20 flex h-12 w-12 items-center justify-center bg-secondary text-on-secondary border-b-[3px] border-on-secondary-fixed-variant bezel-button shadow-2xl hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <MessageSquarePlus size={20} />
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] border-2 border-outline-variant bg-surface-container p-0 text-on-surface pixel-border backdrop:bg-black/60 open:flex open:flex-col"
      >
        <header className="flex items-center justify-between border-b-2 border-outline-variant px-5 py-3">
          <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary">
            Feedback
          </h2>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Cerrar"
            className="text-outline hover:text-on-surface"
          >
            <X size={16} />
          </button>
        </header>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 px-5 py-8">
            <span className="text-3xl" role="img" aria-label="gracias">
              &#10024;
            </span>
            <p className="font-headline text-xs font-bold uppercase tracking-widest text-tertiary">
              Guardado. Gracias!
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 px-5 py-4"
          >
            <fieldset className="flex gap-3">
              <legend className="sr-only">Tipo de feedback</legend>
              {[
                { value: "bug" as const, icon: Bug, label: "Bug" },
                { value: "idea" as const, icon: Lightbulb, label: "Idea" },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  aria-pressed={type === value}
                  className={`flex flex-1 items-center justify-center gap-2 border-2 px-3 py-2 font-headline text-xs font-bold uppercase tracking-widest transition-colors ${
                    type === value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-outline-variant text-outline hover:border-primary/50 hover:text-on-surface"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </fieldset>

            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe tu feedback..."
              required
              rows={4}
              className="resize-none border-2 border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
            />

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary border-b-[3px] border-on-primary-fixed-variant px-6 py-2 font-headline text-xs font-bold uppercase tracking-widest bezel-button hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Send size={14} />
              Enviar
            </button>
          </form>
        )}
      </dialog>
    </>
  );
}
