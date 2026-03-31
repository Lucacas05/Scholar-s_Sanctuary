import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetSanctuaryStoreForTests,
  getFullState,
  getCurrentPresence,
  getRoomMembers,
  sanctuaryActions,
} from "./store";
import type { RoomMemberPresence } from "@/lib/server/ws-types";

function connectUser(id: string, displayName: string, username: string) {
  sanctuaryActions.connectGitHubAccount({ id, displayName, username });
}

function makeMemberPresence(
  overrides: Partial<RoomMemberPresence> & { userId: string },
): RoomMemberPresence {
  return {
    username: overrides.userId,
    displayName: overrides.userId,
    avatar: {
      sex: "masculino",
      skinTone: "peach",
      hairStyle: "short-01-buzzcut",
      hairColor: "brown",
      accessory: "ninguno",
      upper: "shirt-01-longsleeve",
      upperColor: "navy",
      lower: "pants-03-pants",
      lowerColor: "black",
      socks: "socks-01-ankle",
      socksColor: "white",
    },
    state: "idle",
    phase: "focus",
    status: "idle",
    remainingSeconds: 0,
    message: "",
    ...overrides,
  };
}

describe("room join and player sync", () => {
  beforeEach(() => {
    __resetSanctuaryStoreForTests();
  });

  it("injectRoom + joinPrivateRoom switches to the private room", () => {
    connectUser("host-1", "Host", "host");

    sanctuaryActions.injectRoom("ABCD1234", "Test Room", "host-1", false);
    sanctuaryActions.joinPrivateRoom("ABCD1234");

    const state = getFullState();
    expect(state.currentRoomCode).toBe("ABCD1234");
    expect(state.rooms["ABCD1234"]).toBeDefined();
    expect(state.rooms["ABCD1234"].kind).toBe("private");

    const presence = getCurrentPresence(state);
    expect(presence?.roomCode).toBe("ABCD1234");
    expect(presence?.roomKind).toBe("private");
    expect(presence?.space).toBe("library");
  });

  it("setRemotePresences populates remote member profiles and presences", () => {
    connectUser("host-1", "Host", "host");
    sanctuaryActions.injectRoom("ROOM0001", "Room", "host-1", false);
    sanctuaryActions.joinPrivateRoom("ROOM0001");

    const guest = makeMemberPresence({
      userId: "guest-1",
      displayName: "Guest One",
      username: "guest1",
      state: "studying",
      message: "Focusing hard",
    });

    sanctuaryActions.setRemotePresences([guest]);

    const state = getFullState();
    expect(state.profiles["guest-1"]).toBeDefined();
    expect(state.profiles["guest-1"].displayName).toBe("Guest One");
    expect(state.presences["guest-1"]).toBeDefined();
    expect(state.presences["guest-1"].state).toBe("studying");
    expect(state.presences["guest-1"].roomCode).toBe("ROOM0001");
    expect(state.presences["guest-1"].space).toBe("library");

    const libraryMembers = getRoomMembers(state, "ROOM0001", "library");
    const guestEntry = libraryMembers.find((m) => m.profile.id === "guest-1");
    expect(guestEntry).toBeDefined();
    expect(guestEntry!.profile.displayName).toBe("Guest One");
  });

  it("addRemotePresence adds a new member and updates existing profiles", () => {
    connectUser("host-1", "Host", "host");
    sanctuaryActions.injectRoom("ROOM0002", "Room", "host-1", false);
    sanctuaryActions.joinPrivateRoom("ROOM0002");

    const guest = makeMemberPresence({
      userId: "guest-2",
      displayName: "Guest Two",
      username: "guest2",
      state: "idle",
    });

    sanctuaryActions.addRemotePresence(guest);

    let state = getFullState();
    expect(state.profiles["guest-2"]).toBeDefined();
    expect(state.profiles["guest-2"].displayName).toBe("Guest Two");
    expect(state.presences["guest-2"]).toBeDefined();
    expect(state.rooms["ROOM0002"].memberIds).toContain("guest-2");

    // Update the same member with new avatar/displayName
    const updatedGuest = makeMemberPresence({
      userId: "guest-2",
      displayName: "Guest Two Updated",
      username: "guest2",
      avatar: {
        sex: "femenino",
        skinTone: "tan",
        hairStyle: "short-01-buzzcut",
        hairColor: "black",
        accessory: "ninguno",
        upper: "shirt-01-longsleeve",
        upperColor: "red",
        lower: "pants-03-pants",
        lowerColor: "blue",
        socks: "socks-01-ankle",
        socksColor: "white",
      },
    });

    sanctuaryActions.addRemotePresence(updatedGuest);

    state = getFullState();
    expect(state.profiles["guest-2"].displayName).toBe("Guest Two Updated");
    expect(state.profiles["guest-2"].avatar.upperColor).toBe("red");
  });

  it("removeRemotePresence cleans up member from presences and room", () => {
    connectUser("host-1", "Host", "host");
    sanctuaryActions.injectRoom("ROOM0003", "Room", "host-1", false);
    sanctuaryActions.joinPrivateRoom("ROOM0003");

    sanctuaryActions.addRemotePresence(
      makeMemberPresence({ userId: "guest-3" }),
    );

    let state = getFullState();
    expect(state.presences["guest-3"]).toBeDefined();

    sanctuaryActions.removeRemotePresence("guest-3");

    state = getFullState();
    expect(state.presences["guest-3"]).toBeUndefined();
    expect(state.rooms["ROOM0003"].memberIds).not.toContain("guest-3");
  });

  it("updateRemotePresence changes state and space correctly", () => {
    connectUser("host-1", "Host", "host");
    sanctuaryActions.injectRoom("ROOM0004", "Room", "host-1", false);
    sanctuaryActions.joinPrivateRoom("ROOM0004");

    sanctuaryActions.addRemotePresence(
      makeMemberPresence({ userId: "guest-4", state: "idle" }),
    );

    sanctuaryActions.updateRemotePresence({
      userId: "guest-4",
      state: "studying",
      phase: "focus",
      status: "running",
      remainingSeconds: 1500,
      message: "Deep focus",
    });

    let state = getFullState();
    expect(state.presences["guest-4"].state).toBe("studying");
    expect(state.presences["guest-4"].space).toBe("library");

    sanctuaryActions.updateRemotePresence({
      userId: "guest-4",
      state: "break",
      phase: "break",
      status: "running",
      remainingSeconds: 300,
      message: "Taking a break",
    });

    state = getFullState();
    expect(state.presences["guest-4"].state).toBe("break");
    expect(state.presences["guest-4"].space).toBe("garden");
  });

  it("selectPublicRoom switches back from private to public", () => {
    connectUser("host-1", "Host", "host");
    sanctuaryActions.injectRoom("ROOM0005", "Room", "host-1", false);
    sanctuaryActions.joinPrivateRoom("ROOM0005");

    expect(getFullState().currentRoomCode).toBe("ROOM0005");

    sanctuaryActions.selectPublicRoom();

    const state = getFullState();
    expect(state.currentRoomCode).toBe("gran-lectorio");
  });

  it("getRoomMembers filters by space correctly", () => {
    connectUser("host-1", "Host", "host");
    sanctuaryActions.injectRoom("ROOM0006", "Room", "host-1", false);
    sanctuaryActions.joinPrivateRoom("ROOM0006");

    sanctuaryActions.addRemotePresence(
      makeMemberPresence({ userId: "lib-user", state: "studying" }),
    );
    sanctuaryActions.addRemotePresence(
      makeMemberPresence({ userId: "garden-user", state: "break" }),
    );

    const state = getFullState();
    const library = getRoomMembers(state, "ROOM0006", "library");
    const garden = getRoomMembers(state, "ROOM0006", "garden");

    expect(library.some((m) => m.profile.id === "lib-user")).toBe(true);
    expect(library.some((m) => m.profile.id === "garden-user")).toBe(false);
    expect(garden.some((m) => m.profile.id === "garden-user")).toBe(true);
    expect(garden.some((m) => m.profile.id === "lib-user")).toBe(false);
  });
});
