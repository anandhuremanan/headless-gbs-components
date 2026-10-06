# GBS Building Blocks 2.0 (v2.1.0)

Latest and upgraded version of GBS building blocks with headless UI and removed dependencies.

## Documentation

For detailed documentation on usage and props, Please visit: [Building Block Documentation](https://gramprokit.vercel.app)

## Beta Components

New 2.0.0 beta (current version) is available for testing and feedback, Please visit: [Building Block Documentation v2.0.0 beta](https://gramprokit.vercel.app)

## Agent skill

Install the skill once per project so a coding agent uses these components
correctly instead of guessing at the API:

```bash
npx gbs-add-block@latest -skill
```

It writes the skill at the root of the project you run it in, in the place each
agent looks:

| Agent | Gets |
| --- | --- |
| GBS SE Agent | `.gbs/skills/gbs-components/` (canonical) |
| Claude Code | `.claude/skills/gbs-components/` |
| Antigravity | `.agents/rules/gbs-components.md` |
| Codex | a marked block in `AGENTS.md` |

Pick a subset with `--for claude,codex`, or `--for none` for just `.gbs/`.
Commit the result so everyone's agent picks it up. Re-run to update; a file you
have edited is never replaced without `--force`.

## What's New 🎉 (Ver 2.1.0)

**The application now owns CSS cascade order.** Component rules moved out of the
`components` layer into a layer of their own, `gbs`, and the stylesheets no
longer declare a global layer order.

Previously every `styles.css` opened with
`@layer theme, base, components, utilities;` — a leaf file asserting the order
of the whole document. Whichever stylesheet the bundler emitted first silently
won that argument. It also meant a Tailwind v3 build failed outright, and
Bootstrap's Reboot could not be put in front of the components.

- Tailwind **v3** projects now build. Utilities override components there too,
  with no setup.
- Tailwind **v4** projects add one line to their global CSS:
  `@layer gbs, utilities;` — **without it, utilities no longer override
  component styles.** This is the migration step.
- Bootstrap, Normalize or any unlayered reset can now be placed before the
  components: `@layer bootstrap, gbs, app, utilities;`
- Projects with no CSS framework need no change.

See the Theming page, "Cascade layers", for the full model.

## Authors

- [@anandhuremanan](https://www.github.com/anandhuremanan)
