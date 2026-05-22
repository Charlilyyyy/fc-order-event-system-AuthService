# Postgresql Docker container

**Postgresql Docker container** to run Postgresql using docker.

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
cd mysql_container
```

4. create .env file

```bash
cp .env.example .env

```

5. you may change .env configuration according to your preferences

6. start docker compose

```bash
docker compose up
```

6. stop docker compose ( optional )

```bash
docker compose down #stop and remove the docker container
docker compose down -v #stop and remove the docker container and the volume
```
---

