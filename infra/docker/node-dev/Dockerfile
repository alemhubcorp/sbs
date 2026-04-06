FROM node:22-bookworm

RUN apt-get update -y \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    procps \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
