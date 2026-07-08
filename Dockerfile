FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
ENV PORT=3000
CMD ["node", "--max_old_space_size=512", "server.mjs"]
