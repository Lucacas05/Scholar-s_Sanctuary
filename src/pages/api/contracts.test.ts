import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { GET as getFriends } from "./friends/index";
import { DELETE as deleteFriend } from "./friends/[friendId]";
import { POST as inviteToRoom } from "./rooms/[code]/invite";
import { GET as searchUsers } from "./users/search";

interface TestUser {
  id: string;
  githubId: number;
  username: string;
  displayName: string;
}

function createUserContext(user: TestUser) {
  return {
    locals: {
      user: {
        id: user.id,
        githubId: user.githubId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: null,
      },
    },
  };
}

function createApiContext(options: {
  user: TestUser;
  method?: string;
  url: string;
  params?: Record<string, string>;
  body?: unknown;
}) {
  return {
    ...createUserContext(options.user),
    params: options.params ?? {},
    url: new URL(options.url),
    request: new Request(options.url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
  } as never;
}

function insertUser(user: TestUser) {
  db.prepare(
    `
      INSERT INTO users (id, github_id, username, display_name, avatar_url, state_json)
      VALUES (?, ?, ?, ?, NULL, NULL)
    `,
  ).run(user.id, user.githubId, user.username, user.displayName);
}

async function toJson<T>(response: Response) {
  return (await response.json()) as T;
}

describe("contratos API del santuario", () => {
  beforeEach(() => {
    db.exec(`
      DELETE FROM room_invitations;
      DELETE FROM room_members;
      DELETE FROM rooms;
      DELETE FROM friendships;
      DELETE FROM sessions;
      DELETE FROM achievement_unlocks;
      DELETE FROM pomodoro_sessions;
      DELETE FROM users;
    `);
  });

  it("devuelve la búsqueda de usuarios bajo la clave users", async () => {
    const currentUser = {
      id: "github-1",
      githubId: 1,
      username: "faby",
      displayName: "Faby",
    };
    const friend = {
      id: "github-2",
      githubId: 2,
      username: "lucas",
      displayName: "Lucas",
    };

    insertUser(currentUser);
    insertUser(friend);

    const response = await searchUsers(
      createApiContext({
        user: currentUser,
        url: "https://lumina.test/api/users/search?q=luc",
      }),
    );

    expect(response.status).toBe(200);
    await expect(
      toJson<{
        users: Array<{ id: string; username: string; displayName: string }>;
      }>(response),
    ).resolves.toEqual({
      users: [
        {
          id: "github-2",
          username: "lucas",
          displayName: "Lucas",
          avatarUrl: null,
        },
      ],
    });
  });

  it("expone friendshipId por separado del id del amigo", async () => {
    const currentUser = {
      id: "github-1",
      githubId: 1,
      username: "faby",
      displayName: "Faby",
    };
    const friend = {
      id: "github-2",
      githubId: 2,
      username: "lucas",
      displayName: "Lucas",
    };

    insertUser(currentUser);
    insertUser(friend);
    db.prepare(
      `
        INSERT INTO friendships (id, user_id, friend_id, status)
        VALUES (?, ?, ?, 'accepted')
      `,
    ).run("friendship-1", currentUser.id, friend.id);

    const response = await getFriends(
      createApiContext({
        user: currentUser,
        url: "https://lumina.test/api/friends",
      }),
    );

    expect(response.status).toBe(200);
    await expect(
      toJson<{
        friends: Array<{
          friendshipId: string;
          friend: { id: string; username: string; displayName: string };
        }>;
      }>(response),
    ).resolves.toEqual({
      friends: [
        {
          friendshipId: "friendship-1",
          friend: {
            id: "github-2",
            username: "lucas",
            displayName: "Lucas",
            avatarUrl: null,
            lastSeenAt: null,
          },
        },
      ],
    });
  });

  it("elimina una amistad usando el id del amigo y no el de la relación", async () => {
    const currentUser = {
      id: "github-1",
      githubId: 1,
      username: "faby",
      displayName: "Faby",
    };
    const friend = {
      id: "github-2",
      githubId: 2,
      username: "lucas",
      displayName: "Lucas",
    };

    insertUser(currentUser);
    insertUser(friend);
    db.prepare(
      `
        INSERT INTO friendships (id, user_id, friend_id, status)
        VALUES (?, ?, ?, 'accepted')
      `,
    ).run("friendship-1", currentUser.id, friend.id);

    const response = await deleteFriend({
      ...createUserContext(currentUser),
      params: {
        friendId: friend.id,
      },
    } as never);

    expect(response.status).toBe(200);
    expect(
      db.prepare("SELECT COUNT(*) AS count FROM friendships").get() as {
        count: number;
      },
    ).toEqual({ count: 0 });
  });

  it("bloquea invitaciones cuando el usuario es miembro pero no owner", async () => {
    const owner = {
      id: "github-owner",
      githubId: 10,
      username: "owner",
      displayName: "Owner",
    };
    const guest = {
      id: "github-guest",
      githubId: 11,
      username: "guest",
      displayName: "Guest",
    };
    const target = {
      id: "github-target",
      githubId: 12,
      username: "target",
      displayName: "Target",
    };

    insertUser(owner);
    insertUser(guest);
    insertUser(target);

    db.prepare(
      "INSERT INTO rooms (code, name, owner_id, privacy) VALUES (?, ?, ?, ?)",
    ).run("ROOM1234", "Sala privada", owner.id, "private");
    db.prepare(
      "INSERT INTO room_members (room_code, user_id) VALUES (?, ?)",
    ).run("ROOM1234", owner.id);
    db.prepare(
      "INSERT INTO room_members (room_code, user_id) VALUES (?, ?)",
    ).run("ROOM1234", guest.id);

    const response = await inviteToRoom(
      createApiContext({
        user: guest,
        method: "POST",
        url: "https://lumina.test/api/rooms/ROOM1234/invite",
        params: {
          code: "ROOM1234",
        },
        body: {
          userId: target.id,
          expiresInHours: 72,
        },
      }),
    );

    expect(response.status).toBe(403);
    await expect(toJson<{ error: string }>(response)).resolves.toEqual({
      error: "Only owner can invite to this room",
    });
  });

  it("enforcea foreign keys al escribir en SQLite", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO room_members (room_code, user_id) VALUES (?, ?)",
      ).run("missing-room", "missing-user");
    }).toThrow();
  });
});
