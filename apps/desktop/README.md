# Corp Summary Desktop

Electron shell for packaging the local Corp Summary web tool.

## Local Run

```bash
npm run desktop:dev
```

This builds `apps/server`, exports `apps/web`, stages files into `apps/desktop/.bundle`, then opens Electron.

## Mac Package

```bash
npm run desktop:dist:mac
```

Output is written to `apps/desktop/release`.

## Windows Package

Run this on a Windows machine after cloning the repo and installing dependencies.

```bash
npm install
npm run desktop:dist:win
```

Output is written to `apps/desktop/release`.

## Runtime Config

For packaged apps, create `server.env` under Electron's user data directory if DB settings need to differ by machine. The Electron main process sets these values automatically:

```txt
PORT=4820
CORS_ORIGIN=null,http://localhost:3000,http://127.0.0.1:3000
AI_GUIDE_PATH=<bundled guide_current.md>
AI_SCHEMA_PATH=<bundled schema_current.md>
AI_MODEL_PATH=<bundled qwen model if present>
AI_LLAMACLI_PATH=<bundled llama binary if present>
```

Large `.gguf` model files should stay out of git. Put the model at `apps/server/qwen2.5-coder-7b-instruct-q4_k_m.gguf` before packaging, or set `AI_MODEL_PATH` in `apps/server/.env` so the staging script can copy it.
