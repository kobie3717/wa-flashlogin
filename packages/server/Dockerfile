# Multi-stage build for wa-flashlogin-server
FROM node:20-alpine AS builder

WORKDIR /build

# Copy package files and source
COPY package.json ./
COPY src/ ./src/

# Create standalone tsconfig.json for Docker build
RUN cat > tsconfig.json << 'TSCONFIG'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
TSCONFIG

# Install dependencies and build
RUN npm install --production=false && \
    npm run build

# Runtime stage
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built files and production dependencies
COPY --from=builder /build/package.json ./
COPY --from=builder /build/dist ./dist

# Install production dependencies + express (peer dep needed for entrypoint)
RUN npm install --production && \
    npm install express && \
    npm cache clean --force

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3060}/health || exit 1

EXPOSE 3060

ENTRYPOINT ["docker-entrypoint.sh"]
