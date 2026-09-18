import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * The rules that keep the library installable.
 *
 * Components are copied into a project one folder at a time, so a component
 * that reaches into a sibling folder breaks as soon as someone installs it on
 * its own. `shared/` is the single exception: the installer copies it with
 * every install. These tests fail the moment a new import would break that.
 */

const LIB = resolve(import.meta.dirname, "..", "..");
const SHARED = "shared";

/** Bare specifiers a component may import. The library ships no dependencies. */
const ALLOWED_PACKAGES = new Set(["react", "react-dom", "react-dom/client", "vitest"]);

function packages(): string[] {
  return readdirSync(LIB)
    .filter((name) => statSync(join(LIB, name)).isDirectory())
    .sort();
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** Every `from "…"` specifier in a file, with `import()` and `export … from` included. */
function specifiers(file: string): string[] {
  return [...readFileSync(file, "utf8").matchAll(/from\s+"([^"]+)"|import\("([^"]+)"\)/g)].map(
    (match) => match[1] ?? match[2],
  );
}

/** Which package a relative import lands in, or null when it leaves the library. */
function targetPackage(file: string, specifier: string): string | null {
  const target = resolve(file, "..", specifier);
  const rel = relative(LIB, target);
  if (rel.startsWith("..")) return null;
  return rel.split(sep)[0];
}

describe.each(packages().filter((name) => name !== SHARED))("%s", (pkg) => {
  const files = sourceFiles(join(LIB, pkg));

  it("imports nothing from another component", () => {
    const offenders = files.flatMap((file) =>
      specifiers(file)
        .filter((specifier) => specifier.startsWith("."))
        .map((specifier) => ({ file: relative(LIB, file), specifier, to: targetPackage(file, specifier) }))
        .filter((entry) => entry.to !== pkg && entry.to !== SHARED),
    );
    expect(offenders).toEqual([]);
  });

  it("imports no third-party package", () => {
    const offenders = files.flatMap((file) =>
      specifiers(file)
        .filter((specifier) => !specifier.startsWith(".") && !ALLOWED_PACKAGES.has(specifier))
        .map((specifier) => `${relative(LIB, file)} -> ${specifier}`),
    );
    expect(offenders).toEqual([]);
  });
});

describe("shared", () => {
  it("never imports a component, so it can be installed on its own", () => {
    const offenders = sourceFiles(join(LIB, SHARED)).flatMap((file) =>
      specifiers(file)
        .filter((specifier) => specifier.startsWith("."))
        .map((specifier) => ({ file: relative(LIB, file), to: targetPackage(file, specifier) }))
        .filter((entry) => entry.to !== SHARED),
    );
    expect(offenders).toEqual([]);
  });

  it("is reached only as ../../shared, the path the installer guarantees", () => {
    const offenders = packages()
      .filter((name) => name !== SHARED)
      .flatMap((pkg) => sourceFiles(join(LIB, pkg)))
      .flatMap((file) =>
        specifiers(file)
          .filter((specifier) => specifier.includes(SHARED))
          .filter((specifier) => !specifier.startsWith("../../shared/"))
          .map((specifier) => `${relative(LIB, file)} -> ${specifier}`),
      );
    expect(offenders).toEqual([]);
  });
});
