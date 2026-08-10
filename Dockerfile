FROM node:22-bookworm-slim AS base

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_HOME="/opt/corepack"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates g++ make python3 \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

RUN corepack prepare pnpm@10.11.0 --activate \
  && chmod -R a+rX "${COREPACK_HOME}"

ENV COREPACK_ENABLE_NETWORK=0

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS api-build

COPY . .

RUN pnpm --filter @gym-progress-tracker/api build

FROM deps AS web-build

COPY . .

RUN pnpm --filter @gym-progress-tracker/web build

FROM deps AS migrate

COPY apps/api/db ./apps/api/db

WORKDIR /app/apps/api

CMD ["pnpm", "exec", "node-pg-migrate", "--config-file", "db/migrate.json", "up"]

FROM api-build AS api

ENV NODE_ENV=production

EXPOSE 4000

CMD ["pnpm", "--filter", "@gym-progress-tracker/api", "start"]

FROM web-build AS web

ENV NODE_ENV=production

EXPOSE 3000

CMD ["pnpm", "--filter", "@gym-progress-tracker/web", "start"]
