import { describe, expect, it } from "vitest";
import { liveness } from "../core/live";

describe("liveness", () => {
  it("interrupts for problems", () => {
    // Someone whose card was declined needs to hear it now, not after the
    // paragraph being read finishes.
    expect(liveness("danger")).toEqual({ role: "alert", live: "assertive" });
    expect(liveness("warning")).toEqual({ role: "alert", live: "assertive" });
  });

  it("waits its turn for everything else", () => {
    for (const variant of ["info", "success", "neutral"] as const) {
      expect(liveness(variant)).toEqual({ role: "status", live: "polite" });
    }
  });
});
