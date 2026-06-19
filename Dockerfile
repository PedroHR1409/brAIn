FROM node:20-alpine
WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package*.json turbo.json ./
COPY packages/env/package*.json ./packages/env/
COPY packages/db/package*.json ./packages/db/
COPY packages/config/package*.json ./packages/config/
COPY apps/server/package*.json ./apps/server/

# Install all workspace dependencies (tsx is a regular dep, so it's included)
RUN npm install

# Copy source files
COPY packages/ ./packages/
COPY apps/server/ ./apps/server/

EXPOSE 3000
# Run TypeScript directly via tsx (no build step needed)
CMD ["node_modules/.bin/tsx", "apps/server/src/index.ts"]
