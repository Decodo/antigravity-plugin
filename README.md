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

Setup needs an API key or auth token (`DECODO_AUTH_TOKEN`) from the
[Decodo Playground](https://dashboard.decodo.com/web-data/playground). The plugin installs
disabled until it is set: open `/plugin` in `agy` (or Customizations → Installed in the app), turn
Decodo on and paste the key. Or run `/decodo-setup` and let the agent walk you through it.

The key you paste in `/plugin` only reaches the hosted MCP server. The skill uses the `decodo` CLI
for targets the MCP toolsets don't cover (Amazon, Walmart, Reddit, crawls), and the CLI keeps its
own credential. Give it the same key once:

```bash
npx -y @decodo/cli setup --token '<your-key>'   # saved for every session
# or, for the current shell only:
export DECODO_AUTH_TOKEN='<your-key>'
```

Check it with `npx -y @decodo/cli whoami`. Skip this and the agent asks for the key the first
time it needs the CLI.

To try it from a clone:

```bash
bash install.sh              # validates, then installs into ~/.gemini/config/plugins/; start a new agy session after
bash install.sh --uninstall  # remove
```

## Example workflows

Ask in plain language. The agent picks the MCP tool or the `decodo` CLI command for you.

| Ask | What runs | You get |
| --- | --- | --- |
| "What are the top 5 Google results for web scraping api?" | MCP `search` | Parsed results: title, URL and snippet |
| "Scrape decodo.com and summarise what they sell." | MCP `scrape_as_markdown` | The rendered page as markdown, then a summary |
| "Get the price and rating for Amazon ASIN B09H74FXNW." | CLI `decodo amazon-product` (needs the CLI key, see Install) | Parsed product JSON: title, price, rating, availability |
| "List every docs page on example.com, then pull the ones about pricing." | MCP `map`, then `scrape_as_markdown` per page | A URL list, then only the pages you need |
| "Crawl the blog on example.com and give me each post's title and date." | CLI `decodo crawl --wait` | One record per page, as NDJSON |

Search, map and crawl need an API key; a basic auth token works for the rest. Every request is
billed, so the agent doesn't run the same request through both MCP and the CLI.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for repository layout, validation and local testing.

## License

MIT
