FROM node:22-bookworm-slim

# Bump this to rebuild with a current yt-dlp. An old yt-dlp cannot solve
# YouTube's current signature challenge and fails with "Sign in to confirm
# you're not a bot" — which reads exactly like an IP block but is not one.
ARG YTDLP_VERSION=2026.8.19

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    ffmpeg \
    fontconfig \
    fonts-liberation \
    python3 \
    python3-pip \
  && mkdir -p /usr/share/fonts/truetype/clipmuse \
  && curl -fsSL -o /usr/share/fonts/truetype/clipmuse/Anton-Regular.ttf \
    "https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf" \
  && fc-cache -f \
  && pip3 install --break-system-packages --no-cache-dir "yt-dlp==${YTDLP_VERSION}" \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY lib ./lib
COPY worker ./worker
# The same Anton the laptop uses, so captions render identically on both.
COPY assets ./assets
COPY scripts ./scripts

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

CMD ["npx", "tsx", "worker/src/server.ts"]
