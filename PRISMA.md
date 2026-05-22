# Prisma setup

PostgreSQL ORM for the auth service. Matches the local DB in [`postgresql/`](./postgresql/).

## Prerequisites

1. Start Postgres:

```bash
cd postgresql
cp .env.example .env   # if needed
docker compose up -d
```

2. App `.env` includes `DATABASE_URL` (see root `.env.example`).

Default URL (aligned with `postgresql/.env.example`):

```
postgresql://user:password@localhost:5432/app?schema=public
```

## First-time setup

From the project root (`260521-boilerplate_setup/`):

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed    # optional sample user
```

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Create & apply migrations (dev) |
| `npm run db:migrate:deploy` | Apply migrations (CI/prod) |
| `npm run db:push` | Push schema without migration files |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Run `prisma/seed.ts` |

## Schema

`prisma/schema.prisma` defines a `User` model for auth:

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | UUID | Primary key |
| `email` | string | Unique |
| `passwordHash` | string | Replace with bcrypt/argon2 in signup flow |
| `name` | string? | Optional display name |
| `createdAt` / `updatedAt` | datetime | Auto-managed |

## Usage in code

```ts
import { prisma } from "./lib/prisma.js";

const users = await prisma.user.findMany();
```

Disconnect on shutdown (already wired in `src/index.ts`).

## Production / Docker

- Run `npm run db:migrate:deploy` before or when starting the app.
- `postinstall` runs `prisma generate` after `npm install`.
- Production `Dockerfile` copies `prisma/` and generated client artifacts.

## Troubleshooting

**`Can't reach database server`**

- Ensure Postgres is up: `docker compose -f postgresql/docker-compose.yaml ps`
- Check `DATABASE_URL` host/port match `POSTGRES_HOST_PORT` (default `5432`).

**Migration drift after manual SQL**

Prefer Prisma migrations. If you used `postgresql/data.sql` earlier, reset the dev DB:

```bash
cd postgresql && docker compose down -v && docker compose up -d
cd .. && npm run db:migrate
```
