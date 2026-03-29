# ============================================================
# DocuMind - Vite React Frontend
# Multi-stage build: Node builds, Nginx serves static files
# ============================================================

FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Build with empty API base so browser uses relative paths (routed by external nginx)
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Runtime stage - serve static files with nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# SPA fallback: all routes serve index.html, let React Router handle routing
RUN printf 'server {\n\
    listen 3001;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    location /assets/ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]
