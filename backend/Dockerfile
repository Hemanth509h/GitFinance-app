FROM node:20.19-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20.19-alpine

WORKDIR /app

ENV NODE_ENV=production
# Render injects PORT; default matches Render's Docker default.
ENV PORT=10000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 10000

CMD ["node", "dist/server.js"]
