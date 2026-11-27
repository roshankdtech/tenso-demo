# Demo image: builds the app with the mock API on, then serves it with the demo server.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
# The mock API is on for this demo build (the real backend is not connected yet).
ENV VITE_MOCK_API=true
RUN npm run build

EXPOSE 8080
CMD ["npx", "tsx", "server/demo.ts"]
