# Redis Docker container

**Redis Docker container** to run redis using docker.

---

## Table of Contents
1. [Prerequisites](#Prerequisites)
2. [Steps](#Steps)

---

## Prerequisites

Please make sure below software  is installed before proceed , you may skip these step if installed:
- **Rancher Desktop by SUSE**: https://rancherdesktop.io/

---

## Steps

1. Start rancher desktop

2. Clone the repository:

```bash
git clone <repository_url>
```
3. Go to repository directory

```bash
cd redis_container
```

4. create .env file

```bash
cp .env.example .env

```

5. you may change .env configuration according to your preferences

   Set a strong `REDIS_PASSWORD` (and optionally change `REDIS_USERNAME`).

6. start docker compose

```bash
docker compose up
```

6. stop docker compose ( optional )

```bash
docker compose down #stop and remove the docker container
docker compose down -v #stop and remove the docker container and the volume
```

## Authentication (username + password)

Redis runs with **ACL** (Redis 6+):

- `default` user is **disabled**
- Only `REDIS_USERNAME` / `REDIS_PASSWORD` from `.env` can connect

**Test from your machine:**

```bash
redis-cli -u "redis://auth_redis_user:change_me_to_a_strong_password@127.0.0.1:6379" ping
# PONG
```

**Connection URL for the auth service app:**

```
redis://<REDIS_USERNAME>:<REDIS_PASSWORD>@localhost:<REDIS_HOST_PORT>
```

If Redis was already running without auth, recreate the container after changing `.env`:

```bash
docker compose down
docker compose up -d
```

---

