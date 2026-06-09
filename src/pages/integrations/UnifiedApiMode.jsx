import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useChiftConfig } from '../../contexts/ChiftConfigContext.jsx';
import { getToken, buildHeaders } from '../../lib/chiftApi.js';

// ── helpers ──────────────────────────────────────────────────────────
function extractCount(data) {
  if (Array.isArray(data)) return data.length;
  if (typeof data?.count  === 'number') return data.count;
  if (typeof data?.total  === 'number') return data.total;
  if (Array.isArray(data?.results)) return data.results.length;
  if (Array.isArray(data?.items))   return data.items.length;
  return null;
}

function StepBadge({ n }) {
  return (
    <span className="badge bg-primary bg-opacity-10 text-primary me-2" style={{ minWidth: 24 }}>
      {n}
    </span>
  );
}

// ── component ─────────────────────────────────────────────────────────
export default function UnifiedApiMode() {
  const { config, setConfig } = useChiftConfig();
  const [searchParams]        = useSearchParams();
  const navigate              = useNavigate();

  const [status,        setStatus]        = useState('idle'); // idle | loading | success
  const [customerCount, setCustomerCount] = useState(null);
  const [error,         setError]         = useState(null);

  // ── on mount: handle OAuth2 callback ──────────────────────────────
  useEffect(() => {
    const isReturn      = searchParams.get('chift_return') === '1';
    const urlConsumerId = searchParams.get('consumer_id');
    if (!isReturn) return;

    const consumerId = urlConsumerId || config.consumerId;
    if (urlConsumerId && urlConsumerId !== config.consumerId) {
      setConfig({ consumerId: urlConsumerId });
    }
    navigate('/integrations', { replace: true });
    fetchCustomerCount(consumerId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── API helpers ───────────────────────────────────────────────────
  const fetchCustomerCount = async (consumerId) => {
    setStatus('loading');
    setError(null);
    try {
      const token = await getToken(config);
      const res = await fetch(
        `${config.baseUrl}/consumers/${consumerId}/accounting/clients`,
        { headers: buildHeaders(token, config.accountId) }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${await res.text()}`);
      const data = await res.json();
      setCustomerCount(extractCount(data));
      setStatus('success');
    } catch (err) {
      setError(`Could not load accounting clients: ${err.message}`);
      setStatus('success'); // still show connected state
    }
  };

  // ── connect handler ───────────────────────────────────────────────
  const handleConnect = async () => {
    if (!config.clientId || !config.clientSecret) {
      setError('Please set Client ID and Client Secret in Settings.');
      return;
    }
    if (!config.integrationId) {
      setError('Please set an Integration ID in Settings.');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const token = await getToken(config);
      const hdrs  = buildHeaders(token, config.accountId);
      let consumerId = config.consumerId;

      // Step 1 — Create consumer (if none yet)
      if (!consumerId) {
        const redirectUrl = `${window.location.origin}/integrations?chift_return=1`;
        const r = await fetch(`${config.baseUrl}/consumers`, {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify({
            name:               config.consumerName || 'Demo Consumer',
            redirect_url:       redirectUrl,
            internal_reference: `demo_${Date.now()}`,
          }),
        });
        if (!r.ok) throw new Error(`Consumer creation failed (${r.status}): ${await r.text()}`);
        const consumer = await r.json();
        consumerId = consumer.consumerid ?? consumer.id ?? consumer.consumer_id;
        if (!consumerId) throw new Error('API returned no consumer ID.');
        setConfig({ consumerId });
      }

      // Step 2 — Create connection
      const redirectUrl = `${window.location.origin}/integrations?chift_return=1&consumer_id=${consumerId}`;
      const r = await fetch(`${config.baseUrl}/consumers/${consumerId}/connections`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({
          redirect:       true,
          integration_id: config.integrationId,
          name:           `Demo — ${config.integrationId}`,
          redirect_url:   redirectUrl,
        }),
      });
      if (!r.ok) throw new Error(`Connection creation failed (${r.status}): ${await r.text()}`);
      const conn = await r.json();

      // Step 3 — Redirect user
      const url = conn.url ?? conn.redirect_url ?? conn.connection_url;
      if (!url) throw new Error('No redirect URL returned by the API.');
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  };

  const handleDisconnect = () => {
    setConfig({ consumerId: '' });
    setStatus('idle');
    setCustomerCount(null);
    setError(null);
  };

  const isConfigured = !!(config.clientId && config.clientSecret && config.integrationId);

  // ── render ────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 680 }}>
      {/* Info banner */}
      <div className="alert alert-light border d-flex gap-3 align-items-start mb-4">
        <i className="bi bi-info-circle-fill text-primary mt-1 flex-shrink-0" />
        <div className="small">
          <strong>Unified API — Method 1 (API-driven flow)</strong><br />
          Your app creates a consumer and a connection programmatically, then redirects the
          end-user to authorize via OAuth2. After authorization you can call any Unified API
          endpoint for that consumer.
        </div>
      </div>

      {!isConfigured && status !== 'loading' && (
        <div className="alert alert-warning d-flex gap-2 align-items-center mb-4">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
          <span>
            Client ID, Client Secret, or Integration ID not set.{' '}
            <a href="/settings" className="alert-link">Go to Settings</a>.
          </span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex gap-2 align-items-start mb-4">
          <i className="bi bi-x-circle-fill flex-shrink-0 mt-1" />
          <div>
            <strong>Error</strong>
            <div className="small font-monospace mt-1" style={{ wordBreak: 'break-all' }}>{error}</div>
          </div>
        </div>
      )}

      {/* Connection card */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          {/* Header row */}
          <div className="d-flex align-items-center gap-3 mb-4">
            <div
              className="rounded-3 bg-light d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 56, height: 56 }}
            >
              <i className="bi bi-building text-primary" style={{ fontSize: 26 }} />
            </div>
            <div className="flex-grow-1">
              <h6 className="mb-0 fw-semibold">Accounting Software</h6>
              <div className="text-muted small">
                Integration ID: <code>{config.integrationId || '—'}</code>
              </div>
            </div>
            {status === 'success' && (
              <span className="badge bg-success bg-opacity-10 text-success fw-medium px-3 py-2 flex-shrink-0">
                <i className="bi bi-check-circle-fill me-1" />Connected
              </span>
            )}
          </div>

          {/* ── IDLE ── */}
          {status === 'idle' && (
            <>
              <div className="d-flex flex-column gap-2 small text-muted mb-4">
                <div><StepBadge n={1} />Authenticate — <code>POST /token</code></div>
                <div><StepBadge n={2} />Create consumer — <code>POST /consumers</code></div>
                <div><StepBadge n={3} />Create connection — <code>POST /consumers/{'{id}'}/connections</code></div>
                <div><StepBadge n={4} />Redirect end-user to OAuth2 authorization</div>
                <div><StepBadge n={5} />Return here — <code>GET /consumers/{'{id}'}/accounting/clients</code></div>
              </div>

              {config.consumerId && (
                <div className="alert alert-info small mb-4 py-2">
                  <i className="bi bi-person-badge me-1" />
                  Existing consumer: <code>{config.consumerId}</code>
                  <br />Steps 1–2 will be skipped; a new connection will be created for this consumer.
                </div>
              )}

              <button className="btn btn-primary" onClick={handleConnect} disabled={!isConfigured}>
                <i className="bi bi-plug-fill me-2" />Connect accounting software
              </button>
            </>
          )}

          {/* ── LOADING ── */}
          {status === 'loading' && (
            <div className="d-flex align-items-center gap-3 py-2">
              <div className="spinner-border spinner-border-sm text-primary" role="status" />
              <span className="text-muted">Setting up connection…</span>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {status === 'success' && (
            <div>
              {config.consumerId && (
                <div className="small mb-3">
                  <span className="text-muted">Consumer ID: </span>
                  <code>{config.consumerId}</code>
                </div>
              )}

              <div className="card bg-success bg-opacity-10 border-0 mb-4">
                <div className="card-body d-flex align-items-center gap-3 py-3 px-4">
                  <div
                    className="bg-success bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 48, height: 48 }}
                  >
                    <i className="bi bi-person-check-fill text-success" style={{ fontSize: 20 }} />
                  </div>
                  <div>
                    <div className="text-muted small">
                      Accounting clients — <code>GET /consumers/{'{id}'}/accounting/clients</code>
                    </div>
                    {customerCount !== null ? (
                      <div className="fw-bold fs-3 text-success lh-1 mt-1">
                        {customerCount.toLocaleString()}
                      </div>
                    ) : (
                      <div className="text-muted small mt-1">
                        Could not fetch — verify credentials and consumer ID.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 flex-wrap">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => fetchCustomerCount(config.consumerId)}
                >
                  <i className="bi bi-arrow-clockwise me-1" />Refresh
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
