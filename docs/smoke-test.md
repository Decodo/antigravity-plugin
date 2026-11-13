# Antigravity smoke test

Static checks (`agy plugin validate`, `scripts/validate.mjs`) do not prove the agent behaves.
Run this in the Antigravity app or the `agy` CLI before each release, and record the result at the
bottom.

## Install and enable

1. `bash install.sh` (re-run after every edit).
2. `agy plugin list --json` shows `decodo` with 3 skills, 1 rule, 1 MCP server, `enabled: false`.
3. Turn it on from `/plugin` (CLI) or Customizations → Installed (app). The dialog asks for
   **Decodo API key or token** and its link opens the Decodo Playground.
4. In a new session, the Decodo MCP tools (`scrape_as_markdown`, `search`, `map`, `crawl_*`) are
   listed, and no `ecommerce`/`social_media` tools are.

## Behaviour

- [ ] **Skill triggers unprompted.** "What are the top 5 Google results for web scraping api?"
      uses Decodo without Decodo being named.
- [ ] **MCP lane.** "Scrape example.com" goes through `scrape_as_markdown`, not the CLI.
- [ ] **CLI lane.** "Get the price for Amazon ASIN B09H74FXNW" uses `decodo` / `npx -y @decodo/cli`
      (the target is outside `web,search`).
- [ ] **Crawl goes to a file.** "Crawl the first 10 pages of docs.decodo.com" uses
      `decodo crawl ... -o` and reads slices, not `crawl_results` into context.
- [ ] **Slash commands.** `/decodo-setup` and `/decodo-status` are listed and run. Neither is
      triggered by an ordinary scraping request.
- [ ] **Bad token.** Set the variable to `garbage`, start a new session, ask for a scrape. The 401 is
      reported as a token problem with the `/plugin` fix, not retried, not treated as an outage,
      and the agent does not `curl` the target site directly.
- [ ] **No CLI auth.** `DECODO_CONFIG_HOME=$(mktemp -d)` with a CLI-only request: exit 3 leads to
      asking for a token, never a bare `decodo setup`.

## Results

| Date | agy / app version | Plugin version | Result | Notes |
| --- | --- | --- | --- | --- |
| | | | | |
