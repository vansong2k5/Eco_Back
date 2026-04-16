# Render Deployment Architecture Design

## Objective
To continuously deploy the `ecoback-backend` using Render's Infrastructure as Code (Blueprint), orchestrating a complete setup with PostgreSQL, Redis, and a Node.js Web Service on a unified internal network.

## Architecture & Services
The deployment is entirely defined by a `render.yaml` configuration stored at the root of the project. This will initialize three primary resources within Render:

1. **PostgreSQL Database**
   - Managed DB provisioned directly on Render.
   - Internal URL connection automatically provided to the web service for fast, secure connections.

2. **Redis Service**
   - Managed Redis instance provisioned directly on Render.
   - Used for caching/queuing.

3. **Web Service (EcoBack Backend)**
   - Type: Web Service (Node.js/NestJS).
   - Root Directory: `ecoback-backend`.
   - Node Environment: Production (`NODE_ENV=production`).

## Build & Deployment Process
To guarantee reliable deployments, the web service follows these sequential steps during deployment:

1. **Build Step (`buildCommand`)**:
   `npm install && npx prisma generate && npm run build`
   Installs dependencies, generates the Prisma client for database schema mapping, and compiles the TypeScript code.

2. **Pre-Deploy Step (`preDeployCommand`)**:
   `npx prisma migrate deploy`
   Applies any pending Prisma database migrations *before* the new application version receives traffic, ensuring the code matches the database schema.

3. **Start Step (`startCommand`)**:
   `npm run start`
   Starts the compiled application (`node dist/main.js`). The application inherits the assigned `PORT` automatically from the environment.

## Environment Variables
The Web Service intrinsically binds variables from the other services via the Blueprint definition:
- `DATABASE_URL`: Injected from the PostgreSQL service (`fromDatabase`).
- `REDIS_URL`: Injected from the Redis service (`fromService`).
- `NODE_ENV`: Set to `production`.

## Scope & Implementation
This specification solely focuses on adding the `render.yaml` infrastructure file and confirming `ecoback-backend/package.json` possesses the required scripts (`start`, `build`).

This configuration acts as an immutable infrastructure track to allow full automation once committed and synced to the Render system.
