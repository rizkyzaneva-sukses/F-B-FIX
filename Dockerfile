FROM node:22-alpine AS deps
WORKDIR /app
# Direkomendasikan Next.js untuk Alpine: sebagian binary native butuh shim glibc.
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_BACKEND_ENABLED=false
ENV NEXT_PUBLIC_BACKEND_ENABLED=$NEXT_PUBLIC_BACKEND_ENABLED
ARG NEXT_PUBLIC_TRIAL_TOOLS=true
ENV NEXT_PUBLIC_TRIAL_TOOLS=$NEXT_PUBLIC_TRIAL_TOOLS
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# psql + the migration files, so deployments that don't use docker-compose.yml (and
# therefore never run its one-shot `migrate` service) can apply migrations from this
# container's terminal: `sh db/migrate.sh`
RUN apk add --no-cache postgresql-client
COPY --from=builder --chown=node:node /app/db ./db
# Nothing in the runtime image needs root. `node` is provided by the base image.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
