# fc-order-event-system-AuthService

TypeScript + Express boilerplate for the auth service.

## Prerequisites

- Node.js 20+
- npm

## Quick start

```bash
cp .env.example .env
npm install

# Start Postgres (see postgresql/), then:
npm run db:migrate

npm run dev
```

The service listens on `http://localhost:3001` by default.

## Scripts

| Script        | Description                    |
| ------------- | ------------------------------ |
| `npm run dev` | Start with hot reload (tsx)    |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start`   | Run compiled output            |
| `npm run typecheck` | Type-check without emit  |
| `npm run lint` | Lint `src/` with ESLint       |
| `npm test`     | Run tests once (Vitest)       |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:studio` | Prisma Studio GUI |

Database setup: [PRISMA.md](./PRISMA.md)

## Endpoints

| Method | Path           | Description        |
| ------ | ---------------- | ------------------ |
| GET    | `/health`        | Health check       |
| GET    | `/api`        | Service info       |

## Docker

**Development** (hot reload, mounted `src/`):

```bash
docker compose -f docker-compose.dev.yml up --build
```

**Production** (compiled image):

```bash
docker compose up --build
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full run options and environment variables.

## Project layout

```
prisma/
  schema.prisma   # Database schema
  seed.ts         # Seed script
src/
  config/env.ts   # Environment config
  lib/prisma.ts   # Prisma client singleton
  routes/         # HTTP route handlers
  app.ts          # Express app factory
  index.ts        # Entry point
```
