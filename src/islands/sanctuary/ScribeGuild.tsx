import { useRef } from "react";
import {
  ArrowUpRight,
  Crown,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  Shield,
  Sword,
  Users,
} from "lucide-react";
import { siteContent } from "@/data/site";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";

const { social } = siteContent;

const onlineCount = social.students.filter((s) => s.status === "online").length;
const totalCount = social.students.length;

/* ------------------------------------------------------------------ */
/*  Shared button base classes (matching PixelButton patterns)        */
/* ------------------------------------------------------------------ */
const btnBase =
  "inline-flex items-center justify-center gap-2 font-headline font-bold uppercase tracking-widest steps-bezel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function ScribeGuild() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useGsapReveal(rootRef);

  return (
    <div ref={rootRef} className="mx-auto max-w-7xl space-y-8 pb-8">
      {/* ====== HERO ====== */}
      <section className="gsap-rise relative overflow-hidden bg-surface-container-low pixel-border">
        <div className="absolute inset-0 dither-bg opacity-[0.12]" />
        <div className="absolute top-0 right-0 h-56 w-56 bg-tertiary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="max-w-xl">
            <div className="mb-2 inline-block bg-tertiary-container px-3 py-1">
              <span className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-on-tertiary-container">
                {social.badge}
              </span>
            </div>
            <h2 className="text-4xl font-headline font-black uppercase tracking-tighter text-primary leading-none md:text-5xl">
              {social.title}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-on-surface-variant font-body">
              {social.description}
            </p>
          </div>

          <button
            type="button"
            className={`${btnBase} bg-tertiary-container text-on-tertiary-container border-b-4 border-on-tertiary-fixed-variant px-8 py-4 text-xs hover:brightness-105`}
          >
            <Sword size={16} />
            {social.missionCta}
          </button>
        </div>
      </section>

      {/* ====== MAIN GRID ====== */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* ---- LEFT: Student Roster ---- */}
        <section className="xl:col-span-8">
          <div className="gsap-rise bg-surface-container pixel-border">
            {/* Roster header */}
            <div className="flex flex-col gap-3 border-b-4 border-surface-container-highest p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center border-2 border-primary bg-surface-container-highest">
                  <Users size={16} className="text-primary" />
                </div>
                <h3 className="text-lg font-headline font-black uppercase tracking-tighter text-on-surface">
                  {social.rosterTitle}
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-tertiary">
                  {onlineCount} {social.rosterOnline}
                </span>
                <span className="text-outline">/</span>
                <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  {totalCount} {social.rosterTotal}
                </span>
              </div>
            </div>

            {/* Student list */}
            <div className="divide-y divide-surface-container-highest">
              {social.students.map((student) => {
                const isOnline = student.status === "online";
                return (
                  <div
                    key={student.name}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {/* Avatar + Info */}
                    <div className="flex items-center gap-4">
                      {/* Pixel avatar */}
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center border-4 border-surface-container-highest bg-surface-container-low">
                        <span className="font-headline text-sm font-black text-primary">
                          {student.avatar}
                        </span>
                        {/* Status dot */}
                        <span
                          className={`absolute -bottom-1 -right-1 h-3 w-3 border-2 border-surface-container ${
                            isOnline
                              ? "bg-tertiary animate-pulse"
                              : "bg-primary-container"
                          }`}
                        />
                      </div>

                      <div>
                        <p className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                          {student.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-primary">
                            Nv. {student.level}
                          </span>
                          <span className="text-outline">|</span>
                          <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">
                            {student.title}
                          </span>
                        </div>
                        <p
                          className={`mt-1 font-headline text-[10px] font-bold uppercase tracking-[0.2em] ${
                            isOnline ? "text-tertiary" : "text-primary-container"
                          }`}
                        >
                          {student.statusLabel}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {isOnline ? (
                        <button
                          type="button"
                          className={`${btnBase} bg-primary text-on-primary border-b-[3px] border-on-primary-fixed-variant px-4 py-2 text-[10px] hover:brightness-105`}
                        >
                          <Shield size={12} />
                          {social.inviteCta}
                        </button>
                      ) : (
                        <span
                          className={`${btnBase} bg-surface-container-highest text-outline border-2 border-outline-variant/30 px-4 py-2 text-[10px] cursor-not-allowed opacity-60`}
                        >
                          <Lock size={12} />
                          {social.inviteCta}
                        </span>
                      )}
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center border-2 border-outline-variant/50 bg-surface-container-highest text-outline hover:border-primary/50 hover:text-primary steps-bezel"
                        aria-label={`${social.mailCta} a ${student.name}`}
                      >
                        <Mail size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* More link */}
            <div className="border-t-4 border-surface-container-highest p-4">
              <a
                href="#"
                className="inline-flex items-center gap-1 font-headline text-xs font-bold uppercase tracking-widest text-primary hover:underline"
              >
                {social.moreScholars}
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </section>

        {/* ---- RIGHT: Party + Board ---- */}
        <aside className="space-y-6 xl:col-span-4">
          {/* Party Panel */}
          <div className="gsap-rise bg-surface-container pixel-border">
            <div className="border-b-4 border-surface-container-highest p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center border-2 border-secondary bg-surface-container-highest">
                  <Crown size={16} className="text-secondary" />
                </div>
                <h3 className="text-lg font-headline font-black uppercase tracking-tighter text-secondary">
                  {social.partyTitle}
                </h3>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {/* Leader card */}
              <div className="border-2 border-primary bg-surface-container-low p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border-4 border-primary bg-primary-container">
                    <span className="font-headline text-sm font-black text-primary">
                      {social.party.leader.avatar}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                      {social.party.leader.name}
                    </p>
                    <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">
                      {social.party.leader.title}
                    </p>
                  </div>
                </div>

                {/* Level bar */}
                <div className="mt-3">
                  <div className="h-3 w-full bg-surface-container-highest">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(social.party.leader.level / social.party.leader.maxLevel) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">
                      {social.partyLeaderLabel}
                    </span>
                    <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-primary">
                      Nv. {social.party.leader.level}/{social.party.leader.maxLevel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Empty slots */}
              {Array.from({ length: social.party.slots }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className="flex w-full items-center gap-3 border-2 border-dashed border-outline-variant/50 bg-surface-container-low p-4 text-left hover:border-primary/50 steps-bezel group"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-dashed border-outline-variant/30 bg-surface-container">
                    <Plus size={16} className="text-outline group-hover:text-primary steps-bezel" />
                  </div>
                  <div>
                    <p className="font-headline text-sm font-bold uppercase tracking-tight text-outline group-hover:text-on-surface steps-bezel">
                      {social.emptySlotLabel}
                    </p>
                    <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline-variant">
                      {social.emptySlotHint}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Announcements Board */}
          <div className="gsap-rise bg-surface-container pixel-border">
            <div className="border-b-4 border-surface-container-highest p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center border-2 border-tertiary bg-surface-container-highest">
                  <MessageSquare size={16} className="text-tertiary" />
                </div>
                <h3 className="text-lg font-headline font-black uppercase tracking-tighter text-tertiary">
                  {social.boardTitle}
                </h3>
              </div>
            </div>

            <div className="space-y-0 divide-y divide-surface-container-highest">
              {social.announcements.map((msg) => {
                const accentBorder =
                  msg.accent === "primary"
                    ? "border-primary"
                    : msg.accent === "tertiary"
                      ? "border-tertiary"
                      : "border-secondary";

                return (
                  <div key={msg.author + msg.time} className="p-5">
                    <div
                      className={`border-l-4 ${accentBorder} bg-surface-container-low pixel-border-inset px-4 py-3`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-headline text-xs font-black uppercase tracking-tight text-on-surface">
                          {msg.author}
                        </span>
                        <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">
                          {msg.time}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-on-surface-variant font-body">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
