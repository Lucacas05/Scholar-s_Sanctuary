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
