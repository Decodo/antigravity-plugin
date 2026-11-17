#!/usr/bin/env node

// Static checks for the Antigravity plugin layout, for CI where `agy` is not available.
// Mirrors https://antigravity.google/schemas/v1/plugin.json and the rules in
// https://antigravity.google/docs/build-plugins. Locally, also run `agy plugin validate . --strict`.
//
//   node scripts/validate.mjs [plugin-dir]

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MANIFEST_KEYS = new Set([
  "$schema", "name", "displayName", "display_name", "description", "version", "disabled",
  "logo", "suggestedPrompts", "suggested_prompts", "skills", "author", "homepage",
  "repository", "license", "keywords", "extensions", "source", "sourcePath", "source_path",
]);
// Marketplace listing needs these even though the schema only requires `name`.
const LISTING_KEYS = ["name", "displayName", "description", "version", "logo", "author", "suggestedPrompts"];
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const LOGO_EXT = /\.(png|svg|jpe?g|webp)$/i;
const RULE_TRIGGERS = new Set(["always_on", "model_decision", "glob", "manual"]);
const BUILTIN_VARS = new Set(["PLUGIN_ROOT", "PLUGIN_DATA"]);

// Minimal YAML frontmatter reader: top-level `key: value` pairs, plus folded/literal
// block scalars (`key: >-` followed by indented lines). Enough for SKILL.md and rule files.
export function parseFrontmatter(content) {
  const text = content.replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return null;
  const lines = text.slice(4, end).split("\n");
  const fields = {};
  for (let i = 0; i < lines.length; i++) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i]);
    if (!match) continue;
    let [, key, value] = match;
    if (/^[>|][+-]?$/.test(value)) {
      const block = [];
      while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1] === "")) {
        block.push(lines[++i].trim());
      }
      value = value.startsWith(">") ? block.join(" ").trim() : block.join("\n").trim();
    } else {
      value = value.replace(/^(["'])(.*)\1$/, "$2");
    }
    fields[key] = value;
  }
  return fields;
}

function readJson(file, errors) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`${file}: ${existsSync(file) ? `invalid JSON (${error.message})` : "missing"}`);
    return null;
  }
}

function isInside(root, rel) {
  const resolved = path.resolve(root, rel);
  return resolved === root || resolved.startsWith(root + path.sep);
}

function validateManifest(root, errors) {
  const candidates = [".antigravity-plugin/plugin.json", "plugin.json"];
  const found = candidates.find((rel) => existsSync(path.join(root, rel)));
  if (!found) {
    errors.push(`no manifest: expected ${candidates.join(" or ")}`);
    return null;
  }
  const manifest = readJson(path.join(root, found), errors);
  if (!manifest) return null;

  for (const key of Object.keys(manifest)) {
    if (!MANIFEST_KEYS.has(key)) errors.push(`${found}: unknown key "${key}" (the schema rejects it)`);
  }
  for (const key of LISTING_KEYS) {
    if (manifest[key] === undefined) errors.push(`${found}: "${key}" is required for a Marketplace listing`);
  }
  if (typeof manifest.name !== "string" || !KEBAB.test(manifest.name)) {
    errors.push(`${found}: "name" must be lowercase kebab-case`);
  }
  if (manifest.version !== undefined && !SEMVER.test(manifest.version)) {
    errors.push(`${found}: "version" must be MAJOR.MINOR.PATCH`);
  }
  if (manifest.logo !== undefined) {
    if (typeof manifest.logo !== "string" || !LOGO_EXT.test(manifest.logo) || !isInside(root, manifest.logo)) {
      errors.push(`${found}: "logo" must be a relative .png/.svg/.jpg/.jpeg/.webp path inside the plugin`);
    } else if (!existsSync(path.join(root, manifest.logo))) {
      errors.push(`${found}: logo "${manifest.logo}" does not exist`);
    }
  }
  const prompts = manifest.suggestedPrompts;
  if (prompts !== undefined && (!Array.isArray(prompts) || prompts.length > 3 || prompts.some((p) => typeof p !== "string" || !p.trim()))) {
    errors.push(`${found}: "suggestedPrompts" must be at most 3 non-empty strings`);
  }
  if (manifest.author !== undefined && typeof manifest.author === "object") {
    for (const key of Object.keys(manifest.author)) {
      if (!["name", "email", "url"].includes(key)) errors.push(`${found}: unknown author key "${key}"`);
    }
    if (manifest.author.url !== undefined && !String(manifest.author.url).startsWith("https://")) {
      errors.push(`${found}: author.url must be https://`);
    }
  }
  return manifest;
}

function validateSkills(root, manifest, errors) {
  const dirs = ["skills", ...[manifest?.skills ?? []].flat()];
  const names = [];
  for (const rel of new Set(dirs.map((d) => path.normalize(d)))) {
    const dir = path.join(root, rel);
    if (!existsSync(dir)) {
      if (rel !== "skills") errors.push(`skills path "${rel}" does not exist`);
      continue;
    }
    for (const entry of readdirSync(dir)) {
      const skillDir = path.join(dir, entry);
      if (!statSync(skillDir).isDirectory()) continue;
      const file = path.join(skillDir, "SKILL.md");
      const where = path.relative(root, file);
      if (!existsSync(file)) {
        errors.push(`${where}: missing`);
        continue;
      }
      const fm = parseFrontmatter(readFileSync(file, "utf8"));
      if (!fm) {
        errors.push(`${where}: missing YAML frontmatter`);
        continue;
      }
      if (fm.name !== entry) errors.push(`${where}: name "${fm.name}" must match folder "${entry}"`);
      if (!fm.name || !KEBAB.test(fm.name) || fm.name.length > 64) {
        errors.push(`${where}: name must be kebab-case, 1-64 characters`);
      }
      if (!fm.description || fm.description.length > 1024) {
        errors.push(`${where}: description must be 1-1024 characters`);
      }
      if (fm["disable-model-invocation"] !== undefined && !["true", "false"].includes(fm["disable-model-invocation"])) {
        errors.push(`${where}: disable-model-invocation must be true or false`);
      }
      names.push(fm.name);
    }
  }
  return names;
}

function validateRules(root, errors) {
  const dir = path.join(root, "rules");
  if (!existsSync(dir)) return [];
  const names = [];
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".md")) continue;
    names.push(entry);
    if (entry === "AGENTS.md" || entry === "GEMINI.md") continue;
    const where = `rules/${entry}`;
    const fm = parseFrontmatter(readFileSync(path.join(dir, entry), "utf8"));
    if (!fm) {
      errors.push(`${where}: named rules need frontmatter with a trigger`);
      continue;
    }
    if (!RULE_TRIGGERS.has(fm.trigger)) {
      errors.push(`${where}: trigger must be one of ${[...RULE_TRIGGERS].join(", ")}`);
    }
    if (fm.trigger === "model_decision" && !fm.description) errors.push(`${where}: model_decision needs a description`);
    if (fm.trigger === "glob" && (!fm.globs || fm.globs.startsWith("["))) {
      errors.push(`${where}: glob needs "globs" as a comma-separated string, not a YAML list`);
    }
  }
  return names;
}

function validateMcp(root, errors) {
  const file = path.join(root, "mcp_config.json");
  if (!existsSync(file)) return [];
  const config = readJson(file, errors);
  const servers = config?.mcpServers;
  if (!servers || typeof servers !== "object") {
    if (config) errors.push(`mcp_config.json: "mcpServers" object is required`);
    return [];
  }
  for (const [key, server] of Object.entries(servers)) {
    const where = `mcp_config.json: server "${key}"`;
    const transports = ["command", "serverUrl", "url"].filter((t) => server[t] !== undefined);
    if (transports.length !== 1) errors.push(`${where}: needs exactly one of command / serverUrl / url`);
    const remote = server.serverUrl ?? server.url;
    if (remote !== undefined && !/^(https:\/\/|\$\{)/.test(remote)) errors.push(`${where}: remote URL must be https://`);

    const declared = new Set();
    for (const variable of server.variables ?? []) {
      if (!variable?.name) errors.push(`${where}: every variable needs a "name"`);
      else declared.add(variable.name);
    }
    const used = new Set([...JSON.stringify({ ...server, variables: undefined }).matchAll(/\$\{([A-Za-z0-9_]+)(:-[^}]*)?\}/g)]
      .map((m) => {
        if (m[2]) errors.push(`${where}: "\${${m[1]}${m[2]}}" uses a default, which Antigravity does not document`);
        return m[1];
      }));
    for (const name of used) {
      if (!declared.has(name) && !BUILTIN_VARS.has(name)) errors.push(`${where}: \${${name}} is not declared in variables`);
    }
    for (const name of declared) {
      if (!used.has(name)) errors.push(`${where}: variable "${name}" is declared but never used`);
    }
  }
  return Object.keys(servers);
}

export function validate(root) {
  const errors = [];
  const dir = path.resolve(root);
  const manifest = validateManifest(dir, errors);
  const skills = validateSkills(dir, manifest, errors);
  const rules = validateRules(dir, errors);
  const mcpServers = validateMcp(dir, errors);
  return { errors, components: { skills, rules, mcpServers } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? ".";
  const { errors, components } = validate(root);
  console.log(`skills: ${components.skills.join(", ") || "none"}`);
  console.log(`rules: ${components.rules.join(", ") || "none"}`);
  console.log(`mcpServers: ${components.mcpServers.join(", ") || "none"}`);
  if (errors.length) {
    console.error("\nValidation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("\nValidation passed.");
}
