# GBS Building Blocks 2.0 (v2.0.4)

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

## What's New 🎉 (Ver 2.0.4)

- Agent skill: added guidance for projects that load an unlayered CSS reset
  such as Bootstrap or Normalize. Component rules live in the `components`
  cascade layer, and an unlayered reset outranks every layered rule whatever
  its selectors look like, so Bootstrap's Reboot was restyling the Button.
  Importing the reset into its own layer fixes it; the skill now says so.

## Authors

- [@anandhuremanan](https://www.github.com/anandhuremanan)
