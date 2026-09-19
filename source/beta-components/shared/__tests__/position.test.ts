import { describe, expect, it } from "vitest";
import { placePopover, type AnchorRect, type PlacementOptions } from "../core/position";

const VIEWPORT = { width: 1000, height: 800 };

const anchorAt = (left: number, top: number, width = 120, height = 32): AnchorRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

const options = (overrides: Partial<PlacementOptions> = {}): PlacementOptions => ({
  side: "bottom",
  align: "start",
  gap: 4,
  edge: 8,
  rtl: false,
  fitHeight: false,
  minHeight: 140,
  ...overrides,
});

describe("below the anchor", () => {
  it("sits under the anchor, aligned to its left edge", () => {
    const placement = placePopover(anchorAt(100, 100), { width: 200, height: 150 }, VIEWPORT, options());
    expect(placement).toMatchObject({ side: "bottom", left: 100, top: 136 });
  });

  it("aligns to the right edge when asked", () => {
    const placement = placePopover(
      anchorAt(100, 100),
      { width: 200, height: 150 },
      VIEWPORT,
      options({ align: "end" }),
    );
    // The anchor's right edge is 220, so a 200-wide panel starts at 20.
    expect(placement.left).toBe(20);
  });

  it("moves above when there is no room below and it fits above", () => {
    const placement = placePopover(anchorAt(100, 700), { width: 200, height: 150 }, VIEWPORT, options());
    expect(placement).toMatchObject({ side: "top", top: 546 });
  });

  it("stays below when it fits neither side, rather than running off the top", () => {
    const placement = placePopover(anchorAt(100, 300), { width: 200, height: 780 }, VIEWPORT, options());
    expect(placement.side).toBe("bottom");
  });

  it("pulls a panel that fits neither side back inside the viewport", () => {
    // 780 tall against 456px below and 288px above: it cannot sit under the
    // anchor without its foot leaving the screen, and nothing in the top layer
    // can be scrolled into view.
    const placement = placePopover(anchorAt(100, 300), { width: 200, height: 780 }, VIEWPORT, options());
    expect(placement.top).toBe(800 - 780 - 8);
    expect(placement.top + 780).toBeLessThanOrEqual(800);
  });

  it("keeps the top gutter when the panel is taller than the viewport", () => {
    const placement = placePopover(anchorAt(100, 300), { width: 200, height: 900 }, VIEWPORT, options());
    expect(placement.top).toBe(8);
  });
});

describe("fitHeight", () => {
  it("takes the roomier side and caps the height to it", () => {
    // 700px from the top: 68px below, 688px above.
    const placement = placePopover(
      anchorAt(100, 700),
      { width: 200, height: 600 },
      VIEWPORT,
      options({ fitHeight: true }),
    );
    expect(placement.side).toBe("top");
    expect(placement.maxHeight).toBe(688);
  });

  it("never caps below minHeight, however cramped the viewport", () => {
    const placement = placePopover(
      anchorAt(100, 380),
      { width: 200, height: 300 },
      { width: 1000, height: 420 },
      options({ fitHeight: true, minHeight: 140 }),
    );
    expect(placement.maxHeight).toBeGreaterThanOrEqual(140);
  });
});

describe("staying on screen", () => {
  it("pulls a panel back from the right edge", () => {
    const placement = placePopover(anchorAt(950, 100), { width: 300, height: 100 }, VIEWPORT, options());
    expect(placement.left).toBe(1000 - 300 - 8);
  });

  it("pulls a side panel back inside when it fits on neither side", () => {
    // 600 wide with 448px to the right and 488px to the left: too wide to flip,
    // so without a clamp its right edge would sit 144px past the viewport.
    const placement = placePopover(
      anchorAt(500, 300, 40),
      { width: 600, height: 100 },
      VIEWPORT,
      options({ side: "right" }),
    );
    expect(placement.side).toBe("right");
    expect(placement.left).toBe(1000 - 600 - 8);
  });

  it("keeps the left gutter when the panel is wider than the viewport", () => {
    const placement = placePopover(anchorAt(10, 100), { width: 1200, height: 100 }, VIEWPORT, options());
    expect(placement.left).toBe(8);
  });
});

describe("sideways", () => {
  it("opens to the right of the anchor, top edges level", () => {
    const placement = placePopover(
      anchorAt(100, 100),
      { width: 200, height: 150 },
      VIEWPORT,
      options({ side: "right" }),
    );
    expect(placement).toMatchObject({ side: "right", left: 224, top: 100 });
  });

  it("flips to the left when the right has no room", () => {
    const placement = placePopover(
      anchorAt(850, 100),
      { width: 200, height: 150 },
      VIEWPORT,
      options({ side: "right" }),
    );
    expect(placement).toMatchObject({ side: "left", left: 646 });
  });

  it("keeps a tall panel inside the viewport", () => {
    const placement = placePopover(
      anchorAt(100, 760),
      { width: 200, height: 400 },
      VIEWPORT,
      options({ side: "right" }),
    );
    expect(placement.top).toBe(800 - 400 - 8);
  });
});

describe("right to left", () => {
  it("mirrors which edge `start` means", () => {
    const placement = placePopover(
      anchorAt(100, 100),
      { width: 200, height: 150 },
      VIEWPORT,
      options({ rtl: true }),
    );
    // Reading starts on the right, so the panel's right edge meets the anchor's.
    expect(placement.left).toBe(20);
  });

  it("mirrors left and right", () => {
    const placement = placePopover(
      anchorAt(500, 100),
      { width: 200, height: 150 },
      VIEWPORT,
      options({ side: "right", rtl: true }),
    );
    expect(placement).toMatchObject({ side: "left", left: 296 });
  });
});
