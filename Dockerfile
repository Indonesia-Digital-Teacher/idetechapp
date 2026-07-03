FROM oven/bun:1.3.13 AS dependencies

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.13 AS production-dependencies

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM dependencies AS build

COPY index.html postcss.config.js tailwind.config.ts tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src

RUN bun run build

FROM oven/bun:1.3.13 AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=2016 \
    DATABASE_URL=mysql://idetech:idetech_secret@mariadb:3306/idetech

COPY --from=production-dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --chown=bun:bun package.json bun.lock ./
COPY --chown=bun:bun drizzle.config.ts ./
COPY --chown=bun:bun src/server ./src/server

USER bun

EXPOSE 2016

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["bun", "-e", "const r = await fetch('http://127.0.0.1:2016/api/health'); if (!r.ok) process.exit(1)"]

CMD ["bun", "run", "start"]
