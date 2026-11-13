# Decodo plugin for Antigravity

Antigravity plugin for [Decodo](https://decodo.com) — web scraping, SERP, and e-commerce data for
AI agents. Decodo handles JavaScript rendering, anti-bot and CAPTCHA, proxy rotation, and
geo-targeting across 125M+ IPs in 195+ locations.

## What's included

| Component | Description |
| --- | --- |
| `decodo` skill | When to reach for Decodo, which target to pick, and how to handle output |
| MCP server | Hosted Decodo tools (`web`, `search` toolsets) — no install, no shell |
| `/decodo-setup`, `/decodo-status` | Get an API key in place; see which surfaces are live |
| recovery rule | Handles MCP 401s and CLI install/`PATH`/auth errors |

## Install

```bash
agy plugin install https://github.com/Decodo/antigravity-plugin
```

Setup takes one credential, an API key or auth token (`DECODO_AUTH_TOKEN`) from the
[Decodo Playground](https://dashboard.decodo.com/web-data/playground). The plugin installs
disabled until it is set: open `/plugin` in `agy` (or Customizations → Installed in the app), turn
Decodo on and paste the key. Or run `/decodo-setup` and let the agent walk you through it.

To try it from a clone, run `agy plugin install .` from the repository root.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for repository layout, validation and local testing.

## License

MIT
