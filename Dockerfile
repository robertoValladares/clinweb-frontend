# syntax=docker/dockerfile:1

# ── Build ───────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Vite incrusta las VITE_* en el bundle JS en tiempo de build: todo lo que
# pase por aquí queda público en el navegador. Nunca service_role ni secretos.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_DASH_PASSWORD=""

RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY" \
  || (echo "ERROR: faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY" && exit 1)

RUN VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
    VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
    VITE_DASH_PASSWORD="$VITE_DASH_PASSWORD" \
    npm run build

# ── Runtime: Nginx sin root (escucha en 8080) ───────────────────
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
