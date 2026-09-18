import { describe, expect, it } from "vitest";
import { cx } from "../core/cx";
import { describeField } from "../core/field";
import { countCharacters } from "../core/text";
import { version } from "../version";
import manifest from "../version.json";

describe("cx", () => {
  it("joins the truthy names", () => {
    expect(cx("a", "b")).toBe("a b");
  });

  it("drops undefined, null and false, so an unset className adds nothing", () => {
    expect(cx("a", undefined, null, false, "b")).toBe("a b");
    expect(cx(undefined, false)).toBe("");
  });
});

describe("countCharacters", () => {
  it("counts what a person would call a character", () => {
    expect(countCharacters("abc")).toBe(3);
    // Four UTF-16 units, one character.
    expect(countCharacters("👍🏽")).toBe(1);
    // A base letter plus a combining accent.
    expect(countCharacters("e\u0301")).toBe(1);
  });

  it("is 0 for an empty string", () => {
    expect(countCharacters("")).toBe(0);
  });
});

describe("describeField", () => {
  it("is undefined when nothing describes the control", () => {
    expect(describeField("f", {})).toBeUndefined();
    expect(describeField("f", { description: "", error: null })).toBeUndefined();
  });

  it("reads the caller's own ids first and the error last", () => {
    expect(
      describeField("f", { extra: "outside", hint: "h", description: "d", error: "e" }),
    ).toBe("outside f-hint f-description f-error");
  });

  it("includes only the parts that are rendered", () => {
    expect(describeField("f", { error: "Required" })).toBe("f-error");
    expect(describeField("f", { description: "Help" })).toBe("f-description");
  });
});

describe("version", () => {
  it("matches the manifest the installer reads", () => {
    expect(manifest.version).toBe(version);
  });
});
