# Render Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide Render Infrastructure as Code configuration to automatically deploy the application.

**Architecture:** A web service built with NestJS, a Postgres database, and a Redis instance automatically connected via Render internal URLs.

**Tech Stack:** Render (YAML Blueprint), NestJS, PostgreSQL, Redis.

---

### Task 1: Create render.yaml configuration

**Files:**
- Create: `render.yaml`

- [ ] **Step 1: Write `render.yaml`**

```yaml
services:
  - type: web
    name: ecoback-backend
    env: node
    rootDir: ecoback-backend
    buildCommand: "npm install && npx prisma generate && npm run build"
    preDeployCommand: "npx prisma migrate deploy"
    startCommand: "npm run start"
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: ecoback-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: ecoback-redis
          property: connectionString

  - type: redis
    name: ecoback-redis
    ipAllowList: [] # empty array restricts to internal access only

databases:
  - name: ecoback-db
    databaseName: ecoback
    user: ecoback_user
```

- [ ] **Step 2: Commit**

```bash
git add render.yaml
git commit -m "chore: add render.yaml deployment configuration"
```
