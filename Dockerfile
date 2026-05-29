FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY tsconfig.json tsconfig.app.json vite.config.ts tailwind.config.ts postcss.config.js components.json ./
COPY public/ public/
COPY src/ src/
COPY index.html ./
RUN npm run build

# --- Runtime stage ---
FROM nginx:1.27-alpine AS runtime

# Copy built assets from builder
COPY --from=builder /app/dist/ /usr/share/nginx/html/

# Nginx config for SPA routing
RUN echo 'server { \
    listen 8080; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://backend:8000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/ || exit 1

EXPOSE 8080
