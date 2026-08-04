import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useChiftConfig } from '../../contexts/ChiftConfigContext.jsx';
import { getToken, buildHeaders, extractCount, DOC_URLS, deleteConnection } from '../../lib/chiftApi.js';
import { useApiLog } from '../../hooks/useApiLog.js';
import { ApiCallLog } from '../../components/ApiCallLog.jsx';

function StepBadge({ n }) {
  return (
    <span className="badge bg-primary bg-opacity-10 text-primary me-2" style={{ minWidth: 24 }}>
      {n}
    </span>
  );
}

export default function UnifiedApiGenericMode() {
  const { config, setConfig }                         = useChiftConfig();
  const [searchParams]                                = useSearchParams();
  const navigate                                      = useNavigate();
  const { calls, logCall, resolveCall, failCall, clearLog } = useApiLog('api-log-unified-generic');

  const [status,      setStatus]      = useState('idle'); // idle | loading | success
  const [clientCount, setClientCount] = useState(null);
  const [connection,  setConnection]  = useState(null);
  const [logoSrc,     setLogoSrc]     = useState(null);
  const [error,       setError]       = useState(null);
  const [techOpen,    setTechOpen]    = useState(false);

  const isConfigured = !!(config.clientId && config.clientSecret);
  const didInit      = useRef(false);

  // ── OAuth2 return / auto-load ─────────────────────────────────────
  useEffect(() => {
    if (didInit.current) return; // prevent React StrictMode double-invoke
    didInit.current = true;
    const isReturn      = searchParams.get('chift_return') === '1';
    const urlConsumerId = searchParams.get('consumerId') ?? searchParams.get('consumer_id');
    if (!isReturn) {
      if (config.consumerId && isConfigured) fetchAllData(config.consumerId);
      return;
    }
    const consumerId = urlConsumerId || config.consumerId;
    if (urlConsumerId && urlConsumerId !== config.consumerId) setConfig({ consumerId: urlConsumerId });
    navigate('/integrations', { replace: true });
    fetchAllData(consumerId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch everything needed for the success / active state ────────
  const fetchAllData = async (consumerId) => {
    setStatus('loading');
    setError(null);
    try {
      const token = await getToken(config);
      const hdrs  = buildHeaders(token, config.accountId);

      // 1. GET connections
      logCall({ id: 'conn_load', method: 'GET',
        endpoint: `/consumers/${consumerId}/connections`,
        docUrl:   DOC_URLS.connections_get });
      const connRes  = await fetch(`${config.baseUrl}/consumers/${consumerId}/connections`, { headers: hdrs });
      let conn = null;
      if (connRes.ok) {
        const connList = await connRes.json().catch(() => []);
        resolveCall('conn_load', connList);
        conn = Array.isArray(connList) ? connList[0] ?? null : null;
        if (conn) {
          setConnection(conn);
          // Fetch logo silently
          try {
            const logoRes = await fetch(
              `${config.baseUrl}/integrations/${conn.integrationid}/logo.json`,
              { headers: hdrs }
            );
            if (logoRes.ok) {
              const logoData = await logoRes.json();
              setLogoSrc(`data:image/png;base64,${logoData.data}`);
            }
          } catch { /* logo is optional */ }
        }
      } else {
        failCall('conn_load', `HTTP ${connRes.status}`);
      }

      // No connection — stay on idle screen, skip clients call
      if (!conn) { setStatus('idle'); return; }

      // 2. GET accounting clients (only when connection exists)
      logCall({ id: 'clients_load', method: 'GET',
        endpoint: `/consumers/${consumerId}/accounting/clients`,
        docUrl:   DOC_URLS.clients });
      const clientsRes = await fetch(
        `${config.baseUrl}/consumers/${consumerId}/accounting/clients`,
        { headers: hdrs }
      );
      if (!clientsRes.ok) {
        const body = await clientsRes.json().catch(() => ({}));
        failCall('clients_load', `HTTP ${clientsRes.status} — ${body.error_code ?? JSON.stringify(body)}`);
        if (body.error_code === 'ERROR_NO_ACTIVE_CONNECTION') {
          setStatus('success'); // connection exists but not yet active — show card
          return;
        }
        throw new Error(`HTTP ${clientsRes.status} — ${JSON.stringify(body)}`);
      }
      const data = await clientsRes.json();
      resolveCall('clients_load', data);
      setClientCount(extractCount(data));
      setStatus('success');
    } catch (err) {
      setError(`Could not load data: ${err.message}`);
      setStatus('idle');
    }
  };

  // ── Connect handler (PATCH if connection exists, POST otherwise) ───
  const handleConnect = async () => {
    if (!isConfigured) { setError('Please set Client ID and Client Secret in Settings.'); return; }
    setStatus('loading');
    setError(null);
    try {
      const token = await getToken(config);
      const hdrs  = buildHeaders(token, config.accountId);
      let consumerId = config.consumerId;

      // Create consumer if needed
      if (!consumerId) {
        const consumerBody = {
          name:               config.consumerName || 'Demo Consumer',
          redirect_url:       `${window.location.origin}${import.meta.env.BASE_URL}integrations?chift_return=1`,
          internal_reference: `demo_${Date.now()}`,
        };
        logCall({ id: 'consumer_create', method: 'POST',
          endpoint: '/consumers',
          docUrl:   DOC_URLS.consumers_post,
          requestBody: consumerBody });
        const r = await fetch(`${config.baseUrl}/consumers`, {
          method: 'POST', headers: hdrs, body: JSON.stringify(consumerBody),
        });
        if (!r.ok) {
          failCall('consumer_create', `HTTP ${r.status}: ${await r.text()}`);
          throw new Error(`Consumer creation failed (${r.status})`);
        }
        const consumer = await r.json();
        resolveCall('consumer_create', consumer);
        consumerId = consumer.consumerid ?? consumer.id ?? consumer.consumer_id;
        if (!consumerId) throw new Error('API returned no consumer ID.');
        setConfig({ consumerId });
      }

      // Reuse connection loaded on mount; new consumers have no connections
      const existingConn = config.consumerId ? connection : null;

      const redirectUrl = `${window.location.origin}${import.meta.env.BASE_URL}integrations?chift_return=1&consumer_id=${consumerId}`;

      if (existingConn?.connectionid) {
        // PATCH existing connection
        const patchBody = { redirect: true, redirect_url: redirectUrl };
        logCall({ id: 'conn_patch', method: 'PATCH',
          endpoint: `/consumers/${consumerId}/connections/${existingConn.connectionid}`,
          docUrl:   DOC_URLS.connections_patch,
          requestBody: patchBody });
        const r = await fetch(
          `${config.baseUrl}/consumers/${consumerId}/connections/${existingConn.connectionid}`,
          { method: 'PATCH', headers: hdrs, body: JSON.stringify(patchBody) }
        );
        if (!r.ok) {
          failCall('conn_patch', `HTTP ${r.status}: ${await r.text()}`);
          throw new Error(`Connection update failed (${r.status})`);
        }
        const conn = await r.json();
        resolveCall('conn_patch', conn);
        if (!conn.url) throw new Error('No redirect URL returned by the API.');
        window.location.href = conn.url;
      } else {
        // POST new connection
        const postBody = { apis: ['Accounting'], redirect: true, redirect_url: redirectUrl };
        logCall({ id: 'conn_post', method: 'POST',
          endpoint: `/consumers/${consumerId}/connections`,
          docUrl:   DOC_URLS.connections_post,
          requestBody: postBody });
        const r = await fetch(`${config.baseUrl}/consumers/${consumerId}/connections`, {
          method: 'POST', headers: hdrs, body: JSON.stringify(postBody),
        });
        if (!r.ok) {
          failCall('conn_post', `HTTP ${r.status}: ${await r.text()}`);
          throw new Error(`Connection creation failed (${r.status})`);
        }
        const conn = await r.json();
        resolveCall('conn_post', conn);
        if (!conn.url) throw new Error('No redirect URL returned by the API.');
        window.location.href = conn.url;
      }
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  };

  const handleDisconnect = async () => {
    const consumerId = config.consumerId;
    const connectionId = connection?.connectionid;
    // Clear local connection state only (do not remove stored consumerId)
    setStatus('idle');
    setClientCount(null);
    setConnection(null);
    setLogoSrc(null);
    setError(null);
    if (consumerId && connectionId) {
      logCall({ id: 'conn_delete', method: 'DELETE', endpoint: `/consumers/${consumerId}/connections/${connectionId}`, docUrl: DOC_URLS.connections_get });
      try {
        await deleteConnection(config, consumerId, connectionId);
        resolveCall('conn_delete', null);
      } catch (err) {
        console.error(err);
        failCall('conn_delete', err.message);
      }
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
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

      <div className="card border-0 shadow-sm" style={{ background: 'rgba(13, 110, 253, 0.04)' }}>
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
                <span className={`badge fw-medium px-3 py-2 flex-shrink-0 ${connection?.status === 'active' ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning'}`}>
                  <i className={`bi ${connection?.status === 'active' ? 'bi-check-circle-fill' : 'bi-hourglass-split'} me-1`} />
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
                      <div className="text-muted small mt-1">
                        {connection?.status !== 'active' ? 'Awaiting activation' : 'Could not fetch'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-outline-primary btn-sm" onClick={() => fetchAllData(config.consumerId)}>
                  <i className="bi bi-arrow-clockwise me-1" />Refresh
                </button>
                <button className="btn btn-outline-primary btn-sm" onClick={handleConnect}>
                  <i className="bi bi-pencil me-1" />Reconnect
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info banner — collapsible technical details */}
      <div className="alert alert-light border mt-4" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="d-flex gap-3 align-items-start"
          style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setTechOpen((o) => !o)}
        >
          <i className="bi bi-info-circle-fill text-primary mt-1 flex-shrink-0" />
          <div className="small flex-grow-1">
            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
              <strong>Unified API — Generic</strong>
              <span className="badge bg-secondary bg-opacity-10 text-secondary fw-normal" style={{ fontSize: 11 }}>Minimal effort</span>
            </div>
            Single "Connect" button — user picks their accounting software on the Chift-hosted flow.
          </div>
          <i className={`bi bi-chevron-${techOpen ? 'up' : 'down'} text-muted flex-shrink-0 mt-1`} style={{ fontSize: 13 }} />
        </div>
        {techOpen && (
          <div className="border-top px-4 py-3" style={{ background: 'rgba(0,0,0,0.02)' }}>
            <div className="small fw-medium text-muted mb-2" style={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11 }}>
              Technical flow
            </div>
            <div className="d-flex flex-column gap-2 small text-muted">
              <div><StepBadge n={1} />Create consumer if none exists for the current end-user — <code>POST /consumers</code></div>
              <div><StepBadge n={2} />Create or update connection — <code>POST</code> or <code>PATCH /consumers/{'{id}'}/connections</code></div>
              <div><StepBadge n={3} />Redirect end-user → picks accounting software on Chift</div>
              <div><StepBadge n={4} />Return here — reload connections + clients</div>
            </div>
            {config.consumerId && (
              <div className="alert alert-info small mb-0 mt-3 py-2">
                <i className="bi bi-person-badge me-1" />
                Existing consumer: <code>{config.consumerId}</code> — Step 1 will be skipped.
              </div>
            )}
            <ApiCallLog calls={calls} onClear={clearLog} />
          </div>
        )}
      </div>
    </div>
  );
}
