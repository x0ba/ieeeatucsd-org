# Use the official Bun image
FROM oven/bun:1.1 as base

# Install dependencies for Puppeteer and Chrome/Chromium (Shared requirement for website)
RUN apt-get update && \
    apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    chromium \
    gnupg \
    --no-install-recommends && \
    # Install Google Chrome stable
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Set Puppeteer executable path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /app

# Copy root workspace files
COPY package.json bun.lock ./
COPY packages ./packages
COPY apps ./apps

# Install dependencies (workspaces will be linked)
RUN bun install

# Copy environment files (Optional: Coolify might not use .env files but pass ARGs)
# We use conditional copy or just ignore failure if .env is missing?
# Actually, for Coolify, we rely on build args.
# COPY .env ./
# COPY .env ./apps/website/.env
# COPY .env ./apps/dashboard/.env

# Define Build Arguments (For Coolify/Vite)
# Firebase Client (Shared)
ARG PUBLIC_FIREBASE_WEB_API_KEY
ARG PUBLIC_FIREBASE_AUTH_DOMAIN
ARG PUBLIC_FIREBASE_PROJECT_ID
ARG PUBLIC_FIREBASE_STORAGE_BUCKET
ARG PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG PUBLIC_FIREBASE_APP_ID

# Firebase Admin (Shared)
ARG FIREBASE_PRIVATE_KEY_ID
ARG FIREBASE_PRIVATE_KEY
ARG FIREBASE_CLIENT_EMAIL
ARG FIREBASE_CLIENT_ID
ARG FIREBASE_AUTH_URL
ARG FIREBASE_TOKEN_URL
ARG FIREBASE_AUTH_CERT_URL
ARG FIREBASE_CLIENT_CERT_URL

# Dashboard Specific
ARG PUBLIC_DASHBOARD_URL

# Website Specific (API, Calendar, Email, AI)
ARG API_BASE_URL
ARG CALENDAR_API_KEY
ARG EVENT_CALENDAR_ID
ARG FROM_EMAIL
ARG REPLY_TO_EMAIL
ARG RESEND_API_KEY
ARG OPENROUTER_API_KEY
ARG MXROUTE_EMAIL_DOMAIN
ARG MXROUTE_EMAIL_OUTBOUND_LIMIT
ARG MXROUTE_EMAIL_QUOTA
ARG MXROUTE_LOGIN_KEY
ARG MXROUTE_SERVER_LOGIN
ARG MXROUTE_SERVER_URL

# Set as Environment Variables for Build Step
ENV PUBLIC_FIREBASE_WEB_API_KEY=$PUBLIC_FIREBASE_WEB_API_KEY
ENV PUBLIC_FIREBASE_AUTH_DOMAIN=$PUBLIC_FIREBASE_AUTH_DOMAIN
ENV PUBLIC_FIREBASE_PROJECT_ID=$PUBLIC_FIREBASE_PROJECT_ID
ENV PUBLIC_FIREBASE_STORAGE_BUCKET=$PUBLIC_FIREBASE_STORAGE_BUCKET
ENV PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV PUBLIC_FIREBASE_APP_ID=$PUBLIC_FIREBASE_APP_ID
ENV FIREBASE_PRIVATE_KEY_ID=$FIREBASE_PRIVATE_KEY_ID
ENV FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY
ENV FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL
ENV FIREBASE_CLIENT_ID=$FIREBASE_CLIENT_ID
ENV FIREBASE_AUTH_URL=$FIREBASE_AUTH_URL
ENV FIREBASE_TOKEN_URL=$FIREBASE_TOKEN_URL
ENV FIREBASE_AUTH_CERT_URL=$FIREBASE_AUTH_CERT_URL
ENV FIREBASE_CLIENT_CERT_URL=$FIREBASE_CLIENT_CERT_URL
ENV PUBLIC_DASHBOARD_URL=$PUBLIC_DASHBOARD_URL

# Website Env Vars
ENV API_BASE_URL=$API_BASE_URL
ENV CALENDAR_API_KEY=$CALENDAR_API_KEY
ENV EVENT_CALENDAR_ID=$EVENT_CALENDAR_ID
ENV FROM_EMAIL=$FROM_EMAIL
ENV REPLY_TO_EMAIL=$REPLY_TO_EMAIL
ENV RESEND_API_KEY=$RESEND_API_KEY
ENV OPENROUTER_API_KEY=$OPENROUTER_API_KEY
ENV MXROUTE_EMAIL_DOMAIN=$MXROUTE_EMAIL_DOMAIN
ENV MXROUTE_EMAIL_OUTBOUND_LIMIT=$MXROUTE_EMAIL_OUTBOUND_LIMIT
ENV MXROUTE_EMAIL_QUOTA=$MXROUTE_EMAIL_QUOTA
ENV MXROUTE_LOGIN_KEY=$MXROUTE_LOGIN_KEY
ENV MXROUTE_SERVER_LOGIN=$MXROUTE_SERVER_LOGIN
ENV MXROUTE_SERVER_URL=$MXROUTE_SERVER_URL

# --- Website Builder ---
FROM base as website_builder
WORKDIR /app/apps/website
RUN bun run build

# --- Dashboard Builder ---
FROM base as dashboard_builder
WORKDIR /app/apps/dashboard
RUN bun run build

# --- Website Runner ---
FROM base as website
COPY --from=website_builder /app/apps/website/dist /app/apps/website/dist
WORKDIR /app/apps/website
EXPOSE 4321
CMD ["bun", "run", "start"]

# --- Dashboard Runner ---
FROM base as dashboard
COPY --from=dashboard_builder /app/apps/dashboard/dist /app/apps/dashboard/dist
WORKDIR /app/apps/dashboard
EXPOSE 4322
CMD ["bun", "run", "start"]
