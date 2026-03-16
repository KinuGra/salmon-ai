FROM node:20-bookworm-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ .
EXPOSE 3000
CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]
