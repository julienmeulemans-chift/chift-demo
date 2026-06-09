import { useState } from 'react';
import { useChiftConfig } from '../contexts/ChiftConfigContext.jsx';
import { invalidateToken } from '../lib/chiftApi.js';

const DEMO_MODES = [
  {
    value: 'unified-api-generic',
    label: 'Unified API — Generic',
    badge: 'Method 1a',
    description: 'Single "Connect" button — user picks their accounting software on the Chift-hosted flow. Uses apis: ["Accounting"].',
  },
  {
    value: 'unified-api-picker',
    label: 'Unified API — Connector Picker',
    badge: 'Method 1b',
    description: 'Shows one card per active Accounting connector (GET /integrations). User clicks a specific one; uses integrationid in the connection.',
  },
  {
    value: 'sync-marketplace',
    label: 'Sync — Option 1: Marketplace',
    badge: '⭐ Minimal effort',
    description: 'Redirect to a Chift-hosted Marketplace. User must create a Chift account.',
  },
  {
    value: 'sync-marketplace-oauth2',
    label: 'Sync — Option 2: Marketplace + OAuth2',
    badge: '⭐⭐ Low effort',
    description: 'Same Marketplace but user authenticates via your OAuth2 — no Chift account needed.',
  },
  {
    value: 'sync-api',
    label: 'Sync — Option 3: API-driven',
    badge: '⭐⭐⭐ Medium effort',
    description: 'Creates a sync instance via API and redirects the user to a Chift-hosted sync page.',
  },
  {
    value: 'sync-embedded',
    label: 'Sync — Option 4: Fully Embedded',
    badge: '⭐⭐⭐⭐ High effort',
    description: 'Entire sync flow embedded in your app via iframe. No Chift UI visible.',
  },
];

function Field({ label, hint, children }) {
  return (
    <div className="mb-3">
      <label className="form-label fw-medium mb-1">{label}</label>
      {children}
      {hint && <div className="form-text">{hint}</div>}
    </div>
  );
}

export default function Settings() {
  const { config, setConfig } = useChiftConfig();
  const [form, setForm] = useState({ ...config });
  const [saved, setSaved] = useState(false);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = (e) => {
    e.preventDefault();
    // If credentials changed, drop cached token so next call re-authenticates
    if (
      form.clientId     !== config.clientId ||
      form.clientSecret !== config.clientSecret ||
      form.accountId    !== config.accountId
    ) {
      invalidateToken();
    }
    setConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const resetConsumer = () => {
    const updated = { ...form, consumerId: '' };
    setForm(updated);
    setConfig(updated);
  };

  const isApiMode     = form.demoMode === 'unified-api-generic' || form.demoMode === 'unified-api-picker';
  const isSyncApi     = form.demoMode === 'sync-api';
  const isMarketplace = form.demoMode === 'sync-marketplace' || form.demoMode === 'sync-marketplace-oauth2';
  const isEmbedded    = form.demoMode === 'sync-embedded';

  return (
    <div style={{ maxWidth: 680 }}>
      <h4 className="fw-semibold mb-1">Settings</h4>
      <p className="text-muted mb-4">Configure the Chift demo mode and credentials. All values are stored in your browser.</p>

      <form onSubmit={handleSave}>
        {/* ── General ────────────────────────────────────── */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-bottom py-3 px-4">
            <h6 className="mb-0 fw-semibold">General</h6>
          </div>
          <div className="card-body px-4 pt-3 pb-1">
            <Field label="Platform name" hint="Displayed in the navbar and page title.">
              <input
                type="text"
                className="form-control"
                placeholder="AcmeCorp"
                value={form.appName ?? ''}
                onChange={(e) => set('appName', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* ── Demo Mode ──────────────────────────────────── */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-bottom py-3 px-4">
            <h6 className="mb-0 fw-semibold">Demo Mode</h6>
          </div>
          <div className="card-body px-4 pt-3 pb-2">
            {DEMO_MODES.map((mode) => {
              const active = form.demoMode === mode.value;
              return (
                <div
                  key={mode.value}
                  className={`d-flex align-items-start gap-3 p-3 rounded mb-2 ${
                    active ? 'bg-primary bg-opacity-10 border border-primary' : 'bg-light border border-transparent'
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => set('demoMode', mode.value)}
                >
                  <input
                    type="radio"
                    className="form-check-input mt-1 flex-shrink-0"
                    checked={active}
                    onChange={() => set('demoMode', mode.value)}
                  />
                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="fw-medium">{mode.label}</span>
                      <span className="badge bg-secondary bg-opacity-10 text-secondary fw-normal" style={{ fontSize: 11 }}>
                        {mode.badge}
                      </span>
                    </div>
                    <div className="text-muted small mt-1">{mode.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Chift API Credentials (all modes) ─────────── */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-bottom py-3 px-4">
            <h6 className="mb-0 fw-semibold">Chift API Credentials</h6>
          </div>
          <div className="card-body px-4 pt-3 pb-1">
            <Field label="Account ID">
              <input
                type="text"
                className="form-control font-monospace"
                placeholder="Your Chift account ID"
                value={form.accountId}
                onChange={(e) => set('accountId', e.target.value)}
              />
            </Field>
            <Field label="Client ID">
              <input
                type="text"
                className="form-control font-monospace"
                placeholder="Your Chift client ID"
                value={form.clientId}
                onChange={(e) => set('clientId', e.target.value)}
              />
            </Field>
            <Field
              label="Client Secret"
              hint={<>Used to call <code>POST /token</code> (client_credentials). The token is cached in memory and refreshed automatically.</>}
            >
              <input
                type="password"
                className="form-control font-monospace"
                placeholder="Your Chift client secret"
                value={form.clientSecret}
                onChange={(e) => set('clientSecret', e.target.value)}
              />
            </Field>
            <Field label="API Base URL">
              <input
                type="url"
                className="form-control"
                value={form.baseUrl}
                onChange={(e) => set('baseUrl', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* ── Unified API ────────────────────────────────── */}
        {isApiMode && (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h6 className="mb-0 fw-semibold">Unified API — Connection Settings</h6>
            </div>
            <div className="card-body px-4 pt-3 pb-1">
              <Field label="Consumer Name">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Demo Consumer"
                  value={form.consumerName}
                  onChange={(e) => set('consumerName', e.target.value)}
                />
              </Field>
              <Field
                label={<>Consumer ID <span className="text-muted fw-normal">(auto-populated after first connect)</span></>}
                hint="Leave empty to auto-create. If set, skips consumer creation and reuses this consumer."
              >
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="Will be filled automatically"
                    value={form.consumerId}
                    onChange={(e) => set('consumerId', e.target.value)}
                  />
                  {form.consumerId && (
                    <button type="button" className="btn btn-outline-secondary" onClick={resetConsumer}>
                      Clear
                    </button>
                  )}
                </div>
              </Field>
            </div>
          </div>
        )}

        {/* ── Sync Marketplace ───────────────────────────── */}
        {isMarketplace && (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h6 className="mb-0 fw-semibold">Marketplace Settings</h6>
            </div>
            <div className="card-body px-4 pt-3 pb-1">
              <Field
                label="Marketplace Slug"
                hint={<>Your slug from <code>{'https://marketplaces.chift.app/en/{slug}'}</code></>}
              >
                <input
                  type="text"
                  className="form-control"
                  placeholder="your-marketplace-slug"
                  value={form.marketplaceSlug}
                  onChange={(e) => set('marketplaceSlug', e.target.value)}
                />
              </Field>
              <Field
                label={<>Integration ID <span className="text-muted fw-normal">(optional)</span></>}
                hint="If set, opens a direct link to this specific connector. Leave empty to show the full marketplace."
              >
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 1007 — leave empty for full marketplace"
                  value={form.syncIntegrationId}
                  onChange={(e) => set('syncIntegrationId', e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── Sync API-driven ────────────────────────────── */}
        {isSyncApi && (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h6 className="mb-0 fw-semibold">API-driven Sync Settings</h6>
            </div>
            <div className="card-body px-4 pt-3 pb-1">
              <Field label="Consumer Name">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Demo Consumer"
                  value={form.consumerName}
                  onChange={(e) => set('consumerName', e.target.value)}
                />
              </Field>
              <Field label="Sync ID" hint="UUID of the sync to instantiate.">
                <input
                  type="text"
                  className="form-control font-monospace"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={form.syncId}
                  onChange={(e) => set('syncId', e.target.value)}
                />
              </Field>
              <Field
                label="Integration IDs"
                hint="Comma-separated integration IDs to pre-select for the user."
              >
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 1007, 2001"
                  value={form.integrationIds}
                  onChange={(e) => set('integrationIds', e.target.value)}
                />
              </Field>
              <Field
                label={<>Consumer ID <span className="text-muted fw-normal">(auto-populated)</span></>}
                hint="Leave empty to auto-create on first connect."
              >
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="Will be filled automatically"
                    value={form.consumerId}
                    onChange={(e) => set('consumerId', e.target.value)}
                  />
                  {form.consumerId && (
                    <button type="button" className="btn btn-outline-secondary" onClick={resetConsumer}>
                      Clear
                    </button>
                  )}
                </div>
              </Field>
            </div>
          </div>
        )}

        {/* ── Sync Embedded ──────────────────────────────── */}
        {isEmbedded && (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h6 className="mb-0 fw-semibold">Fully Embedded Settings</h6>
            </div>
            <div className="card-body px-4 pt-3 pb-1">
              <Field label="Sync ID">
                <input
                  type="text"
                  className="form-control font-monospace"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={form.syncId}
                  onChange={(e) => set('syncId', e.target.value)}
                />
              </Field>
              <Field label="Environment ID">
                <input
                  type="text"
                  className="form-control font-monospace"
                  placeholder="Chift environment ID"
                  value={form.envId}
                  onChange={(e) => set('envId', e.target.value)}
                />
              </Field>
              <div className="alert alert-light border small py-2">
                <i className="bi bi-info-circle me-1" />
                Account ID is taken from the Chift API Credentials section above.
              </div>
            </div>
          </div>
        )}

        {/* ── Save ───────────────────────────────────────── */}
        <button type="submit" className={`btn ${saved ? 'btn-success' : 'btn-primary'}`}>
          {saved ? <><i className="bi bi-check-lg me-1" />Saved!</> : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
