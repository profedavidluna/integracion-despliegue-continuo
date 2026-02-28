# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar solo los archivos de dependencias primero (cache eficiente)
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

# ── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Crear usuario no-root por seguridad
RUN addgroup -S coindash && adduser -S coindash -G coindash

WORKDIR /app

# Copiar dependencias desde el stage builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar código fuente
COPY src/ ./src/
COPY package.json ./

# Usar usuario no-root
USER coindash

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/app.js"]
