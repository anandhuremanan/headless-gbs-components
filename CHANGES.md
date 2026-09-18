# Installer changes

`index.cjs` here is the CLI's script with the changes `shared/` needs, and
`verify-source.cjs` checks a synced `source/beta-components/`. Copy both into the
CLI repo, or apply the seven changes below by hand.

Both use the `.cjs` extension because the CLI package is `"type": "module"`: a
plain `.js` file there is an ES module, where `require` is not defined. The
package's `bin` already points at `index.cjs`.

Nothing about the legacy (non-`-beta`) path changes behaviour, except that it no
longer runs on beta installs.

## What changed, and why

### 1. `shared/` is installed with every beta component

Beta components import `cx`, `describeField`, `AnchoredPopover` and the icon set
from `../../shared/…`. That folder is not a component and is not in
`betaComponents`, so it never appears in `--list` or the interactive menu.
`installShared()` copies it, and `copySupportFiles()` calls that instead of
`copyCommonFiles()` whenever `--beta` is set.

### 2. Beta installs no longer copy the legacy common files

`copyCommonFiles()` copies `utils.ts`, `globalStyle.ts`, `theme.ts` and `icon/`
from `source/components/..`. No beta component imports any of them, but the old
code ran it on every install whose project lacked `utils.ts` — so
`-a Button -beta` in a clean project dropped four unused legacy files into it.
The two paths are now separate.

### 3. Folder names are looked up, not guessed

`copyComponent()` used `component.toLowerCase()`, which turns `DataGrid` into
`datagrid`, `DatePicker` into `datepicker` and `FileUploader` into
`fileuploader`. The beta folders are `data-grid`, `date-picker` and
`file-uploader`. `CONFIG.betaFolders` maps the three, and `folderFor()` is used
everywhere a path is built, including `checkComponentExists()`.

Check this against your `source/beta-components/` before shipping: if those
folders are currently named without hyphens, either rename them to match the
development repo or empty `CONFIG.betaFolders`. The two must agree.

### 4. `shared/` only moves forward

Installing a component overwrites `shared/` with the version that component was
built against, and every component already in the project keeps running against
it. `version.json` in the folder records the version, and
`.install-manifest.json` — written into the project, never shipped — records
what was installed and the SHA-256 of each file.

- Same version: nothing is copied.
- Newer in the CLI: the folder is updated, and files an older version left
  behind are removed.
- Older in the CLI: the install is refused, because it would downgrade the
  folder underneath components that need the newer one. `--force` overrides it.

### 5. Local edits are never discarded silently

If a file's hash no longer matches the manifest, the user has edited it. An
update stops and names the files rather than overwriting them. `--force` goes
ahead. Stale-file cleanup is held to the same rule: a file is only removed if we
installed it and it has not been touched.

Components stay as they always were — copied in, yours to edit, overwritten when
you reinstall them deliberately. The stricter rule applies only to `shared/`,
which nobody asked to install.

### 6. `--force`

New flag, documented as "Replace files in shared/ that you have edited locally".
It only affects `shared/`.

### 7. `__tests__` folders are no longer copied into projects

The test files import `vitest`, which a consuming project has no reason to have,
so they showed up as unresolved imports in the user's editor. `shared/`'s
boundary tests are worse: they walk whatever is in `component-lib/` and would
fail against a project that also has legacy components, which is not the user's
problem to debug. `copyComponent()` filters the folder out and `listFiles()`
skips it, so tests stay in the repo where they run.

## verify-source.js

Copy it next to `index.cjs` and run it after syncing components across:

```bash
node verify-source.cjs
```

It finds the installer script itself (`index.cjs`, `index.js` or `index.mjs`)
and reads `betaComponents` and `betaFolders` out of it rather than
keeping its own copy, then checks that `shared/` is present with matching
version files, that every listed component has a folder under the name the
installer will actually look for, that no component imports a sibling or an npm
package, and that every relative import resolves. It exits non-zero on anything
that would break an install, and warns about folders nobody can install and
legacy files that crept in.

Run it in CI for the CLI repo if you can: it is the difference between finding a
bad sync here and finding it in someone's project.

## Syncing the development repo into the CLI

`source/beta-components/<name>/` must mirror `component-lib/<name>/` exactly,
`shared/` included — the import paths are relative, so the layout has to match on
both sides. `component-lib/shared/__tests__/boundaries.test.ts` fails the build
if a component ever imports a sibling or a third-party package, which is what
would break a single-component install.

Two files in the development repo's `component-lib/` root, `theme.ts` and
`globalStyle.ts`, are leftovers from the legacy set. Nothing imports them; don't
copy them into `source/beta-components/`.

When anything in `shared/` changes, bump both `version.ts` and `version.json`
together — a unit test fails if they disagree.

## Verified

Against a sandbox holding a copy of `source/beta-components/` and an empty
project:

| Case | Result |
| --- | --- |
| `-a Button -beta` into an empty project | installs `shared` + `button`, no legacy files |
| `-a DataGrid -beta` | lands in `component-lib/data-grid` |
| Second beta install, same version | `shared v1.0.0 is already installed` |
| All `../../shared/…` imports in the installed project | 11 checked, all resolve |
| Edited `shared/core/cx.ts`, then a 1.1.0 update | refused, names the file, exit 1 |
| Same, with `--force` | `shared updated 1.0.0 → 1.1.0`, edit replaced |
| 1.2.0 update that drops a file | stale file removed |
| CLI older than the project | refused, exit 1 |
| `-a shared -beta` | rejected, explains it is automatic |
| `-a Card` (legacy) | legacy common files only, no `shared/` |
| All 14 beta components into one project | 498 relative imports, all resolve |
| Test files in the installed project | none |
| `node verify-source.cjs` on a full sync | `✓ 14 beta components and shared/ check out.` |
