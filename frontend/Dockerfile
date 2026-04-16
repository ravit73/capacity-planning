# syntax=docker/dockerfile:1

# ── Stage 1: build the React app ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json postcss.config.js tailwind.config.js ./
COPY src/ ./src/

# VITE_API_BASE is not needed — nginx proxies /api at runtime
RUN npm run build

# ── Stage 2: serve with nginx ────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Install envsubst (part of gettext) for runtime env injection
RUN apk add --no-cache gettext

# Copy build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx template (uses ${BACKEND_URL})
COPY nginx.conf /etc/nginx/templates/default.conf.template

# entrypoint: substitute env vars then start nginx
CMD ["/bin/sh", "-c", "envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

EXPOSE 80
