# Open-Code by OWI

An AI-driven code editor and execution environment powered by the G-Coder engine.

## Architecture

- **Frontend**: React 19 + Vite + Tailwind CSS v4
- **Backend**: Express.js server (`server.ts`) that serves both the API and the Vite dev server in middleware mode
- **Package manager**: npm

## Running the app

```
npm run dev
```

The server starts on port 5000 (required for Replit's webview).

## Key files

- `server.ts` — Express server; routes `/api/*` to `src/api.ts`, serves Vite in dev mode
- `src/api.ts` — API routes: Stripe donations, GitHub OAuth, GitHub publish
- `src/App.tsx` — Main React application
- `vite.config.ts` — Vite config (host/allowedHosts set for Replit proxy compatibility)

## Environment variables

See `.env.example` for required secrets:

- `STRIPE_SECRET_KEY` — Stripe secret key for donation sessions
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key (frontend)
- `GITHUB_CLIENT_ID` — GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` — GitHub OAuth app client secret

Add these via the Replit Secrets panel (padlock icon).

## Notes

- `vercel.json` is retained for reference but is not used by the Replit server
- The server reads `PORT` env var with a fallback of 5000
