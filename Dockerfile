# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:24-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:24-alpine AS build

WORKDIR /app

# Re-declare ARG so this stage can inherit it from `docker build --build-arg`.
# Promote to ENV so that Node.js reads it via process.env.ADMIN_PASSWORD when
# nuxt.config.ts is evaluated during `nuxt build`.
ARG ADMIN_PASSWORD=admin
ENV ADMIN_PASSWORD=${ADMIN_PASSWORD}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ─── Stage 3: Production image ────────────────────────────────────────────────
FROM node:24-alpine AS production

WORKDIR /app

# Run as non-root user
RUN addgroup -S nstquiz && adduser -S nstquiz -G nstquiz

COPY --from=build --chown=nstquiz:nstquiz /app/.output ./.output

USER nstquiz

# Re-declare so the same --build-arg also sets the runtime default.
# Can still be overridden at container start with: docker run -e ADMIN_PASSWORD=...
# WARNING: build-arg values are visible in `docker history`. For production,
# prefer injecting via -e at runtime or a Kubernetes secret.
ARG ADMIN_PASSWORD=admin
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV ADMIN_PASSWORD=${ADMIN_PASSWORD}

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", ".output/server/index.mjs"]
