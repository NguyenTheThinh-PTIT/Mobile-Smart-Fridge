FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache dumb-init

FROM base AS deps

COPY package*.json ./
RUN npm ci

FROM base AS runtime

COPY . .
COPY --from=deps /app/node_modules ./node_modules

ENV NODE_ENV=development

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8081/status', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

ENTRYPOINT ["dumb-init", "--"]

CMD ["npm", "start"]
