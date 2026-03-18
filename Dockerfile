FROM node:22-alpine AS base
WORKDIR /app

FROM base AS test
COPY package.json ./
COPY src ./src
COPY tests ./tests
RUN node --test

FROM base AS runtime
ENV NODE_ENV=production
COPY package.json ./
COPY src ./src
COPY README.md ./
COPY .env.example ./
RUN mkdir -p /app/storage-data
EXPOSE 3000
CMD ["node", "src/index.js"]
