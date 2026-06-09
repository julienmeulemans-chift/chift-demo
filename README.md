# Chift Demo App

A locally-run React SPA that simulates a generic SaaS platform ("AcmeCorp" by default) for demoing [Chift](https://chift.eu) financial integration flows to end-users.

## Overview

The app provides a realistic SaaS shell — sidebar navigation, fake logged-in user, configurable platform name — with an **Integrations** page whose content changes based on the selected demo mode. All configuration (API credentials, demo mode, consumer ID, etc.) is stored in `localStorage`.

## Demo Modes

| Mode | Description |
|------|-------------|
| **Unified API — Generic** | Single "Connect" button. Calls `POST /connections` with `apis: ["Accounting"]`. User picks their accounting software on the Chift-hosted flow. |
| **Unified API — Connector Picker** | Fetches active Accounting connectors via `GET /integrations?status=active` and displays them as cards. User picks a specific connector; calls `POST /connections` with `integrationid`. |
| **Sync — Option 1: Marketplace** | Redirects the user to the Chift-hosted Marketplace. User must create a Chift account. |
| **Sync — Option 2: Marketplace + OAuth2** | Same Marketplace but user authenticates via your OAuth2 — no Chift account needed. |
| **Sync — Option 3: API-driven** | Creates a sync instance via `POST /consumers/{id}/syncs` and redirects the user to a Chift-hosted sync page. |
| **Sync — Option 4: Fully Embedded** | Renders the entire sync flow as an iframe directly in your app. |

## Prerequisites

- Node.js 18+
- npm 9+
- A [Chift](https://chift.eu) account with an API key (Account ID, Client ID, Client Secret)

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app runs at `http://localhost:5173`.

## Configuration

Open **Settings** in the sidebar and fill in:

- **Platform name** — displayed in the navbar (default: `AcmeCorp`)
- **Demo mode** — selects which integration flow to show on the Integrations page
- **Chift API Credentials** — Account ID, Client ID, Client Secret, and Base URL
- Mode-specific fields (Consumer Name, Consumer ID, Sync ID, Marketplace Slug, etc.)

All values persist in `localStorage` — no backend or `.env` file needed.

## OAuth2 Redirect Flow

For API-driven modes (Unified API and Sync API-driven), the app:

1. Calls `POST /token` (client credentials) to get a bearer token
2. Creates a consumer via `POST /consumers` (skipped if Consumer ID is already saved)
3. Creates a connection/sync via the relevant endpoint
4. Redirects the user to the Chift-hosted authorization page
5. Detects the return via `?chift_return=1&consumer_id=...` in the URL
6. Fetches `GET /consumers/{id}/connections` (connection name + logo) and `GET /consumers/{id}/accounting/clients` (client count)

## Tech Stack

- [React 18](https://react.dev) + [Vite 5](https://vitejs.dev)
- [React Router v6](https://reactrouter.com)
- [Bootstrap 5](https://getbootstrap.com) + [Bootstrap Icons](https://icons.getbootstrap.com) (CDN)
- [Chift Unified API](https://docs.chift.eu)

## Project Structure

```
src/
├── components/
│   └── Layout.jsx          # Navbar + sidebar shell
├── contexts/
│   └── ChiftConfigContext.jsx  # Global config (localStorage-backed)
├── lib/
│   └── chiftApi.js         # Token cache, shared fetch helpers
└── pages/
    ├── Dashboard.jsx
    ├── Analytics.jsx
    ├── Customers.jsx
    ├── Settings.jsx
    └── integrations/
        ├── index.jsx                  # Mode router
        ├── UnifiedApiGenericMode.jsx
        ├── UnifiedApiPickerMode.jsx
        ├── SyncMarketplaceMode.jsx
        ├── SyncApiDrivenMode.jsx
        └── SyncEmbeddedMode.jsx
```
