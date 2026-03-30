import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "@/islands/sanctuary/Spinner";

describe("Spinner", () => {
  it("renders with role=status", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("shows label text when provided", () => {
    render(<Spinner label="Cargando…" />);
    expect(screen.getByText("Cargando…")).toBeTruthy();
  });

  it("renders without label when not provided", () => {
    const { container } = render(<Spinner />);
    const status = container.querySelector('[role="status"]')!;
    expect(status.querySelectorAll("span")).toHaveLength(0);
  });

  it("applies small size class", () => {
    const { container } = render(<Spinner size="sm" />);
    const spinner =
      container.querySelector('[role="status"]')!.firstElementChild!;
    expect(spinner.className).toContain("h-4");
    expect(spinner.className).toContain("w-4");
  });

  it("applies medium size class by default", () => {
    const { container } = render(<Spinner />);
    const spinner =
      container.querySelector('[role="status"]')!.firstElementChild!;
    expect(spinner.className).toContain("h-6");
    expect(spinner.className).toContain("w-6");
  });
});
