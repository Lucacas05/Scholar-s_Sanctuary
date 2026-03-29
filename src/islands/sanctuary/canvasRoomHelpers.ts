import type { Profile, Presence } from "@/lib/sanctuary/store";
import { getRemoteSlot } from "@/lib/sanctuary/canvas/sceneMaps";
import type {
  CanvasRemotePlayer,
  SceneKind,
} from "@/lib/sanctuary/canvas/types";

export interface SceneMemberLike {
  profile: Profile;
  presence: Presence;
  isCurrentUser: boolean;
}

export function toCanvasRemotePlayers(
  sceneKind: SceneKind,
  members: SceneMemberLike[],
): CanvasRemotePlayer[] {
  return members
    .filter((member) => !member.isCurrentUser)
    .map((member, index) => {
      const slot = getRemoteSlot(sceneKind, index);
      return {
        id: member.profile.id,
        displayName: member.profile.displayName,
        avatar: member.profile.avatar,
        tileX: slot.x,
        tileY: slot.y,
        facing:
          member.presence.state === "studying"
            ? "up"
            : index % 2 === 0
              ? "left"
              : "right",
        state:
          member.presence.state === "offline" ||
          member.presence.state === "away"
            ? "idle"
            : member.presence.state,
        message: member.presence.message,
      };
    });
}
