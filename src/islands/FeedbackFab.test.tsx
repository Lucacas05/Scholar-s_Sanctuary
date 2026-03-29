import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackFab } from "./FeedbackFab";

const STORAGE_KEY = "lumina:feedback";

const store: Record<string, string> = {};
const fakeStorage: Storage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v;
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
  key: () => null,
  get length() {
    return Object.keys(store).length;
  },
};

beforeEach(() => {
  fakeStorage.clear();
  vi.stubGlobal("localStorage", fakeStorage);
  HTMLDialogElement.prototype.showModal ??= vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close ??= vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute("open");
  });
});

describe("FeedbackFab", () => {
  it("renders a feedback button", () => {
    render(<FeedbackFab />);
    expect(screen.getByLabelText("Enviar feedback")).toBeDefined();
  });

  it("opens the modal on click", () => {
    render(<FeedbackFab />);
    fireEvent.click(screen.getByLabelText("Enviar feedback"));
    expect(screen.getByText("Feedback")).toBeDefined();
    expect(
      screen.getByPlaceholderText("Describe tu feedback..."),
    ).toBeDefined();
  });

  it("toggles between bug and idea types", () => {
    render(<FeedbackFab />);
    fireEvent.click(screen.getByLabelText("Enviar feedback"));

    const bugBtn = screen.getByRole("button", { name: "Bug" });
    const ideaBtn = screen.getByRole("button", { name: "Idea" });

    // idea is default
    expect(ideaBtn.getAttribute("aria-pressed")).toBe("true");
    expect(bugBtn.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(bugBtn);
    expect(bugBtn.getAttribute("aria-pressed")).toBe("true");
    expect(ideaBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("saves feedback to localStorage on submit", async () => {
    render(<FeedbackFab />);
    fireEvent.click(screen.getByLabelText("Enviar feedback"));

    fireEvent.click(screen.getByRole("button", { name: "Bug" }));
    fireEvent.change(screen.getByPlaceholderText("Describe tu feedback..."), {
      target: { value: "Something broke" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].type).toBe("bug");
    expect(stored[0].comment).toBe("Something broke");
    expect(stored[0].createdAt).toBeDefined();

    // Shows confirmation
    expect(screen.getByText(/guardado/i)).toBeDefined();
  });

  it("does not submit when comment is empty", () => {
    render(<FeedbackFab />);
    fireEvent.click(screen.getByLabelText("Enviar feedback"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("closes modal on X button", () => {
    render(<FeedbackFab />);
    fireEvent.click(screen.getByLabelText("Enviar feedback"));
    expect(screen.getByText("Feedback")).toBeDefined();

    fireEvent.click(screen.getByLabelText("Cerrar"));
  });
});
