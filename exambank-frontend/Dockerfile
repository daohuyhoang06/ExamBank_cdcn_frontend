FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:8080
ARG VITE_STORAGE_PUBLIC_ENDPOINT=http://localhost:8080
ARG VITE_MINIO_PUBLIC_ENDPOINT=http://localhost:9000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_STORAGE_PUBLIC_ENDPOINT=${VITE_STORAGE_PUBLIC_ENDPOINT}
ENV VITE_MINIO_PUBLIC_ENDPOINT=${VITE_MINIO_PUBLIC_ENDPOINT}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 5173
CMD ["sh", "-c", "serve -s dist -l ${PORT:-5173}"]
