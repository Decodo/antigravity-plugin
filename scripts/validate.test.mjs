import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

import { parseFrontmatter, validate } from "./validate.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temps = [];
after(() => temps.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

// Copy only the shipped plugin files into a scratch dir so each test can break one thing.
function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "decodo-plugin-"));
  temps.push(dir);
  for (const entry of [".antigravity-plugin", "assets", "skills", "rules", "mcp_config.json"]) {
    cpSync(path.join(repo, entry), path.join(dir, entry), { recursive: true });
  }
  return dir;
}

function editJson(file, change) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  change(data);
  writeFileSync(file, JSON.stringify(data));
}

const manifestOf = (dir) => path.join(dir, ".antigravity-plugin/plugin.json");

test("the shipped plugin passes", () => {
  const { errors, components } = validate(repo);
  assert.deepEqual(errors, []);
  assert.deepEqual(components.skills.sort(), ["decodo", "decodo-setup", "decodo-status"]);
  assert.deepEqual(components.rules, ["decodo-recovery.md"]);
  assert.deepEqual(components.mcpServers, ["decodo"]);
});

test("rejects manifest keys the schema does not allow", () => {
  const dir = fixture();
  editJson(manifestOf(dir), (m) => { m.category = "integrations"; });
  assert.match(validate(dir).errors.join("\n"), /unknown key "category"/);
});

test("rejects a skill whose name does not match its folder", () => {
  const dir = fixture();
  const file = path.join(dir, "skills/decodo-status/SKILL.md");
  writeFileSync(file, readFileSync(file, "utf8").replace("name: decodo-status", "name: status"));
  assert.match(validate(dir).errors.join("\n"), /must match folder "decodo-status"/);
});

test("rejects a rule without a valid trigger", () => {
  const dir = fixture();
  const file = path.join(dir, "rules/decodo-recovery.md");
  writeFileSync(file, readFileSync(file, "utf8").replace("trigger: model_decision", "alwaysApply: false"));
  assert.match(validate(dir).errors.join("\n"), /trigger must be one of/);
});

test("rejects an undeclared or defaulted MCP variable", () => {
  const dir = fixture();
  editJson(path.join(dir, "mcp_config.json"), (c) => {
    c.mcpServers.decodo.serverUrl = "https://mcp.decodo.com/mcp?toolsets=${DECODO_TOOLSETS:-web,search}";
  });
  const errors = validate(dir).errors.join("\n");
  assert.match(errors, /uses a default/);
  assert.match(errors, /\$\{DECODO_TOOLSETS\} is not declared/);
});

test("rejects a missing logo", () => {
  const dir = fixture();
  editJson(manifestOf(dir), (m) => { m.logo = "assets/missing.svg"; });
  assert.match(validate(dir).errors.join("\n"), /does not exist/);
});

test("parses folded block scalars in frontmatter", () => {
  const fm = parseFrontmatter("---\nname: x\ndescription: >-\n  one\n  two\nlicense: MIT\n---\nbody\n");
  assert.deepEqual(fm, { name: "x", description: "one two", license: "MIT" });
});
