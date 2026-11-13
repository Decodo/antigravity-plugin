# Contributing

## Repository layout

```text
.antigravity-plugin/plugin.json   # manifest (strict schema: unknown keys are rejected)
mcp_config.json                   # hosted MCP server + DECODO_AUTH_TOKEN variable
assets/logo.svg                   # square logo, adapts to light/dark
skills/decodo/SKILL.md            # capability surface
skills/decodo/references/         # MCP client config, raw HTTP recipes
skills/decodo-setup/SKILL.md      # /decodo-setup (user-invoked only)
skills/decodo-status/SKILL.md     # /decodo-status (user-invoked only)
rules/decodo-recovery.md          # MCP auth + CLI install/auth recovery (model_decision)
scripts/validate.mjs              # static checks for CI (agy is not available on runners)
scripts/check-version.mjs         # version bump check, run in CI on every PR
docs/smoke-test.md                # manual in-app test checklist
.github/workflows/                # validate + version check on PRs, GitHub Release on main
```

The plugin sits at the repository root so `agy plugin install https://github.com/Decodo/antigravity-plugin`
finds it. This is the same layout Linear, CodeRabbit and Leapwork use.

The skill text is ported from [Decodo/cursor-plugin](https://github.com/Decodo/cursor-plugin) and
kept in step by hand. When the CLI or MCP surface changes, update both repositories.

### Format notes

- `plugin.json` follows <https://antigravity.google/schemas/v1/plugin.json>, which sets
  `additionalProperties: false`. Cursor-only keys (`category`, `tags`, `variables`, `rules`,
  `commands`, `mcpServers`) are not allowed; components are discovered from their folders.
- MCP variables are declared per server in `mcp_config.json`. Only `${VAR}` is documented; there
  is no `${VAR:-default}`, which is why the toolsets are fixed in the URL instead of being a
  second variable.
- A plugin that declares variables installs **disabled**. `agy plugin enable decodo` refuses it
  until the variables are filled in from the interactive `/plugin` menu (verified with agy 1.5.6).
- Cursor commands become skills with `disable-model-invocation: true`, so they run only as
  `/decodo-setup` and `/decodo-status`.
- Rules need `trigger:` frontmatter (`always_on`, `model_decision`, `glob`, `manual`).

## Validating

Install the Antigravity CLI once (`brew install --cask antigravity-cli` on macOS), then:

```bash
agy plugin validate . --strict      # the real validator
node scripts/validate.mjs           # the CI validator
node --test scripts/*.test.mjs      # its tests
```

Expected `agy` output is one note — `server "decodo" declares variables, so the plugin is off
until the user fills them in` — and `skills 3 · rules 1 · mcpServers 1`. Anything else is a
regression.

## Testing locally

```bash
agy plugin install .
agy plugin list --json              # decodo: 3 skills, 1 rule, 1 MCP server, enabled: false
agy                                 # /plugin → Decodo → turn on, paste a key
agy plugin uninstall decodo
```

`agy plugin install .` copies the folder to `~/.gemini/config/plugins/decodo/`. Re-run it after
every edit. Then work through [`docs/smoke-test.md`](docs/smoke-test.md).

**A live MCP server hides the skill.** When Decodo MCP tools are in the tool list, the agent
calls them for scrape, search and map — the skill's CLI lane is never exercised. To test the
skill, ask for a target outside `web,search` (an Amazon product or a Reddit thread).

## Versioning and releases

Any PR that changes shipped files (`.antigravity-plugin/`, `assets/`, `skills/`, `rules/`,
`mcp_config.json`) must bump `version` in `.antigravity-plugin/plugin.json`, or the
`Version check` workflow fails. Check locally against `main`:

```bash
node scripts/check-version.mjs origin/main
```

When a merge to `main` carries a version with no tag yet, the `Release` workflow tags it
`vX.Y.Z` and creates a GitHub Release with generated notes.

## Submitting to the Marketplace

1. `agy plugin validate . --strict` passes and the smoke test is done.
2. The repository is public and the README is accurate.
3. Submit through the [Antigravity plugin interest form](https://forms.gle/2EX5RFYPoJe1UgxR9).
   Once listed, users install with `agy plugin install decodo@antigravity-plugins-official`.
