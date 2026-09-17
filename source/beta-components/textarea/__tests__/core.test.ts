import { describe, expect, it } from "vitest";
import { countCharacters } from "../core/count";
import { fitHeight, heightForRows } from "../core/size";

const metrics = { lineHeight: 20, paddingBlock: 16, borderBlock: 2 };

describe("character count", () => {
  it("counts what a person sees", () => {
    expect(countCharacters("")).toBe(0);
    expect(countCharacters("line one\nline two")).toBe(17);
    expect(countCharacters("👍🏽👍🏽")).toBe(2);
  });
});

describe("auto resize", () => {
  it("measures rows as border-box height", () => {
    expect(heightForRows(1, metrics)).toBe(38);
    expect(heightForRows(3, metrics)).toBe(78);
  });

  it("never shrinks below minRows", () => {
    // One line of content: scrollHeight = 20 + 16 padding.
    expect(fitHeight(36, metrics, 3)).toEqual({ height: 78, overflow: false });
  });

  it("grows with the content", () => {
    expect(fitHeight(136, metrics, 3)).toEqual({ height: 138, overflow: false });
  });

  it("stops at maxRows and reports that it should scroll", () => {
    expect(fitHeight(416, metrics, 3, 5)).toEqual({ height: 118, overflow: true });
    expect(fitHeight(96, metrics, 3, 5)).toEqual({ height: 98, overflow: false });
  });

  it("keeps maxRows from undercutting minRows", () => {
    expect(fitHeight(36, metrics, 4, 2).height).toBe(98);
  });
});
