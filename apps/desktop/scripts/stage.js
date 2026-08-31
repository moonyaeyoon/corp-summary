const { chmodSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } = require("node:fs");
const { basename, dirname, join, resolve } = require("node:path");

const desktopRoot = resolve(__dirname, "..");
const repoRoot = resolve(desktopRoot, "..", "..");
const bundleRoot = join(desktopRoot, ".bundle");

function copyDirectory(source, target) {
  if (!existsSync(source)) {
    throw new Error(`Required build output is missing: ${source}`);
  }

  cpSync(source, target, {
    recursive: true,
  });
}

function readEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  const content = require("node:fs").readFileSync(path, "utf8");

  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");

        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function copyOptionalFile(source, target) {
  if (!source || !existsSync(source)) {
    return null;
  }

  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target);

  return target;
}

rmSync(bundleRoot, {
  force: true,
  recursive: true,
});
mkdirSync(bundleRoot, {
  recursive: true,
});
mkdirSync(join(bundleRoot, "bin"), {
  recursive: true,
});
mkdirSync(join(bundleRoot, "models"), {
  recursive: true,
});

copyDirectory(join(repoRoot, "apps", "web", "out"), join(bundleRoot, "web"));
copyDirectory(join(repoRoot, "apps", "server", "dist"), join(bundleRoot, "server", "dist"));
copyDirectory(join(repoRoot, "apps", "server", "resources"), join(bundleRoot, "server", "resources"));

const serverEnv = readEnvFile(join(repoRoot, "apps", "server", ".env"));
const modelPath = serverEnv.AI_MODEL_PATH || join(repoRoot, "apps", "server", "qwen2.5-coder-7b-instruct-q4_k_m.gguf");
const llamaPath = serverEnv.AI_LLAMACLI_PATH;
const stagedModel = copyOptionalFile(modelPath, join(bundleRoot, "models", basename(modelPath)));
const stagedLlama = copyOptionalFile(
  llamaPath,
  join(bundleRoot, "bin", process.platform === "win32" ? "llama.exe" : "llama"),
);

if (stagedLlama && process.platform !== "win32") {
  chmodSync(stagedLlama, 0o755);
}

writeFileSync(
  join(bundleRoot, "desktop-manifest.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      hasLlamaBinary: Boolean(stagedLlama),
      hasModel: Boolean(stagedModel),
      web: "web/index.html",
      server: "server/dist/main.js",
    },
    null,
    2,
  )}\n`,
);
