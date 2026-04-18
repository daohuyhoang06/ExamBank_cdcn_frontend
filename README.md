# Exambank Frontend Workspace

This repository contains the frontend application under `exambank-frontend/`.

## Quick Start

1. Install Node.js 20+.
2. Open terminal at `exambank-frontend/`.
3. Install dependencies:

```bash
npm install
```

4. Create local env file (if not created yet):

```bash
copy .env.example .env
```

5. Start dev server:

```bash
npm run dev
```

Default UI URL: `http://localhost:5173`

## Environment Variables

- `VITE_API_BASE_URL` default: `/`
- `VITE_API_PROXY_TARGET` default: `http://localhost:8080`

Use `.env` only for local values. Do not commit `.env`.

## Build

```bash
npm run build
```

## Notes

- Root-level local probe files are ignored by git (`login.json`, `report.json`, `review.json`, `tmp-upload.txt`).
- Main application source is inside `exambank-frontend/src`.
"# ExamBank_cdcn_frontend" 
