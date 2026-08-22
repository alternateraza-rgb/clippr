FROM node:22-bookworm-slim

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
  && pip3 install --break-system-packages --no-cache-dir yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY lib ./lib
COPY worker ./worker

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

CMD ["npx", "tsx", "worker/src/server.ts"]
