# HAPI

Run official Claude Code / Codex / Gemini / OpenCode sessions locally and control them remotely through a Web / PWA / Telegram Mini App.

> **Why HAPI?** HAPI is a local-first alternative to Happy. See [Why Not Happy?](docs/guide/why-hapi.md) for the key differences.

## Features

- **Seamless Handoff** - Work locally, switch to remote when needed, switch back anytime. No context loss, no session restart.
- **Native First** - HAPI wraps your AI agent instead of replacing it. Same terminal, same experience, same muscle memory.
- **AFK Without Stopping** - Step away from your desk? Approve AI requests from your phone with one tap.
- **Your AI, Your Choice** - Claude Code, Codex, Cursor Agent, Gemini, OpenCode—different models, one unified workflow.
- **Terminal Anywhere** - Run commands from your phone or browser, directly connected to the working machine.
- **Voice Control** - Talk to your AI agent hands-free using the built-in voice assistant.

## Demo

https://github.com/user-attachments/assets/38230353-94c6-4dbe-9c29-b2a2cc457546

## Getting Started

```bash
npx @twsxtd/hapi hub --relay     # start hub with E2E encrypted relay
npx @twsxtd/hapi                 # run claude code
```

`hapi server` remains supported as an alias.

The terminal will display a URL and QR code. Scan the QR code with your phone or open the URL to access.

> The relay uses WireGuard + TLS for end-to-end encryption. Your data is encrypted from your device to your machine.

For self-hosted options (Cloudflare Tunnel, Tailscale), see [Installation](docs/guide/installation.md)

## Docs

- [App](docs/guide/pwa.md)
- [How it Works](docs/guide/how-it-works.md)
- [Cursor Agent](docs/guide/cursor.md)
- [Voice Assistant](docs/guide/voice-assistant.md)
- [Why HAPI](docs/guide/why-hapi.md)
- [FAQ](docs/guide/faq.md)

## Build from source

```bash
bun install
bun run build:single-exe
```

## Docker

Build the image locally:

```bash
docker build -t hapi:latest .
```

Run the hub with persistent data:

```bash
docker run -d \
  --name hapi \
  -p 3006:3006 \
  -e CLI_API_TOKEN=change-me \
  -e HAPI_PUBLIC_URL=http://localhost:3006 \
  -v hapi-data:/data \
  hapi:latest
```

The container starts `hub/dist/index.js`, serves the built web app from `web/dist`, listens on port `3006`, and stores data in `/data`.

## GitHub Actions Docker build

This repo now includes `.github/workflows/docker.yml` to build the Docker image on pushes, pull requests, tags, or manual runs.

- GHCR image: `ghcr.io/<owner>/<repo>`
- Optional Docker Hub image: set repository variable `DOCKERHUB_IMAGE` (for example `yourname/hapi`)
- Required Docker Hub secrets when pushing there: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
- Manual runs can choose whether to push to GHCR / Docker Hub and can override the Docker Hub image name

## Credits

HAPI means "哈皮" a Chinese transliteration of [Happy](https://github.com/slopus/happy). Great credit to the original project.
