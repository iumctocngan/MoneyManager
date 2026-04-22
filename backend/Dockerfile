# ---- Stage 1: Build dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files and install production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Stage 2: Production image ----
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 appuser

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY src/ ./src/
COPY package.json ./

# Own files by non-root user
RUN chown -R appuser:nodejs /app
USER appuser

# Railway injects PORT automatically; default 4000 for local
ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/server.js"]
