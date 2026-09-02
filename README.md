# LiveKit VoiceLab

A dashboard for testing real LiveKit Voice AI capabilities end to end — configure an agent
(LLM, STT, TTS, voice, language, turn detection, ambience), place a call to it from the
browser, and inspect what actually happened: transcript, per-turn metrics, tool calls, and
termination reason.

> **Status:** early scaffolding. The monorepo layout, database schema, provider catalog and
> local infrastructure are in place; application source under `server/src`, `agent/src` and
> `client/src` is still being written. Commands below describe the intended workflow.

---

## Architecture

Four npm workspaces in one repo:

| Workspace | Package | Role |
| --- | --- | --- |
| `client/` | `@voicelab/client` | React 19 + Vite + Tailwind 4 dashboard. Joins the LiveKit room with `@livekit/components-react`, renders live transcript and metrics. |
| `server/` | `@voicelab/server` | Express API. Issues LiveKit access tokens, stores agents/configs/calls in Postgres via Prisma, ingests knowledge documents to S3 and embeds them into pgvector. |
| `agent/` | `@voicelab/agent` | The LiveKit voice agent worker (`@livekit/agents` 1.7). Loads a config, wires the STT → LLM → TTS pipeline, applies noise cancellation, and reports metrics back. |
| `packages/shared/` | `@voicelab/shared` | Types and the provider catalog shared by all three — the single source of truth for which providers, voices, models and languages exist. |

**Providers currently in the catalog** (`packages/shared/src/catalog.ts`):

- **TTS** — OpenAI, ElevenLabs, Cartesia
- **STT** — Deepgram, OpenAI
- **LLM** — OpenAI

LiveKit itself is **not** run by this repo. The agent and server talk to LiveKit Cloud (or any
LiveKit server) over the network via `LIVEKIT_URL`.

### Data model

Prisma schema at `server/prisma/schema.prisma`:

`Agent` → `AgentConfig` → `Call` → (`TranscriptEntry`, `CallMetric`, `ToolCallLog`), plus
`KnowledgeDocument` → `KnowledgeChunk` for retrieval (embeddings stored with the pgvector
extension).

---

## Prerequisites

- **Node.js ≥ 20**
- **Docker** + Docker Compose (for Postgres and MinIO)
- A **LiveKit Cloud** project, or a locally run `livekit-server`
- API keys for whichever providers you enable (OpenAI at minimum)

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure environment

Create `.env` in the repo root:

```bash
# LiveKit — from your LiveKit Cloud project settings
LIVEKIT_URL=wss://<your-project>.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# AI providers (only what you actually use)
OPENAI_API_KEY=
OPENROUTER_API_KEY=
DEEPGRAM_API_KEY=
ELEVEN_API_KEY=
CARTESIA_API_KEY=

# Local Postgres (consumed by docker-compose.yml)
POSTGRES_USER=voicelab
POSTGRES_PASSWORD=voicelab
POSTGRES_DB=voicelab
POSTGRES_PORT=5434

# Local MinIO / S3-compatible object storage
S3_ACCESS_KEY_ID=voicelab
S3_SECRET_ACCESS_KEY=voicelab123
S3_BUCKET=voicelab-knowledge
MINIO_API_PORT=9010
MINIO_CONSOLE_PORT=9011
```

And `server/.env` for Prisma:

```bash
DATABASE_URL=postgresql://voicelab:voicelab@localhost:5434/voicelab
```

> The env var names above are what the LiveKit plugins actually read — note ElevenLabs uses
> `ELEVEN_API_KEY`, not `ELEVENLABS_API_KEY`.

### 3. Start local infrastructure

```bash
npm run infra:up      # postgres (pgvector/pg16) + minio + bucket creation
npm run infra:logs    # tail their logs
npm run infra:down    # stop
```

Postgres listens on **5434**, MinIO API on **9010**, MinIO console on **9011**
(http://localhost:9011, log in with `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`).

### 4. Prepare the database

```bash
npm run db:migrate    # apply Prisma migrations
npm run db:seed       # seed starter data
npm run db:studio     # browse the DB in Prisma Studio
```

### 5. Download agent model files

The agent needs local model weights (Silero VAD, turn detection) before its first run:

```bash
npm run download-files
```

### 6. Run everything

```bash
npm run dev
```

Runs `server`, `agent` and `client` concurrently with colour-coded output. Individual
processes:

```bash
npm run dev:server
npm run dev:agent
npm run dev:client
```

---

## LiveKit Cloud setup

1. Create a project at [cloud.livekit.io](https://cloud.livekit.io).
2. Copy the **WebSocket URL**, **API key** and **API secret** into `LIVEKIT_URL`,
   `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
3. The agent connects as a worker and waits for jobs; the client joins the same room using a
   token minted by the server.

Prefer to stay offline? Run a dev server instead and point `LIVEKIT_URL` at it:

```bash
livekit-server --dev            # ws://localhost:7880, devkey / secret
```

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Build shared, then run server + agent + client together |
| `npm run build` | Build shared → server → agent → client |
| `npm run typecheck` | Type-check every workspace |
| `npm run build:shared` | Build `@voicelab/shared` only (other workspaces depend on its `dist/`) |
| `npm run infra:up` / `infra:down` / `infra:logs` | Manage Postgres + MinIO |
| `npm run db:migrate` / `db:seed` / `db:studio` | Prisma migrate, seed, studio |
| `npm run download-files` | Fetch agent model files |

`@voicelab/shared` is consumed from its compiled `dist/`, so run `build:shared` (or
`npm run dev --workspace packages/shared` to watch) after changing it.

---

## Repository layout

```
agent/                  LiveKit agent worker
client/                 React dashboard (Vite)
server/                 Express API
  prisma/schema.prisma  Database schema
packages/shared/        Shared types + provider catalog
infra/postgres/init.sql pgvector extension bootstrap
docker-compose.yml      Postgres + MinIO
tsconfig.base.json      Shared TypeScript config (ES2022, NodeNext, strict)
```

---

## Notes

- Secrets live in `.env` files, which are git-ignored. Never commit real keys.
- In production, point the `S3_*` variables at real S3 / R2 / B2 instead of MinIO — no code
  change needed.
