---
name: decodo-setup
description: Get Decodo working in Antigravity — fetch an API key (or token), then authenticate the MCP server, the CLI, or both. Run only when the user invokes /decodo-setup.
disable-model-invocation: true
license: MIT
---

# Set up Decodo

Get the user from nothing to a working Decodo surface. Do not scrape anything in this skill.

## 1. Find out what already works

Run both checks before asking the user for anything:

```bash
decodo whoami 2>&1 || npx -y @decodo/cli whoami 2>&1
```

And look at your own tool list for Decodo MCP tools (`scrape_as_markdown`, `search`, `map`, …).

Report the result as a two-line status, then continue only for the parts that are missing:

- **MCP**: tools present / absent
- **CLI**: exit 0 (a token is configured — not necessarily a valid one) / exit 3 (no token) /
  `command not found`

## 2. Get an API key or token (needed for either lane)

Both lanes use the same Web Data API key. Older plans only have a basic auth token, which works
the same way except for search, map and crawl, which need an API key. Point the user at
<https://dashboard.decodo.com/web-data/playground> — a free account gives up to 10K requests with
no card.

**Never read, `cat`, echo, or log the token**, and never write it into a file the user tracks in
git. If a token is already configured somewhere, do not extract it to reuse it elsewhere — ask
for it.

## 3. Authenticate the lane the user wants

If the user already said which lane they want, do that one. Otherwise ask — and if an ask-user
tool is available, use it:

**"How do you want to use Decodo?"**

1. **MCP server (Recommended — no install)** — tool calls, nothing to install
2. **CLI** — full target surface, needs a shell
3. **Both**

### MCP

The MCP server is declared in this plugin's `mcp_config.json`; it needs the token as the
`DECODO_AUTH_TOKEN` plugin variable. Antigravity keeps the plugin disabled until that variable is
filled in, and the setup dialog is a UI step you cannot do for the user. Tell them:

> Start `agy`, open `/plugin`, select Decodo, turn it on and paste your key when asked — or in
> the app, open Customizations → Installed → Decodo and turn it on. Then start a new session.

You cannot do this step for the user: `agy plugin enable decodo` refuses a plugin whose MCP
variables are unset and points at the `/plugin` menu, which is interactive.

The plugin enables the `web,search` toolsets. Every enabled tool's schema is resident in every
request, so leave it there — the CLI covers e-commerce, social media and AI targets without the
context cost. A user who really wants those as MCP tools can edit `toolsets=` in the installed
plugin's `mcp_config.json`.

Confirm by checking that Decodo tools appear in the tool list of a new session.

### CLI

```bash
export DECODO_AUTH_TOKEN='<token>'     # session-scoped, no interaction
decodo setup --token '<token>'         # persist to config, validates against the API
```

Never run a bare `decodo setup` — it opens an interactive prompt you cannot drive.

Not installed? `npx -y @decodo/cli <command>` needs no install. For a persistent command:

```bash
curl -fsSL https://decodo.github.io/cli/install.sh | sh   # macOS / Linux
irm https://decodo.github.io/cli/install.ps1 | iex        # Windows PowerShell
npm install -g @decodo/cli                                # any platform
```

If install or `PATH` fails, follow the `decodo-recovery` rule in this plugin — do not
improvise, and never suggest `sudo npm install -g`.

## 4. Prove it works

`decodo whoami` exits **0** on a token the API would reject — it reads local config and makes no
network call, so it never proves auth. Validate with a real call:

```bash
decodo setup --token '<token>'     # verifies against the API, writes nothing on failure
# or a cheap live request:
decodo scrape https://example.com
```

For MCP, one `scrape_as_markdown` call on `https://example.com` is the equivalent. A connected
server with tools listed is not proof: it accepts any `Authorization` header at connect time.

Then tell the user which lane is live and stop. Do not chain into the task they mentioned
earlier unless they asked you to.
