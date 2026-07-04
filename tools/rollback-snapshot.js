#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const snapshotRoot = path.resolve(repoRoot, "..", "anu-dorm-guide-rollback");
const maxVersions = 3;
const command = process.argv[2] || "list";
const targetVersion = process.argv[3];
const confirmed = process.argv.includes("--yes");

const skipNames = new Set([
  ".git",
  ".DS_Store",
  "node_modules"
]);

function usage() {
  console.log(`Rollback snapshots for ${repoRoot}

Commands:
  node tools/rollback-snapshot.js save
  node tools/rollback-snapshot.js list
  node tools/rollback-snapshot.js restore <0|1|2|3> --yes

Snapshots live outside the repo at:
  ${snapshotRoot}
`);
}

function ensureRoot() {
  fs.mkdirSync(snapshotRoot, { recursive: true });
}

function shouldSkip(name) {
  return skipNames.has(name);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (shouldSkip(entry.name)) continue;

    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(from, to);
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      fs.cpSync(from, to, { recursive: true });
    }
  }
}

function removeContents(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (shouldSkip(entry.name)) continue;
    fs.rmSync(path.join(dir, entry.name), { recursive: true, force: true });
  }
}

function snapshotPath(version) {
  return path.join(snapshotRoot, `v${version}`);
}

function writeMeta(dir) {
  fs.writeFileSync(
    path.join(dir, ".snapshot.json"),
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        repoRoot
      },
      null,
      2
    )}\n`
  );
}

function readMeta(dir) {
  const metaFile = path.join(dir, ".snapshot.json");
  if (!fs.existsSync(metaFile)) return null;

  try {
    return JSON.parse(fs.readFileSync(metaFile, "utf8"));
  } catch {
    return null;
  }
}

function save() {
  ensureRoot();

  fs.rmSync(snapshotPath(maxVersions), { recursive: true, force: true });
  for (let version = maxVersions - 1; version >= 0; version -= 1) {
    const from = snapshotPath(version);
    const to = snapshotPath(version + 1);
    if (fs.existsSync(from)) {
      fs.rmSync(to, { recursive: true, force: true });
      fs.renameSync(from, to);
    }
  }

  const current = snapshotPath(0);
  fs.rmSync(current, { recursive: true, force: true });
  copyDir(repoRoot, current);
  writeMeta(current);
  console.log(`Saved snapshot v0 at ${current}`);
}

function list() {
  ensureRoot();

  for (let version = 0; version <= maxVersions; version += 1) {
    const dir = snapshotPath(version);
    const meta = readMeta(dir);
    const label = meta?.createdAt || (fs.existsSync(dir) ? "no metadata" : "empty");
    console.log(`v${version}: ${label}`);
  }
}

function restore() {
  const version = Number(targetVersion);
  if (!Number.isInteger(version) || version < 0 || version > maxVersions) {
    usage();
    process.exit(1);
  }

  const source = snapshotPath(version);
  if (!fs.existsSync(source)) {
    console.error(`Snapshot v${version} does not exist.`);
    process.exit(1);
  }

  if (!confirmed) {
    console.error("Restore requires --yes because it replaces repo files.");
    process.exit(1);
  }

  removeContents(repoRoot);
  copyDir(source, repoRoot);
  console.log(`Restored snapshot v${version} into ${repoRoot}`);
}

if (command === "save") {
  save();
} else if (command === "list") {
  list();
} else if (command === "restore") {
  restore();
} else {
  usage();
  process.exit(1);
}
