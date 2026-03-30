import { describe, expect, it } from "vitest";
import { isAdminUser } from "@/lib/server/admin";

describe("admin access", () => {
  it("trata a los usuarios base como admin por defecto", () => {
    expect(
      isAdminUser({
        username: "Lucacas05",
      }),
    ).toBe(true);

    expect(
      isAdminUser({
        username: "fabiannavarroo",
      }),
    ).toBe(true);
  });
});
