import { useState } from 'react';
import { useChiftConfig } from '../contexts/ChiftConfigContext.jsx';
import { invalidateToken } from '../lib/chiftApi.js';


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

  const isApiMode       = form.demoMode === 'unified-api-generic' || form.demoMode === 'unified-api-picker';
  const isSyncApi       = form.demoMode === 'sync-api';
  const isSyncApiPicker = form.demoMode === 'sync-api-picker';
  const isMarketplace   = form.demoMode === 'sync-marketplace' || form.demoMode === 'sync-marketplace-picker';
  const isEmbedded      = form.demoMode === 'sync-embedded';

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
              <Field label="Sync ID" hint="UUID of the sync — used as syncid in POST /consumers/{id}/syncs.">
                <input
                  type="text"
                  className="form-control font-monospace"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={form.syncId}
                  onChange={(e) => set('syncId', e.target.value)}
                />
              </Field>
              <Field
                label={<>Integration IDs <span className="text-muted fw-normal">(optional)</span></>}
                hint="Comma-separated integration IDs to highlight a specific connector for the user."
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

        {/* ── Sync API-driven + Connector Picker ─────────── */}
        {isSyncApiPicker && (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h6 className="mb-0 fw-semibold">API-driven Sync + Connector Picker Settings</h6>
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
              <Field label="Sync ID" hint="UUID of the sync — used as syncid in POST /consumers/{id}/syncs.">
                <input
                  type="text"
                  className="form-control font-monospace"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={form.syncId}
                  onChange={(e) => set('syncId', e.target.value)}
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
