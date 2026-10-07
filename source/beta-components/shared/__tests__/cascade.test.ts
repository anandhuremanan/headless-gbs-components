import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Component CSS ships unlayered, and these tests hold it there.
 *
 * The rule that decides this is one line of the cascade: an unlayered rule
 * beats every layered rule, whatever the specificity. So a stylesheet that
 * puts itself in a cascade layer loses to any unlayered reset — measured, not
 * assumed: with the rules in a `gbs` layer, Tailwind v3's preflight stripped
 * the border and padding off every component, and Bootstrap's Reboot squared
 * off every corner. Unlayered, the same rules win on ordinary specificity and
 * both environments need no setup at all.
 *
 * Tailwind v4 is the one exception, because it layers its own utilities. A v4
 * project imports the CSS into Tailwind's `components` layer, after the
 * framework — which is the ordinary way to place third-party CSS, and is the
 * project's call rather than ours.
 *
 * None of this fails loudly on its own. Getting it wrong just means styles
 * quietly stop applying, which has now happened twice.
 */

const BETA = resolve(__dirname, "..", "..");

const componentsWithStyles = readdirSync(BETA, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => existsSync(join(BETA, name, "styles.css")))
  .sort();

const read = (name: string) => readFileSync(join(BETA, name, "styles.css"), "utf8");

/** Everything before the first rule: the part a reader sees first. */
const header = (css: string) => css.slice(0, Math.max(css.indexOf("*/") + 2, 0));

describe("component stylesheets", () => {
  it("were found at all", () => {
    expect(componentsWithStyles.length).toBeGreaterThan(20);
  });

  it.each(componentsWithStyles)("%s ships no cascade layer of its own", (name) => {
    /*
     * Not a style preference. A layered rule loses to any unlayered reset, so
     * wrapping these in `@layer` is what broke Tailwind v3 and Bootstrap.
     */
    expect(read(name)).not.toMatch(/@layer/);
  });

  it.each(componentsWithStyles)("%s declares no global layer order", (name) => {
    // A leaf stylesheet asserting document-wide order means whichever file the
    // bundler emits first wins the argument.
    expect(read(name).match(/@layer [a-z]+, /g) ?? []).toHaveLength(0);
  });

  it.each(componentsWithStyles)("%s closes its header comment", (name) => {
    /*
     * An unterminated block comment swallows the whole stylesheet while the
     * build stays green. This has already caught one accidental mass edit.
     */
    const css = read(name);
    expect(css.startsWith("/*"), `${name} should open with a header comment`).toBe(true);
    expect(css.indexOf("*/"), `${name} header is not closed`).toBeGreaterThan(0);
  });

  it.each(componentsWithStyles)("%s says how it is meant to be imported", (name) => {
    const text = header(read(name));
    expect(text).toMatch(/unlayered/i);
    // The advice that caused the 2.1.0 regression: it never named `base`, so
    // Tailwind v4 appended preflight after the utilities.
    expect(text).not.toContain("@layer reset, gbs, app");
    expect(text).not.toContain("@layer gbs, utilities");
  });
});

describe("the removed layers.css", () => {
  it("is gone, and nothing still points at it", () => {
    expect(existsSync(join(BETA, "layers.css"))).toBe(false);
    for (const name of componentsWithStyles) {
      expect(read(name), `${name} still references layers.css`).not.toContain("layers.css");
    }
  });
});
