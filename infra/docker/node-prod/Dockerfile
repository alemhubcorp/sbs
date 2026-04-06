FROM node:22-bookworm

RUN apt-get update -y \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY tsconfig.base.json ./

RUN npm ci
RUN npm run prisma:generate
