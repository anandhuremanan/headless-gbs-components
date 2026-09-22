# Tests

Two layers, run separately.

| Layer | Runner | Location | What it proves |
| --- | --- | --- | --- |
| Unit | Vitest (node) | `component-lib/*/__tests__/*.test.ts` | The framework-free `core/` logic: sorting, filtering, date maths, chunk planning, dismiss rules, character counting, roving focus. Also the import boundaries that keep each component installable on its own. |
| Browser | Playwright + axe-core | `tests/e2e/*.spec.ts` | What only a real engine can answer: cascade and inheritance of the `--gbs-*` tokens, the top layer and focus trap of `<dialog>`, keyboard sequences, `XMLHttpRequest` upload progress, and accessibility violations. |

```bash
pnpm test        # unit only (fast, no browser)
pnpm test:e2e    # browser, starts Vite on 127.0.0.1:5173 itself
pnpm test:e2e:ui # same, with the Playwright inspector
pnpm test:all    # both
```

Vitest is scoped to `component-lib/**/__tests__` in [vite.config.ts](../vite.config.ts) so it never tries to execute the Playwright specs. Playwright starts and stops its own dev server (`webServer` in [playwright.config.ts](../playwright.config.ts)), reusing one that is already listening outside CI.

## Browser suites

- **theming.spec.ts** — sets `--gbs-*` on `:root` and asserts the resolved colours on a button, a checkbox, the grid root and a grid header cell; then scopes an override to one subtree and checks the rest of the page is unaffected; then switches to dark mode. These are the tests that caught the grid ignoring inherited theme values.
- **accessibility.spec.ts** — axe (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`) on every demo tab, the grid in dark mode, an open modal (also asserting `:modal`, i.e. the rest of the page really is inert), and the toast live region.
- **keyboard.spec.ts** — tab roving focus, combobox open/type/select, modal focus trap and focus return, dialog resolution by Enter, OTP typing and paste, checkbox `Space` and select-all, date typing.
- **popover.spec.ts** — the one anchored popover behind the combobox list, the grid's menus and the calendar: the top layer, flipping above a control with no room below, matching the control's width, and where focus lands when a menu closes.
- **uploads.spec.ts** — a chunked upload to a stubbed endpoint, a rejected file, pause/resume, and a plain form post with no JavaScript handler.

`helpers.ts` holds the tab map plus `openTab`, `computed` (reads a resolved CSS value) and `setTheme`.

## The boundary tests

`component-lib/shared/__tests__/boundaries.test.ts` is not about behaviour. Components
are copied into a project one folder at a time, so a component that imports a
sibling breaks the moment someone installs it alone, and a third-party import
breaks the library's promise of having no dependencies. The test walks every
package and fails on either, allowing only `../../shared/`, which the installer
copies with every install.

## Adding a test

Prefer the unit layer: if the behaviour can be expressed against `core/`, it belongs there and runs in milliseconds. Reach for a browser test when the assertion depends on layout, the cascade, the top layer, real focus, or network behaviour — those are the cases where a jsdom test passes while the component is broken.
