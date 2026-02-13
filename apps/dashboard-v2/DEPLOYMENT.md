# Dashboard-v2 Deployment

## Quick Start

```bash
# Using docker-compose (recommended)
docker-compose up dashboard-v2

# Docker build and run
docker build -t dashboard-v2 . --target dashboard_v2
docker run -p 4323:4323 --env-file .env dashboard-v2
```

## Prerequisites

- Docker & Docker Compose
- Bun runtime (for local development)
- Node.js 20+ (for the production Node server)

## Port Configuration

Dashboard-v2 runs on port **4323** in production.

## Environment Variables

### Required Environment Variables

Set these in your `.env` file or pass as build args/runtime env vars:

- `CONVEX_SELF_HOSTED_URL`
- `CONVEX_SELF_HOSTED_ADMIN_KEY`
- `VITE_LOGTO_ENDPOINT`
- `VITE_LOGTO_APP_ID`
- `VITE_LOGTO_APP_SECRET`
- `VITE_LOGTO_REDIRECT_URI`
- `VITE_LOGTO_SCOPES`
- `REPLY_TO_EMAIL`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `MXROUTE_EMAIL_DOMAIN`
- `MXROUTE_EMAIL_OUTBOUND_LIMIT`
- `MXROUTE_EMAIL_QUOTA`
- `MXROUTE_LOGIN_KEY`
- `MXROUTE_SERVER_LOGIN`
- `MXROUTE_SERVER_URL`
- `OPENROUTER_API_KEY`
- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`

## Docker Deployment

### Build (Local)

```bash
docker build -t dashboard-v2 . --target dashboard_v2
```

### Build with Build Args

```bash
docker build -t dashboard-v2 . --target dashboard_v2 \
  --build-arg PUBLIC_FIREBASE_WEB_API_KEY=${PUBLIC_FIREBASE_WEB_API_KEY} \
  --build-arg PUBLIC_FIREBASE_AUTH_DOMAIN=${PUBLIC_FIREBASE_AUTH_DOMAIN} \
  # ... additional build args
```

### Run

```bash
docker run -d \
  -p 4323:4323 \
  --env-file .env \
  --restart always \
  dashboard-v2
```

### Using Docker Compose

```bash
# Start dashboard-v2 only
docker-compose up dashboard-v2

# Start in detached mode
docker-compose up -d dashboard-v2

# View logs
docker-compose logs -f dashboard-v2

# Stop
docker-compose stop dashboard-v2

# Rebuild and restart
docker-compose up -d --build dashboard-v2
```

## Local Development

```bash
# Install dependencies
bun install

# Start development server (port 3000)
bun run dev

# Build for production
bun run build

# Start production server locally
bun run start
```

## Production Build

The application builds to `.output/server/index.mjs` and runs with Node.js:

1. **Build**: `bun run build` (Vite build)
2. **Output**: `.output/` directory
3. **Start**: `node .output/server/index.mjs`

## Docker Configuration Details

### Dockerfile Target

```dockerfile
# Multi-stage build
FROM base as dashboard_v2_builder
WORKDIR /app/apps/dashboard-v2
RUN bun run build

FROM base as dashboard_v2
COPY --from=dashboard_v2_builder /app/apps/dashboard-v2/.output /app/apps/dashboard-v2/.output
WORKDIR /app/apps/dashboard-v2
EXPOSE 4323
CMD ["bun", "run", "start"]
```

### Docker Compose Service

```yaml
dashboard-v2:
  build:
    context: .
    dockerfile: Dockerfile
    target: dashboard_v2
  ports:
    - "4323:4323"
  restart: always
  environment:
    - PORT=4323
    - HOST=0.0.0.0
    # Firebase, Calendar, Email, AI, MXRoute env vars...
```

## Health Check

```bash
curl http://localhost:4323/
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 4323
lsof -i :4323

# Kill the process
kill -9 <PID>
```

### Environment Variables Not Loading

Ensure all required env vars are set in `.env` or passed to Docker. The build args must match the runtime env vars.

### Convex Connection Issues

Verify `CONVEX_SELF_HOSTED_URL` and `VITE_CONVEX_URL` are correctly set and the Convex deployment is accessible.
