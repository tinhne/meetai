# Build from the repository root:
#   docker build -f worker/Dockerfile -t meetai-agent-worker .
FROM node:22-slim

WORKDIR /app

COPY worker/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

# Only the shared, framework-free modules the worker needs.
COPY tsconfig.json ./tsconfig.json
COPY src/db/schema.ts ./src/db/schema.ts
COPY src/config/ai.ts ./src/config/ai.ts
COPY src/server/ai/prompts.ts ./src/server/ai/prompts.ts
COPY src/modules/agents/lib ./src/modules/agents/lib
COPY src/modules/meetings/lib/stream.ts ./src/modules/meetings/lib/stream.ts
COPY worker/src ./worker/src

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
