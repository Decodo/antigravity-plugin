#!/usr/bin/env bash
# install.sh — install the Decodo plugin into Antigravity for development/testing
#
# Usage:
#   bash install.sh              # validate, then install (or update) the plugin
#   bash install.sh --uninstall  # remove
#
# Copies only the shipped plugin files (manifest, assets, skills, rules, MCP config) to a
# staging folder and runs `agy plugin install` on it, so .git, scripts/ and docs/ are not
# installed. Re-installing replaces the files and keeps the plugin enabled with its token.
# Requires the Antigravity CLI: brew install --cask antigravity-cli

set -euo pipefail

PLUGIN_NAME="decodo"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

COMPONENTS=(
  ".antigravity-plugin"
  "assets"
  "skills"
  "rules"
  "mcp_config.json"
  "LICENSE"
  "README.md"
)

command -v agy >/dev/null 2>&1 || {
  echo "Error: agy not found. Install the Antigravity CLI: brew install --cask antigravity-cli" >&2
  exit 1
}

uninstall() {
  agy plugin uninstall "$PLUGIN_NAME"
  echo "Start a new Antigravity session to apply."
}

install() {
  STAGING="$(mktemp -d)"
  trap 'rm -rf "$STAGING"' EXIT
  local staging="$STAGING"

  # agy names the plugin from the manifest, but keep the folder name matching too.
  local stage_dir="${staging}/${PLUGIN_NAME}"
  mkdir -p "$stage_dir"
  for component in "${COMPONENTS[@]}"; do
    cp -R "${SCRIPT_DIR}/${component}" "$stage_dir/"
  done

  agy plugin validate "$stage_dir" --strict
  echo ""
  agy plugin install "$stage_dir" </dev/null

  echo ""
  echo "Next steps:"
  echo "  1. Start a new agy session (or a new conversation in the app) — running sessions keep the old copy"
  echo "  2. First install only: open /plugin in agy (or Customizations → Installed in the app),"
  echo "     turn Decodo on and paste DECODO_AUTH_TOKEN. Updates keep the token."
  echo "  3. Confirm the load: agy plugin list   (decodo: 3 skills, 1 rule, 1 MCP server)"
}

case "${1:-}" in
  --uninstall) uninstall ;;
  *)           install ;;
esac
