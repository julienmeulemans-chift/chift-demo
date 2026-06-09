import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useChiftConfig } from '../../contexts/ChiftConfigContext.jsx';
import { getToken, buildHeaders, extractCount } from '../../lib/chiftApi.js';

function StepBadge({ n }) {
  return (
    <span className="badge bg-primary bg-opacity-10 text-primary me-2" style={{ minWidth: 24 }}>
      {n}
    </span>
  );
}

export default function UnifiedApiGenericMode() {
  const { config, setConfig } = useChiftConfig();
  const [searchParams]        = useSearchParams();
  const navigate              = useNavigate();

  const [status,      setStatus]      = useState('idle'); // idle | loading | success
  const [clientCount, setClientCount] = useState(null);
  const [connection,  setConnection]  = useState(null);
  const [logoSrc,     setLogoSrc]     = useState(null);
  const [error,       setError]       = useState(null);
  const [techOpen,    setTechOpen]    = useState(false);

  const isConfigured = !!(config.clientId && config.clientSecret);

  // ── OAuth2 return ─────────────────────────────────────────────────
  useEffect(() => {
    const isReturn      = searchParams.get('chift_return') === '1';
    const urlConsumerId = searchParams.get('consumer_id');
    if (!isReturn) {
      // Auto-load if consumer already connected
      if (config.consumerId && isConfigured) fetchAllData(config.consumerId);
      return;
    }
    const consumerId = urlConsumerId || config.consumerId;
    if (urlConsumerId && urlConsumerId !== config.consumerId) setConfig({ consumerId: urlConsumerId });
    navigate('/integrations', { replace: true });
    fetchAllData(consumerId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch connection info (non-throwing, best-effort) ─────────────
  const fetchConnectionInfo = async (consumerId, token) => {
    try {
      const res = await fetch(
        `${config.baseUrl}/consumers/${consumerId}/connections`,
        { headers: buildHeaders(token, config.accountId) }
      );
      if (!res.ok) return;
      const list = await res.json();
      const conn = list.find((c) => c.api === 'Accounting') ?? null;
      if (!conn) return;
      setConnection(conn);
      // Fetch logo
      try {
        const logoRes = await fetch(
          `${config.baseUrl}/integrations/${conn.integrationid}/logo.json`,
          { headers: buildHeaders(token, config.accountId) }
        );
        if (logoRes.ok) {
          const logoData = await logoRes.json();
          setLogoSrc(`data:image/png;base64,${logoData.data}`);
        }
      } catch { /* logo is optional */ }
    } catch { /* silent */ }
  };

  // ── Fetch everything needed for the success state ─────────────────
  const fetchAllData = async (consumerId) => {
    setStatus('loading');
    setError(null);
    try {
      const token = await getToken(config);
      const [, clientsRes] = await Promise.all([
        fetchConnectionInfo(consumerId, token),
        fetch(
          `${config.baseUrl}/consumers/${consumerId}/accounting/clients`,
          { headers: buildHeaders(token, config.accountId) }
        ),
      ]);
      if (!clientsRes.ok) {
        const body = await clientsRes.json().catch(() => ({}));
        if (body.error_code === 'ERROR_NO_ACTIVE_CONNECTION') {
          setStatus('idle'); // no connection yet — silent, stay on connect screen
          return;
        }
        throw new Error(`HTTP ${clientsRes.status} — ${JSON.stringify(body)}`);
      }
      const data = await clientsRes.json();
      setClientCount(extractCount(data));
      setStatus('success');
    } catch (err) {
      setError(`Could not load data: ${err.message}`);
      setStatus('idle');
    }
  };

  // ── Connect handler ───────────────────────────────────────────────
  const handleConnect = async () => {
    if (!config.clientId || !config.clientSecret) {
      setError('Please set Client ID and Client Secret in Settings.');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const token = await getToken(config);
      const hdrs  = buildHeaders(token, config.accountId);
      let consumerId = config.consumerId;

      if (!consumerId) {
        const r = await fetch(`${config.baseUrl}/consumers`, {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify({
            name:               config.consumerName || 'Demo Consumer',
            redirect_url:       `${window.location.origin}/integrations?chift_return=1`,
            internal_reference: `demo_${Date.now()}`,
          }),
        });
        if (!r.ok) throw new Error(`Consumer creation failed (${r.status}): ${await r.text()}`);
        const consumer = await r.json();
        consumerId = consumer.consumerid ?? consumer.id ?? consumer.consumer_id;
        if (!consumerId) throw new Error('API returned no consumer ID.');
        setConfig({ consumerId });
      }

      const r = await fetch(`${config.baseUrl}/consumers/${consumerId}/connections`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({
          apis:         ['Accounting'],
          redirect:     true,
          redirect_url: `${window.location.origin}/integrations?chift_return=1&consumer_id=${consumerId}`,
        }),
      });
      if (!r.ok) throw new Error(`Connection creation failed (${r.status}): ${await r.text()}`);
      const conn = await r.json();
      if (!conn.url) throw new Error('No redirect URL returned by the API.');
      window.location.href = conn.url;
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  };

  const handleDisconnect = () => {
    setConfig({ consumerId: '' });
    setStatus('idle');
    setClientCount(null);
    setConnection(null);
    setLogoSrc(null);
    setError(null);
  };

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Info banner — collapsible technical details */}
      <div className="alert alert-light border mb-4" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="d-flex gap-3 align-items-start"
          style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setTechOpen((o) => !o)}
        >
          <i className="bi bi-info-circle-fill text-primary mt-1 flex-shrink-0" />
          <div className="small flex-grow-1">
            <strong>Unified API — Generic</strong><br />
            A single "Connect" button sends the user to Chift where they choose their accounting
            software from all available connectors. Your app only specifies the{' '}
            <code>apis: ["Accounting"]</code> filter.
          </div>
          <i className={`bi bi-chevron-${techOpen ? 'up' : 'down'} text-muted flex-shrink-0 mt-1`} style={{ fontSize: 13 }} />
        </div>
        {techOpen && (
          <div className="border-top px-4 py-3" style={{ background: 'rgba(0,0,0,0.02)' }}>
            <div className="small fw-medium text-muted mb-2" style={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11 }}>
              Technical details
            </div>
            <div className="d-flex flex-column gap-2 small text-muted">
              <div><StepBadge n={1} />Authenticate — <code>POST /token</code></div>
              <div><StepBadge n={2} />Create consumer — <code>POST /consumers</code></div>
              <div><StepBadge n={3} />Create connection — <code>POST /consumers/{'{id}'}/connections</code> with <code>apis: ["Accounting"]</code></div>
              <div><StepBadge n={4} />Redirect end-user → picks accounting software on Chift</div>
              <div><StepBadge n={5} />Return here — <code>GET /consumers/{'{id}'}/connections</code> + <code>GET /consumers/{'{id}'}/accounting/clients</code></div>
            </div>
            {config.consumerId && (
              <div className="alert alert-info small mb-0 mt-3 py-2">
                <i className="bi bi-person-badge me-1" />
                Existing consumer: <code>{config.consumerId}</code> — Steps 1–2 will be skipped.
              </div>
            )}
          </div>
        )}
      </div>

      {!isConfigured && status !== 'loading' && (
        <div className="alert alert-warning d-flex gap-2 align-items-center mb-4">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
          <span>Client ID and Client Secret not set. <a href="/settings" className="alert-link">Go to Settings</a>.</span>
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

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">

          {/* IDLE */}
          {status === 'idle' && (
            <>
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="rounded-3 bg-light d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 56, height: 56 }}>
                  <i className="bi bi-building text-primary" style={{ fontSize: 26 }} />
                </div>
                <div>
                  <h6 className="mb-0 fw-semibold">Accounting Software</h6>
                  <div className="text-muted small">Any accounting connector</div>
                </div>
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleConnect} disabled={!isConfigured}>
                <i className="bi bi-plug-fill me-2" />Connect your accounting software
              </button>
            </>
          )}

          {/* LOADING */}
          {status === 'loading' && (
            <div className="d-flex align-items-center gap-3 py-2">
              <div className="spinner-border spinner-border-sm text-primary" role="status" />
              <span className="text-muted">Loading…</span>
            </div>
          )}

          {/* SUCCESS */}
          {status === 'success' && (
            <div>
              {/* Connection info */}
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="flex-shrink-0" style={{ width: 56, height: 56 }}>
                  {logoSrc ? (
                    <img src={logoSrc} alt={connection?.integration} style={{ width: 56, height: 56, objectFit: 'contain' }} />
                  ) : (
                    <div className="rounded-3 bg-light d-flex align-items-center justify-content-center w-100 h-100">
                      <i className="bi bi-building text-primary" style={{ fontSize: 26 }} />
                    </div>
                  )}
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-0 fw-semibold">{connection?.name ?? 'Connected'}</h6>
                  <div className="text-muted small">{connection?.integration ?? 'Accounting connector'}</div>
                </div>
                <span className={`badge fw-medium px-3 py-2 flex-shrink-0 ${connection?.status === 'active' ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                  <i className={`bi ${connection?.status === 'active' ? 'bi-check-circle-fill' : 'bi-circle'} me-1`} />
                  {connection?.status ?? 'active'}
                </span>
              </div>

              {/* Client count */}
              <div className="card bg-light border-0 mb-4">
                <div className="card-body d-flex align-items-center gap-3 py-3 px-4">
                  <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 44, height: 44 }}>
                    <i className="bi bi-people-fill text-primary" style={{ fontSize: 18 }} />
                  </div>
                  <div>
                    <div className="text-muted small">Accounting clients</div>
                    {clientCount !== null ? (
                      <div className="fw-bold fs-3 lh-1 mt-1">{clientCount.toLocaleString()}</div>
                    ) : (
                      <div className="text-muted small mt-1">Could not fetch</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-outline-primary btn-sm" onClick={() => fetchAllData(config.consumerId)}>
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
