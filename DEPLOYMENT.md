# Deployment

How to run the auth service locally, in Docker (dev), and in Docker (production).

## Environment variables

Copy the example file and adjust as needed:

```bash
cp .env.example .env
```

| Variable       | Default         | Description                          |
| -------------- | --------------- | ------------------------------------ |
| `PORT`         | `3001`          | HTTP port the service listens on     |
| `NODE_ENV`     | `development`   | `development` or `production`      |
| `SERVICE_NAME` | `auth-service`  | Name returned by `/health`           |
| `DATABASE_URL` | —               | PostgreSQL connection string (Prisma) |

See [PRISMA.md](./PRISMA.md) for database migrations and seeding.

## Option 1: Local (no Docker)

Best for day-to-day coding with the fastest feedback loop.

```bash
npm install
npm run dev
```

- Hot reload via `tsx watch`
- URL: `http://localhost:3001`
- Health: `curl http://localhost:3001/health`

Other scripts: `npm run build`, `npm start`, `npm run typecheck`, `npm run lint`, `npm test`

### Tests

```bash
npm test              # run once
npm run test:watch    # watch mode
```

Uses [Vitest](https://vitest.dev/) and [Supertest](https://github.com/ladjs/supertest) for unit and HTTP integration tests under `src/**/*.test.ts`.

## Option 2: Docker — development

Use when you want the service in a container but still edit `src/` on the host with hot reload.

**Files:** `Dockerfile.dev`, `docker-compose.dev.yml`

```bash
cp .env.example .env   # if you have not already
docker compose -f docker-compose.dev.yml up --build
```

Rebuild after dependency changes (`package.json` / `package-lock.json`):

```bash
docker compose -f docker-compose.dev.yml up --build
```

Stop:

```bash
docker compose -f docker-compose.dev.yml down
```

**Behavior:**

- Installs all dependencies (including dev) in the image
- Mounts `./src` into the container; `tsx watch` reloads on file changes
- Uses an anonymous volume for `node_modules` so host mounts do not overwrite container deps
- `NODE_ENV=development`

## Option 3: Docker — production

Use to verify the production image or run a prod-like build locally.

**Files:** `Dockerfile`, `docker-compose.yml`

```bash
docker compose up --build
```

Stop:

```bash
docker compose down
```

**Behavior:**

- Multi-stage build: compile TypeScript in builder, run `node dist/index.js` in runner
- Production dependencies only (`npm ci --omit=dev`)
- No source volume mounts
- `NODE_ENV=production`

## Quick reference

| Goal              | Command                                              |
| ----------------- | ---------------------------------------------------- |
| Local dev         | `npm run dev`                                        |
| Docker dev        | `docker compose -f docker-compose.dev.yml up --build` |
| Docker prod       | `docker compose up --build`                          |
| Build image only  | `docker build -f Dockerfile.dev -t auth-service:dev .` |
| Prod image only   | `docker build -t auth-service:prod .`                |

## Endpoints

| Method | Path      | Description   |
| ------ | --------- | ------------- |
| GET    | `/health` | Health check  |
| GET    | `/api` | Service info  |

## Troubleshooting

**Port already in use**

Change `PORT` in `.env` and map the same port in compose, e.g. `3002:3002` with `PORT=3002`.

**Dev container not picking up code changes**

Ensure you are using `docker-compose.dev.yml` (not the production compose file) and editing files under `src/`.

**Dependency changes not reflected in dev container**

Rebuild: `docker compose -f docker-compose.dev.yml up --build`.
