import { useRef } from "react";
import type { Profile, Presence, PresenceSpace } from "@/lib/sanctuary/store";
import { PixelAvatar } from "@/islands/sanctuary/PixelAvatar";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";

interface SceneMember {
  profile: Profile;
  presence: Presence;
  isCurrentUser: boolean;
}

interface ScenePanelProps {
  title: string;
  subtitle: string;
  badge: string;
  backgroundUrl: string;
  members: SceneMember[];
  space: PresenceSpace;
}

const sceneSlots = {
  solo: [{ left: "50%", bottom: "16%", translate: "-translate-x-1/2" }],
  library: [
    { left: "16%", bottom: "20%", translate: "-translate-x-1/2" },
    { left: "37%", bottom: "15%", translate: "-translate-x-1/2" },
    { left: "60%", bottom: "19%", translate: "-translate-x-1/2" },
    { left: "82%", bottom: "14%", translate: "-translate-x-1/2" },
  ],
  garden: [
    { left: "16%", bottom: "18%", translate: "-translate-x-1/2" },
    { left: "37%", bottom: "26%", translate: "-translate-x-1/2" },
    { left: "60%", bottom: "15%", translate: "-translate-x-1/2" },
    { left: "82%", bottom: "24%", translate: "-translate-x-1/2" },
  ],
} as const;

function getBubbleText(member: SceneMember) {
  if (member.presence.message) {
    return member.presence.message.length > 18
      ? `${member.presence.message.slice(0, 18)}…`
      : member.presence.message;
  }

  if (member.presence.state === "studying") {
    return "Estudiando";
  }

  if (member.presence.state === "break") {
    return "Descansando";
  }

  if (member.presence.state === "away") {
    return "Ausente";
  }

  return "Disponible";
}

export function ScenePanel({
  title,
  subtitle,
  badge,
  backgroundUrl,
  members,
  space,
}: ScenePanelProps) {
  const slots = sceneSlots[space];
  const visibleMembers = members.slice(0, slots.length);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useGsapReveal(rootRef);

  return (
    <div
      ref={rootRef}
      className="relative overflow-hidden bg-surface-container-lowest pixel-border"
    >
      <div
        className="absolute inset-0 bg-cover bg-center opacity-28"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,18,16,0.38)_0%,rgba(24,18,16,0.22)_26%,rgba(24,18,16,0.88)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,185,97,0.16),transparent_28%),radial-gradient(circle_at_50%_88%,rgba(173,208,168,0.14),transparent_20%)]" />

      <div className="relative min-h-[28rem] p-6 md:min-h-[30rem] md:p-8">
        <div className="gsap-rise mb-6 max-w-lg">
          <div className="mb-3 inline-flex items-center gap-2 border-l-4 border-primary bg-secondary-container px-3 py-1">
            <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-primary-fixed">
              {badge}
            </span>
          </div>
          <h2 className="text-3xl font-headline font-black uppercase tracking-tighter text-on-surface md:text-4xl">
            {title}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-on-surface-variant">
            {subtitle}
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-surface via-surface/70 to-transparent" />
        <div className="absolute left-1/2 bottom-10 h-36 w-[78%] -translate-x-1/2 skew-x-[-24deg] rounded-[0.6rem] border-2 border-primary/20 bg-[linear-gradient(180deg,rgba(255,185,97,0.06)_0%,rgba(41,31,28,0.82)_100%)] shadow-[0_26px_0_rgba(0,0,0,0.24)]" />
        <div className="absolute left-1/2 bottom-[8.3rem] h-5 w-[62%] -translate-x-1/2 skew-x-[-24deg] border-x border-primary/10 bg-white/4" />
        {space === "library" && (
          <>
            <div className="absolute left-[18%] bottom-[8.5rem] h-20 w-16 border-2 border-surface-container-highest bg-surface-container-high/70" />
            <div className="absolute right-[18%] bottom-[8.5rem] h-20 w-16 border-2 border-surface-container-highest bg-surface-container-high/70" />
            <div className="absolute left-1/2 bottom-[11.5rem] h-14 w-44 -translate-x-1/2 skew-x-[-18deg] border-2 border-surface-container-highest bg-surface-container-high/70" />
          </>
        )}
        {space === "garden" && (
          <>
            <div className="absolute left-[14%] bottom-[8rem] h-16 w-3 bg-tertiary/30" />
            <div className="absolute left-[22%] bottom-[8rem] h-20 w-4 bg-tertiary/40" />
            <div className="absolute right-[15%] bottom-[8rem] h-18 w-3 bg-tertiary/30" />
            <div className="absolute right-[23%] bottom-[8rem] h-24 w-4 bg-tertiary/45" />
          </>
        )}

        {visibleMembers.map((member, index) => {
          const slot = slots[index];
          return (
            <div
              key={member.profile.id}
              className={`gsap-rise gsap-drift absolute ${slot.translate}`}
              style={{ left: slot.left, bottom: slot.bottom }}
            >
              <div className="absolute -top-9 left-1/2 max-w-[8.5rem] -translate-x-1/2 overflow-hidden text-ellipsis whitespace-nowrap rounded-none border-2 border-surface-container-highest bg-surface px-3 py-1 text-center font-headline text-[10px] font-bold uppercase tracking-widest text-primary shadow-[0_4px_0_rgba(0,0,0,0.25)]">
                {getBubbleText(member)}
              </div>
              <PixelAvatar
                avatar={member.profile.avatar}
                state={member.presence.state}
                name={member.isCurrentUser ? "Tú" : member.profile.displayName}
                size={space === "solo" ? "lg" : "md"}
                highlighted={member.isCurrentUser}
              />
            </div>
          );
        })}

        {members.length > slots.length && (
          <div className="gsap-rise absolute right-5 bottom-5 rounded-none border-2 border-surface-container-highest bg-surface px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
            +{members.length - slots.length} más en sala
          </div>
        )}
      </div>
    </div>
  );
}
