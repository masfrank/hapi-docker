FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY cli/package.json cli/package.json
COPY shared/package.json shared/package.json
COPY hub/package.json hub/package.json
COPY web/package.json web/package.json
COPY website/package.json website/package.json
COPY docs/package.json docs/package.json
COPY cli/tsconfig.json cli/tsconfig.json
COPY shared/tsconfig.json shared/tsconfig.json
COPY hub/tsconfig.json hub/tsconfig.json
COPY web/tsconfig.json web/tsconfig.json
COPY website/tsconfig.json website/tsconfig.json
COPY web/vite.config.ts web/vite.config.ts
COPY web/postcss.config.cjs web/postcss.config.cjs
COPY web/tailwind.config.ts web/tailwind.config.ts
COPY web/index.html web/index.html

RUN bun install

COPY shared ./shared
COPY hub ./hub
COPY web ./web

RUN bun run build:web && bun run build:hub

FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    HAPI_LISTEN_HOST=0.0.0.0 \
    HAPI_LISTEN_PORT=3006 \
    HAPI_HOME=/data

RUN mkdir -p /data

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/hub/dist ./hub/dist
COPY --from=builder /app/hub/package.json ./hub/package.json
COPY --from=builder /app/web/dist ./web/dist

EXPOSE 3006

VOLUME ["/data"]

CMD ["bun", "hub/dist/index.js"]