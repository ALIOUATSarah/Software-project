# Parksmart

A campus parking demo built with Next.js.

## Requirements

- Node.js 20.9.0 or newer (Node.js 24 LTS is recommended).
- pnpm 12.3.4. The exact version is pinned in `package.json` and is selected by Corepack.

## Environment variables

No environment variables are required for local development.

## Run locally

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Clone the latest source

The latest Notifications and Reset Demo fix is on `v0/notifications-reset-dialog`:

```bash
git clone --branch v0/notifications-reset-dialog https://github.com/ALIOUATSarah/parksmart.git
cd parksmart
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```
