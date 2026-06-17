FROM node:20-alpine
WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package*.json turbo.json ./
COPY packages/env/package*.json ./packages/env/
COPY packages/db/package*.json ./packages/db/
COPY packages/config/package*.json ./packages/config/
COPY apps/server/package*.json ./apps/server/

# Install all workspace dependencies
RUN npm install

# Copy source files
COPY packages/ ./packages/
COPY apps/server/ ./apps/server/

# Build only the server
RUN npx turbo build --filter=server

EXPOSE 3000
CMD ["node", "apps/server/dist/index.mjs"]
