import React, { forwardRef, useImperativeHandle } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SoloRoom } from "@/islands/sanctuary/SoloRoom";
import { SharedLibraryRoom } from "@/islands/sanctuary/SharedLibraryRoom";
import { GardenRoom } from "@/islands/sanctuary/GardenRoom";
import { AvatarStudio } from "@/islands/sanctuary/AvatarStudio";
import { ChroniclesArchive } from "@/islands/sanctuary/ChroniclesArchive";
import { ScribeGuild } from "@/islands/sanctuary/ScribeGuild";
import { HubSocialSpaces } from "@/islands/sanctuary/HubSocialSpaces";
import { OnboardingFlow } from "@/islands/sanctuary/OnboardingFlow";
import {
  __resetSanctuaryStoreForTests,
  sanctuaryActions,
} from "@/lib/sanctuary/store";

vi.mock("@/islands/sanctuary/useGsapReveal", () => ({
  useGsapReveal: () => {},
}));

vi.mock("@/lib/sanctuary/realtime", () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  onMessage: vi.fn(() => () => {}),
  sendPresenceUpdate: vi.fn(),
}));

vi.mock("@/islands/sanctuary/SanctuaryCanvasScene", () => ({
  SanctuaryCanvasScene: forwardRef(function MockCanvasScene(
    props: {
      title: string;
      subtitle: string;
      badge: string;
      locked?: boolean;
      lockedLabel?: string;
    },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      iniciarFocus: async () => {},
      iniciarBreak: async () => {},
      mostrarMensaje: () => {},
      actualizarOtrosJugadores: () => {},
    }));

    return (
      <div data-testid="canvas-scene">
        <h2>{props.title}</h2>
        <p>{props.subtitle}</p>
        <span>{props.badge}</span>
        {props.locked ? <p>{props.lockedLabel}</p> : null}
      </div>
    );
  }),
}));

function authenticate() {
  sanctuaryActions.connectGitHubAccount({
    id: "github-1",
    displayName: "Faby",
    username: "faby",
  });
  sanctuaryActions.completeOnboarding({
    displayName: "Faby",
    goal: "Mantener una racha estable",
    preferredStartPath: "/biblioteca-compartida",
  });
}

describe("vistas principales del santuario", () => {
  beforeEach(() => {
    __resetSanctuaryStoreForTests();
  });

  it("renderiza el hub social de la biblioteca", () => {
    render(<HubSocialSpaces />);
    expect(screen.getAllByText("Inicia sesión para entrar")).toHaveLength(2);
  });

  it("renderiza el santuario silencioso", () => {
    authenticate();
    render(<SoloRoom backgroundUrl="/site/library-hero.jpg" />);
    expect(screen.getAllByText(/Santuario silencioso/i).length).toBeGreaterThan(
      0,
    );
  });

  it("renderiza la biblioteca compartida", () => {
    render(<SharedLibraryRoom backgroundUrl="/site/silent-wing.jpg" />);
    expect(
      screen.getAllByText(/Biblioteca compartida/i).length,
    ).toBeGreaterThan(0);
  });

  it("renderiza el jardín", () => {
    render(<GardenRoom backgroundUrl="/site/garden-terrace.jpg" />);
    expect(screen.getByText(/Jardín de descanso/i)).toBeTruthy();
  });

  it("renderiza refinar", () => {
    authenticate();
    render(<AvatarStudio />);
    expect(screen.getByText("Parte superior")).toBeTruthy();
  });

  it("renderiza crónicas", async () => {
    authenticate();
    render(<ChroniclesArchive />);
    expect(screen.getByText("Crónicas")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText("Analíticas de foco")).toBeTruthy();
    });
  });

  it("renderiza social en modo restringido", () => {
    render(<ScribeGuild />);
    expect(screen.getByText("Acceso restringido")).toBeTruthy();
  });

  it("usa el id del amigo al eliminar y solo muestra salas propias al invitar", async () => {
    authenticate();

    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (url.includes("/api/friends") && !url.includes("/requests")) {
          return new Response(
            JSON.stringify({
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
            }),
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        if (url.includes("/api/friends/requests")) {
          return new Response(
            JSON.stringify({
              incoming: [],
              outgoing: [],
            }),
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        if (url.includes("/api/rooms") && !url.includes("/invite")) {
          return new Response(
            JSON.stringify({
              rooms: [
                {
                  code: "OWN1",
                  name: "Sala propia",
                  ownerId: "github-1",
                  privacy: "private",
                  memberCount: 1,
                  createdAt: "2026-03-29T00:00:00.000Z",
                },
                {
                  code: "JOIN1",
                  name: "Sala ajena",
                  ownerId: "github-99",
                  privacy: "private",
                  memberCount: 2,
                  createdAt: "2026-03-29T00:00:00.000Z",
                },
              ],
            }),
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        if (url.includes("/api/rooms/OWN1/invite")) {
          return new Response(JSON.stringify({ invitations: [] }), {
            headers: {
              "Content-Type": "application/json",
            },
          });
        }

        if (url.endsWith("/api/rooms/invitations")) {
          return new Response(JSON.stringify({ invitations: [] }), {
            headers: {
              "Content-Type": "application/json",
            },
          });
        }

        if (
          url.endsWith("/api/friends/github-2") &&
          init?.method === "DELETE"
        ) {
          return new Response(JSON.stringify({ ok: true }), {
            headers: {
              "Content-Type": "application/json",
            },
          });
        }

        return new Response(JSON.stringify({}), {
          headers: {
            "Content-Type": "application/json",
          },
        });
      },
    );

    vi.stubGlobal("fetch", fetchMock);

    render(<ScribeGuild />);

    await waitFor(() => {
      expect(screen.getByText("Lucas")).toBeTruthy();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Invitar al Santuario/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sala propia/i })).toBeTruthy();
    });

    expect(screen.queryByRole("button", { name: /Sala ajena/i })).toBeNull();

    fireEvent.click(screen.getByLabelText("Eliminar a Lucas"));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            input === "/api/friends/github-2" && init?.method === "DELETE",
        ),
      ).toBe(true);
    });
  });

  it("muestra feedback visible cuando unirse a una sala falla", async () => {
    authenticate();

    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (url.includes("/api/friends") && !url.includes("/requests")) {
          return new Response(JSON.stringify({ friends: [] }), {
            headers: {
              "Content-Type": "application/json",
            },
          });
        }

        if (url.includes("/api/friends/requests")) {
          return new Response(
            JSON.stringify({
              incoming: [],
              outgoing: [],
            }),
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        if (url.endsWith("/api/rooms")) {
          return new Response(JSON.stringify({ rooms: [] }), {
            headers: {
              "Content-Type": "application/json",
            },
          });
        }

        if (url.endsWith("/api/rooms/invitations")) {
          return new Response(JSON.stringify({ invitations: [] }), {
            headers: {
              "Content-Type": "application/json",
            },
          });
        }

        if (
          url.endsWith("/api/rooms/ROOM123/join") &&
          init?.method === "POST"
        ) {
          return new Response(
            JSON.stringify({
              error: "Private room requires a valid invitation",
            }),
            {
              headers: {
                "Content-Type": "application/json",
              },
              status: 403,
            },
          );
        }

        return new Response(JSON.stringify({}), {
          headers: {
            "Content-Type": "application/json",
          },
        });
      },
    );

    vi.stubGlobal("fetch", fetchMock);

    render(<ScribeGuild />);

    fireEvent.change(screen.getByPlaceholderText("Codigo de sala..."), {
      target: { value: "ROOM123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Entrar$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Private room requires a valid invitation",
      );
    });
  });

  it("muestra solicitudes enviadas con respuesta anidada del API", async () => {
    authenticate();

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("/api/friends") && !url.includes("/requests")) {
        return new Response(JSON.stringify({ friends: [] }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/api/friends/requests")) {
        return new Response(
          JSON.stringify({
            incoming: [],
            outgoing: [
              {
                id: "req-1",
                user: {
                  id: "github-3",
                  username: "ana",
                  displayName: "Ana",
                  avatarUrl: null,
                },
              },
            ],
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/rooms")) {
        return new Response(JSON.stringify({ rooms: [] }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/api/rooms/invitations")) {
        return new Response(JSON.stringify({ invitations: [] }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" },
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ScribeGuild />);

    await waitFor(() => {
      expect(screen.getByText(/Solicitudes/)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/Solicitudes/));

    await waitFor(() => {
      expect(screen.getByText("Ana")).toBeTruthy();
    });
    expect(screen.getByText("@ana")).toBeTruthy();
    expect(screen.getByText("Pendiente")).toBeTruthy();
  });

  it("muestra error cuando falla la carga de solicitudes", async () => {
    authenticate();

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("/api/friends") && !url.includes("/requests")) {
        return new Response(JSON.stringify({ friends: [] }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/api/friends/requests")) {
        return new Response("Internal Server Error", { status: 500 });
      }

      if (url.endsWith("/api/rooms")) {
        return new Response(JSON.stringify({ rooms: [] }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/api/rooms/invitations")) {
        return new Response(JSON.stringify({ invitations: [] }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" },
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ScribeGuild />);

    await waitFor(() => {
      expect(screen.getByText(/Solicitudes/)).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/Solicitudes/));

    await waitFor(() => {
      expect(
        screen.getByText("No se pudieron cargar las solicitudes enviadas."),
      ).toBeTruthy();
    });
  });

  it("renderiza onboarding por pasos", () => {
    render(
      <OnboardingFlow
        initialUser={{
          id: "github-1",
          displayName: "Faby",
          username: "faby",
        }}
        nextPath="/biblioteca-compartida"
      />,
    );

    expect(screen.getByText("Paso 1 de 3")).toBeTruthy();
    fireEvent.click(screen.getByText("Continuar"));
    expect(screen.getByText("Paso 2 de 3")).toBeTruthy();
  });
});
