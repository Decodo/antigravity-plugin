#!/usr/bin/env node

// Fails when shipped plugin files change without a version bump. Compares the working
// tree against a base commit (default HEAD^1: on a pull_request checkout HEAD is the
// merge commit, so its first parent is the tip of the base branch).
//
//   node scripts/check-version.mjs [base-ref]

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const manifestPath = ".antigravity-plugin/plugin.json";
// Everything Antigravity loads from the plugin. Docs, scripts and CI are not shipped content.
const shipped = [".antigravity-plugin/", "assets/", "skills/", "rules/", "mcp_config.json"];
const versionPattern = /^(\d+)\.(\d+)\.(\d+)$/;

const base = process.argv[2] ?? "HEAD^1";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" });

function parse(version, context) {
  const match = versionPattern.exec(version ?? "");
  if (!match) {
    console.error(`error: ${context}: "${version}" is not a MAJOR.MINOR.PATCH version`);
    process.exit(1);
  }
  return match.slice(1).map(Number);
}

const changed = git("diff", "--name-only", base, "--")
  .split("\n")
  .filter((file) => file && shipped.some((prefix) => file === prefix || file.startsWith(prefix)));

if (changed.length === 0) {
  console.log("No shipped plugin files changed, no version bump needed.");
  process.exit(0);
}

const head = JSON.parse(readFileSync(manifestPath, "utf8")).version;
let baseVersion;
try {
  baseVersion = JSON.parse(git("show", `${base}:${manifestPath}`)).version;
} catch {
  parse(head, manifestPath);
  console.log(`${manifestPath}: new plugin at ${head}`);
  process.exit(0);
}

const [a, b] = [parse(head, manifestPath), parse(baseVersion, `${manifestPath} on ${base}`)];
const greater = a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2];
if (!greater) {
  console.error(`error: shipped files changed (${changed.join(", ")}) but ${manifestPath} version ${head} is not greater than ${baseVersion} on ${base}`);
  process.exit(1);
}
console.log(`${manifestPath}: ${baseVersion} -> ${head}`);
