const { rmSync } = require("node:fs");
const { join, resolve } = require("node:path");

const repoRoot = resolve(__dirname, "..", "..", "..");

for (const path of [join(repoRoot, "apps", "web", ".next"), join(repoRoot, "apps", "web", "out")]) {
  rmSync(path, {
    force: true,
    recursive: true,
  });
}
