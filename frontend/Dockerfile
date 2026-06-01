FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
# npm install (not ci): the lockfile pins platform-specific native binaries
# (vite/rolldown), so a Windows-generated lock fails `npm ci` on linux.
RUN npm install
COPY . .
RUN npm run build

# Unprivileged nginx: runs as non-root (uid 101) and listens on 8080.
FROM nginxinc/nginx-unprivileged:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
