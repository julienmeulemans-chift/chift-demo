# Chift Demo App

A locally-run React SPA that simulates a generic SaaS platform ("AcmeCorp" by default) for demoing [Chift](https://chift.eu) financial integration flows to end-users.

## Overview

The app provides a realistic SaaS shell — top navbar, sidebar navigation (with a mobile off-canvas drawer), fake logged-in user, configurable platform name — with an **Integrations** page whose content changes based on the selected demo mode. A dropdown on the Integrations page lets you switch between modes live. Each mode also shows a collapsible "technical flow" panel with a live, expandable log of every Chift API call it makes (method, endpoint, request/response bodies, doc link). All configuration (API credentials, demo mode, consumer ID, etc.) is stored in `localStorage`; the per-mode API call log is stored in `sessionStorage` so it survives OAuth2/Chift redirects.

## Demo Modes

| Mode | Effort | Description |
|------|--------|-------------|
| **Unified API — Generic** | Minimal | Single "Connect" button. Calls `POST` (or `PATCH` if a connection already exists) on `/consumers/{id}/connections` with `apis: ["Accounting"]`. User picks their accounting software on the Chift-hosted flow. |
| **Unified API — Connector Picker** | Low | Fetches active Accounting connectors via `GET /integrations?status=active` and displays them as cards. User picks a specific connector; calls `POST`/`PATCH /consumers/{id}/connections` with `integrationid`. |
| **Marketplace — Generic** | Minimal | Redirects the user to the Chift-hosted Marketplace (`marketplaces.chift.app/en/{slug}`). User must create a Chift account. |
| **Marketplace — Connector Picker** | Low | Fetches active Accounting connectors and deep-links straight to that connector's Marketplace app page (`.../apps/{integration_id}`). |
| **Sync — API-driven** | Low | Creates a sync instance via `POST /consumers/{id}/syncs` (with `syncid`) and redirects the user to a Chift-hosted sync page. |
| **Sync — API-driven + Connector Picker** | Medium | Same as above, plus a connector picker; passes `integrationids: [selectedId]` when requesting the sync URL. |
| **Sync — Fully Embedded** | Highest | Renders the entire sync activation flow as an `<iframe>` directly in your app — no Chift branding visible to the end-user. Requires OpenID Connect on your OAuth2. |

Every mode:
- Auto-creates a consumer (`POST /consumers`, skipped once a Consumer ID is saved).
- Detects the return from a Chift redirect (`?chift_return=1&consumer_id=...`) and reloads connection state.
- Reuses an existing connection with `PATCH` instead of creating a new one with `POST` where applicable.
- Fetches `GET /consumers/{id}/accounting/clients` to show a live client count once connected.
- Lets you **Disconnect**, which deletes the connection (`DELETE /consumers/{id}/connections/{connectionId}`) and logs the outcome to the API call log and the browser console.

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

- **Platform name** — displayed in the navbar and page title (default: `AcmeCorp`)
- **Chift API Credentials** — Account ID, Client ID, Client Secret, and Base URL
- **Consumer** — Consumer Name and Consumer ID (auto-populated after first connect; clearable)
- **Sync** — Sync ID (used by the Sync — API-driven modes)
- **Marketplace** — Marketplace Slug (used by the Marketplace modes)
- **Embedded** — Environment ID (used together with Account ID + Sync ID by Sync — Fully Embedded)

The demo mode itself is switched from the dropdown on the **Integrations** page, not from Settings.

Fields save automatically on blur (a "Saved" indicator flashes next to the page title) — there's no separate save button. All values persist in `localStorage`; changing Client ID/Secret/Account ID invalidates the cached bearer token. No backend or `.env` file is needed.

## OAuth2 Redirect Flow

For the API-driven modes (Unified API and Sync — API-driven), the app:

1. Calls `POST /token` (client credentials) to get a bearer token
2. Creates a consumer via `POST /consumers` (skipped if Consumer ID is already saved)
3. Creates or updates a connection/sync via the relevant endpoint
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
│   ├── Layout.jsx           # Navbar + sidebar shell (responsive, mobile drawer)
│   └── ApiCallLog.jsx       # Collapsible, expandable log of Chift API calls
├── contexts/
│   └── ChiftConfigContext.jsx  # Global config (localStorage-backed)
├── hooks/
│   └── useApiLog.js         # Per-mode API call log state (sessionStorage-backed)
├── lib/
│   └── chiftApi.js          # Token cache, shared fetch helpers, doc URLs
└── pages/
    ├── Dashboard.jsx
    ├── Analytics.jsx
    ├── Customers.jsx
    ├── Settings.jsx
    └── integrations/
        ├── index.jsx                     # Mode router + mode switcher dropdown
        ├── UnifiedApiGenericMode.jsx
        ├── UnifiedApiPickerMode.jsx
        ├── SyncMarketplaceMode.jsx
        ├── SyncMarketplacePickerMode.jsx
        ├── SyncApiDrivenMode.jsx
        ├── SyncApiDrivenPickerMode.jsx
        └── SyncEmbeddedMode.jsx
```
