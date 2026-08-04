import { useState, useEffect, useRef } from 'react';
import { useChiftConfig } from '../contexts/ChiftConfigContext.jsx';
import { getToken, buildHeaders, invalidateToken } from '../lib/chiftApi.js';


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

  const saveField = (key, value) => {
    const updated = { ...form, [key]: value };
    setForm(updated);
    if (['clientId', 'clientSecret', 'accountId'].includes(key) && value !== config[key]) {
      invalidateToken();
    }
    setConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetConsumer = () => {
    const updated = { ...form, consumerId: '' };
    setForm(updated);
    setConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── Sync list (GET /syncs) ────────────────────────────────────────
  const [syncs,       setSyncs]       = useState([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError,   setSyncError]   = useState(null);
  const syncLoadingRef                = useRef(false);

  const hasCreds = !!(form.clientId && form.clientSecret && form.accountId);

  const loadSyncs = async () => {
    if (syncLoadingRef.current || !hasCreds) return;
    syncLoadingRef.current = true;
    setSyncLoading(true);
    setSyncError(null);
    try {
      const token = await getToken(form);
      const res   = await fetch(`${form.baseUrl}/syncs`, {
        headers: buildHeaders(token, form.accountId),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSyncs(Array.isArray(data) ? data : []);
    } catch (err) {
      setSyncError(err.message);
      setSyncs([]);
    } finally {
      setSyncLoading(false);
      syncLoadingRef.current = false;
    }
  };

  // Load syncs when credentials are present / change
  useEffect(() => {
    if (hasCreds) loadSyncs();
    else setSyncs([]);
  }, [config.clientId, config.clientSecret, config.accountId, config.baseUrl]); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-1">
        <h4 className="fw-semibold mb-0">Settings</h4>
        {saved && (
          <span className="text-success small fw-medium">
            <i className="bi bi-check-lg me-1" />Saved
          </span>
        )}
      </div>
      <p className="text-muted mb-4">Configure the Chift demo mode and credentials. All values are stored in your browser.</p>

      <div className="row g-4 mb-4">

        {/* ── General ──────────────────────────────────── */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
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
                  onBlur={(e) => saveField('appName', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Chift API Credentials ────────────────────── */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
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
                  onBlur={(e) => saveField('accountId', e.target.value)}
                />
              </Field>
              <Field label="Client ID">
                <input
                  type="text"
                  className="form-control font-monospace"
                  placeholder="Your Chift client ID"
                  value={form.clientId}
                  onChange={(e) => set('clientId', e.target.value)}
                  onBlur={(e) => saveField('clientId', e.target.value)}
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
                  onBlur={(e) => saveField('clientSecret', e.target.value)}
                />
              </Field>
              <Field label="API Base URL">
                <input
                  type="url"
                  className="form-control"
                  value={form.baseUrl}
                  onChange={(e) => set('baseUrl', e.target.value)}
                  onBlur={(e) => saveField('baseUrl', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Consumer ─────────────────────────────────── */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h6 className="mb-0 fw-semibold">Consumer</h6>
            </div>
            <div className="card-body px-4 pt-3 pb-1">
              <Field label="Consumer Name" hint="Used as the display name when creating a new consumer.">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Demo Consumer"
                  value={form.consumerName}
                  onChange={(e) => set('consumerName', e.target.value)}
                  onBlur={(e) => saveField('consumerName', e.target.value)}
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
                    onBlur={(e) => saveField('consumerId', e.target.value)}
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
        </div>

        {/* ── Sync ─────────────────────────────────────── */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h6 className="mb-0 fw-semibold">Sync</h6>
            </div>
            <div className="card-body px-4 pt-3 pb-1">
              <Field
                label="Sync"
                hint={
                  !hasCreds
                    ? 'Fill in the Chift API credentials to load the available syncs.'
                    : syncError
                      ? <span className="text-danger">Could not load syncs: {syncError}</span>
                      : <>Used as <code>syncid</code> in <code>POST /consumers/{'{id}'}/syncs</code>.</>
                }
              >
                <div className="input-group">
                  <select
                    className="form-select"
                    value={form.syncId}
                    disabled={!hasCreds || syncLoading}
                    onChange={(e) => saveField('syncId', e.target.value)}
                  >
                    <option value="">
                      {syncLoading
                        ? 'Loading syncs…'
                        : !hasCreds
                          ? 'Credentials required'
                          : syncs.length === 0
                            ? 'No syncs found'
                            : 'Select a sync…'}
                    </option>
                    {syncs.map((s) => (
                      <option key={s.syncid} value={s.syncid}>{s.name}</option>
                    ))}
                    {/* Keep a previously saved sync selectable even if not in the list */}
                    {form.syncId && !syncs.some((s) => s.syncid === form.syncId) && (
                      <option value={form.syncId}>{form.syncId} (saved)</option>
                    )}
                  </select>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={loadSyncs}
                    disabled={!hasCreds || syncLoading}
                    title="Reload syncs"
                  >
                    <i className="bi bi-arrow-clockwise" />
                  </button>
                </div>
                {form.syncId && (
                  <div className="form-text font-monospace" style={{ fontSize: 11 }}>{form.syncId}</div>
                )}
              </Field>
            </div>
          </div>
        </div>

        {/* ── Marketplace ──────────────────────────────── */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h6 className="mb-0 fw-semibold">Marketplace</h6>
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
                  onBlur={(e) => saveField('marketplaceSlug', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Embedded ─────────────────────────────────── */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h6 className="mb-0 fw-semibold">Embedded</h6>
            </div>
            <div className="card-body px-4 pt-3 pb-1">
              <Field label="Environment ID">
                <input
                  type="text"
                  className="form-control font-monospace"
                  placeholder="Chift environment ID"
                  value={form.envId}
                  onChange={(e) => set('envId', e.target.value)}
                  onBlur={(e) => saveField('envId', e.target.value)}
                />
              </Field>
              <div className="alert alert-light border small py-2">
                <i className="bi bi-info-circle me-1" />
                Uses Account ID (credentials) + Sync ID (sync section) above.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
