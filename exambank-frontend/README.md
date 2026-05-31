# Exambank Frontend App

Frontend stack: React + TypeScript + Vite.

## Requirements

- Node.js 20+
- npm 10+

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Create env file from template:

```bash
copy .env.example .env
```

3. Start dev server:

```bash
npm run dev
```

The app is available at `http://localhost:5173`.

## Available Scripts

- `npm run dev`: start development server
- `npm run build`: type-check and build production bundle
- `npm run preview`: preview production build
- `npm run lint`: run eslint

## Environment

The app reads `VITE_*` values from `.env`.

Default values in `.env.example`:

- `VITE_API_BASE_URL=/`
- `VITE_API_PROXY_TARGET=http://localhost:8080`
- `VITE_STORAGE_PUBLIC_ENDPOINT=http://localhost:8080`
- `VITE_MINIO_PUBLIC_ENDPOINT=http://localhost:9000`

When backend runs with MinIO in Docker:

- API: `http://localhost:8080`
- MinIO S3 endpoint: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

Do not commit `.env`.
