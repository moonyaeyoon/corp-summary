const { app, BrowserWindow, dialog } = require("electron");
const { existsSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const API_PORT = process.env.CORP_SUMMARY_API_PORT || "4820";
const API_BASE_URL = `http://127.0.0.1:${API_PORT}/v1`;

function getBundlePath(...parts) {
  const basePath = app.isPackaged
    ? join(process.resourcesPath, "app.asar", ".bundle")
    : resolve(__dirname, "..", ".bundle");

  return join(basePath, ...parts);
}

function getUnpackedBundlePath(...parts) {
  const unpackedPath = app.isPackaged
    ? join(process.resourcesPath, ".bundle")
    : resolve(__dirname, "..", ".bundle");

  return join(unpackedPath, ...parts);
}

function pickExistingPath(paths) {
  return paths.find((path) => path && existsSync(path));
}

function configureServerEnvironment() {
  const serverEnvPath = app.isPackaged
    ? join(app.getPath("userData"), "server.env")
    : resolve(__dirname, "..", "..", "server", ".env");
  const modelPath = pickExistingPath([
    process.env.AI_MODEL_PATH,
    getUnpackedBundlePath("models", "qwen2.5-coder-7b-instruct-q4_k_m.gguf"),
    getBundlePath("models", "qwen2.5-coder-7b-instruct-q4_k_m.gguf"),
  ]);
  const llamaPath = pickExistingPath([
    process.env.AI_LLAMACLI_PATH,
    getUnpackedBundlePath("bin", process.platform === "win32" ? "llama.exe" : "llama"),
    getBundlePath("bin", process.platform === "win32" ? "llama.exe" : "llama"),
  ]);

  process.env.PORT = API_PORT;
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "null,http://localhost:3000,http://127.0.0.1:3000";
  process.env.CORP_SUMMARY_API_BASE_URL = API_BASE_URL;
  process.env.SERVER_ENV_PATH = existsSync(serverEnvPath) ? serverEnvPath : "";
  process.env.AI_GUIDE_PATH = getBundlePath("server", "resources", "ai", "guide_current.md");
  process.env.AI_SCHEMA_PATH = getBundlePath("server", "resources", "ai", "schema_current.md");
  process.env.AI_LLAMACLI_SUBCOMMAND = process.env.AI_LLAMACLI_SUBCOMMAND || "cli";

  if (modelPath) {
    process.env.AI_MODEL_PATH = modelPath;
  }

  if (llamaPath) {
    process.env.AI_LLAMACLI_PATH = llamaPath;
  }
}

async function startApiServer() {
  configureServerEnvironment();

  const serverEntry = getBundlePath("server", "dist", "main.js");

  if (!existsSync(serverEntry)) {
    throw new Error(`Server entry not found: ${serverEntry}`);
  }

  await import(pathToFileURL(serverEntry).href);
}

async function waitForApi() {
  const deadline = Date.now() + 20000;
  const healthUrl = `${API_BASE_URL}`;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl);

      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
    }
  }

  throw new Error("API server did not become ready in time.");
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#fafafb",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "preload.js"),
    },
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  const indexPath = getBundlePath("web", "index.html");

  if (!existsSync(indexPath)) {
    throw new Error(`Web entry not found: ${indexPath}`);
  }

  await window.loadFile(indexPath);
}

app.whenReady().then(async () => {
  try {
    await startApiServer();
    await waitForApi();
    await createWindow();
  } catch (error) {
    dialog.showErrorBox(
      "Corp Summary 실행 실패",
      error instanceof Error ? error.message : "앱을 실행하지 못했습니다.",
    );
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
