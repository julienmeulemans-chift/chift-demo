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

export default function SyncApiDrivenPickerMode() {
  const { config, setConfig }                               = useChiftConfig();
  const [searchParams]                                      = useSearchParams();
  const navigate                                            = useNavigate();
  const { calls, logCall, resolveCall, failCall, clearLog } = useApiLog('api-log-sync-driven-picker');

  const [integrations, setIntegrations] = useState([]);
  const [intLoading,   setIntLoading]   = useState(false);
  const [intError,     setIntError]     = useState(null);

  const [status,      setStatus]      = useState('idle');
  const [clientCount, setClientCount] = useState(null);
  const [connection,  setConnection]  = useState(null);
  const [logoSrc,     setLogoSrc]     = useState(null);
  const [error,       setError]       = useState(null);
  const [connecting,  setConnecting]  = useState(null); // integrationid in progress
  const [techOpen,    setTechOpen]    = useState(false);

  const isConfigured = !!(config.clientId && config.clientSecret && config.syncId);
  const didInit      = useRef(false);
  const loadingRef   = useRef(false);

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

  // ── Load integration picker on mount ─────────────────────────────
  useEffect(() => {
    if (isConfigured) loadIntegrations();
  }, [config.clientId, config.clientSecret, config.accountId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadIntegrations = async () => {
    if (loadingRef.current) return; // prevent StrictMode double-invoke
    loadingRef.current = true;
    setIntLoading(true);
    setIntError(null);
    try {
      const token = await getToken(config);
      logCall({ id: 'integrations_load', method: 'GET',
        endpoint: '/integrations?status=active',
        docUrl:   DOC_URLS.integrations });
      const res = await fetch(
        `${config.baseUrl}/integrations?status=active`,
        { headers: buildHeaders(token, config.accountId) }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${await res.text()}`);
      const data = await res.json();
      resolveCall('integrations_load', data);
      const list = Array.isArray(data) ? data : (data.results ?? data.items ?? []);
      setIntegrations(list.filter(i => i.api === 'Accounting'));
    } catch (err) {
      failCall('integrations_load', err.message);
      setIntError(`Could not load integrations: ${err.message}`);
    } finally {
      setIntLoading(false);
      loadingRef.current = false;
    }
  };

  // ── Fetch connection info for logo/display (best-effort, returns conn) ──
  const fetchConnectionInfo = async (consumerId, token) => {
    try {
      logCall({ id: 'conn_load', method: 'GET',
        endpoint: `/consumers/${consumerId}/connections`,
        docUrl:   DOC_URLS.connections_get });
      const res = await fetch(
        `${config.baseUrl}/consumers/${consumerId}/connections`,
        { headers: buildHeaders(token, config.accountId) }
      );
      if (!res.ok) { failCall('conn_load', `HTTP ${res.status}`); return null; }
      const list = await res.json();
      resolveCall('conn_load', list);
      const conn = Array.isArray(list) ? list[0] ?? null : null;
      if (!conn) return null;
      setConnection(conn);
      try {
        const logoRes = await fetch(
          `${config.baseUrl}/integrations/${conn.integrationid}/logo.json`,
          { headers: buildHeaders(token, config.accountId) }
        );
        if (logoRes.ok) {
          const logoData = await logoRes.json();
          setLogoSrc(`data:image/png;base64,${logoData.data}`);
        }
      } catch { /* logo optional */ }
      return conn;
    } catch { return null; }
  };

  const fetchAllData = async (consumerId) => {
    setStatus('loading');
    setError(null);
    try {
      const token = await getToken(config);
      const hdrs  = buildHeaders(token, config.accountId);

      // Fetch connection info silently (for display/logo)
      const conn = await fetchConnectionInfo(consumerId, token);

      // No connection — stay on picker screen, skip clients call
      if (!conn) { setStatus('idle'); return; }

      // GET accounting clients (only when connection exists)
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

  // ── Connect handler ───────────────────────────────────────────────
  const handleConnect = async (integration) => {
    if (!isConfigured) { setError('Please set Client ID, Client Secret and Sync ID in Settings.'); return; }
    setConnecting(integration.integrationid);
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

      // Get sync redirect URL with pre-selected connector
      const syncBody = {
        syncid:         config.syncId,
        integrationids: [String(integration.integrationid)],
      };
      logCall({ id: 'sync_create', method: 'POST',
        endpoint: `/consumers/${consumerId}/syncs`,
        docUrl:   DOC_URLS.syncs,
        requestBody: syncBody });
      const r = await fetch(`${config.baseUrl}/consumers/${consumerId}/syncs`, {
        method: 'POST', headers: hdrs, body: JSON.stringify(syncBody),
      });
      if (!r.ok) {
        failCall('sync_create', `HTTP ${r.status}: ${await r.text()}`);
        throw new Error(`Sync URL retrieval failed (${r.status})`);
      }
      const syncRes = await r.json();
      resolveCall('sync_create', syncRes);
      if (!syncRes.url) throw new Error('No redirect URL returned by the API.');

      window.location.href = syncRes.url;
    } catch (err) {
      setError(err.message);
      setConnecting(null);
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
    setConnecting(null);
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

  // ── SUCCESS state ─────────────────────────────────────────────────
  if (status === 'success' || (status === 'loading' && clientCount !== null)) {
    return (
      <div style={{ maxWidth: 680 }}>
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
            {status === 'loading' ? (
              <div className="d-flex align-items-center gap-3 py-2">
                <div className="spinner-border spinner-border-sm text-primary" role="status" />
                <span className="text-muted">Loading…</span>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Info banner */}
        <div className="alert alert-light border mt-4" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="d-flex gap-3 align-items-start"
            style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setTechOpen((o) => !o)}
          >
            <i className="bi bi-info-circle-fill text-primary mt-1 flex-shrink-0" />
            <div className="small flex-grow-1">
              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                <strong>Sync — API-driven + Connector Picker</strong>
                <span className="badge bg-secondary bg-opacity-10 text-secondary fw-normal" style={{ fontSize: 11 }}>⭐⭐⭐ Medium effort</span>
              </div>
              Shows active connectors for the user to pick. Passes the selected <code>integrationid</code> when creating the sync URL — connector selection on Chift's side is skipped.
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
                <div><StepBadge n={2} />Fetch connectors — <code>GET /integrations?status=active</code></div>
                <div><StepBadge n={3} />User picks a connector</div>
                <div><StepBadge n={4} />Get sync URL — <code>POST /consumers/{'{id}'}/syncs</code> with <code>syncid</code> + <code>integrationids</code></div>
                <div><StepBadge n={5} />Redirect end-user to Chift-hosted sync page (connector pre-selected)</div>
                <div><StepBadge n={6} />Return here — <code>GET /consumers/{'{id}'}/accounting/clients</code></div>
              </div>
              {config.consumerId && (
                <div className="alert alert-info small mb-0 mt-3 py-2">
                  <i className="bi bi-person-badge me-1" />
                  Consumer: <code>{config.consumerId}</code>
                </div>
              )}
              <ApiCallLog calls={calls} onClear={clearLog} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── IDLE — connector picker grid ──────────────────────────────────
  return (
    <div style={{ maxWidth: 800 }}>
      {!isConfigured && (
        <div className="alert alert-warning d-flex gap-2 align-items-center mb-4">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
          <span>
            Client ID, Client Secret or Sync ID not set.{' '}
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

      {/* Connector grid */}
      <div className="rounded-3 p-4 shadow-sm" style={{ background: 'rgba(13, 110, 253, 0.04)' }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h6 className="mb-0 fw-semibold">Configure the synchronization with your accounting software</h6>
            <div className="text-muted small">Choose your accounting software to get started</div>
          </div>
          {isConfigured && (
            <button className="btn btn-outline-secondary btn-sm" onClick={loadIntegrations} disabled={intLoading}>
              <i className={`bi bi-arrow-clockwise me-1${intLoading ? ' spin' : ''}`} />Reload
            </button>
          )}
        </div>

        {intLoading && (
          <div className="d-flex align-items-center gap-2 text-muted py-3">
            <div className="spinner-border spinner-border-sm" role="status" />
            <span>Loading connectors…</span>
          </div>
        )}

        {intError && <div className="alert alert-danger small">{intError}</div>}

        {!intLoading && !intError && integrations.length === 0 && isConfigured && (
          <div className="text-muted small py-3">No active connectors found.</div>
        )}

        <div className="row g-3 mt-1">
          {integrations.map((integration) => {
            const isConn = connecting === integration.integrationid;
            return (
              <div key={integration.integrationid} className="col-6 col-md-4 col-lg-3">
                <button
                  className="card border h-100 w-100 text-start p-0 bg-white"
                  style={{ cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s', border: '1px solid #dee2e6' }}
                  onClick={() => handleConnect(integration)}
                  disabled={!!connecting}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = '#4a90d9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = '#dee2e6'; }}
                >
                  <div className="card-body d-flex flex-column align-items-center text-center p-3 gap-2">
                    {isConn ? (
                      <div className="d-flex align-items-center justify-content-center rounded-3 bg-light flex-shrink-0" style={{ width: 48, height: 48 }}>
                        <div className="spinner-border spinner-border-sm text-primary" role="status" />
                      </div>
                    ) : integration.logo_url || integration.icon_url ? (
                      <img
                        src={integration.logo_url || integration.icon_url}
                        alt={integration.name}
                        style={{ width: 48, height: 48, objectFit: 'contain' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <div className="d-none align-items-center justify-content-center rounded-3 bg-light flex-shrink-0" style={{ width: 48, height: 48 }}>
                      <i className="bi bi-building text-primary" style={{ fontSize: 20 }} />
                    </div>
                    <div className="fw-medium small lh-sm">{integration.name}</div>
                    {isConn && <div className="text-muted" style={{ fontSize: 11 }}>Connecting…</div>}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info banner */}
      <div className="alert alert-light border mt-4" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="d-flex gap-3 align-items-start"
          style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setTechOpen((o) => !o)}
        >
          <i className="bi bi-info-circle-fill text-primary mt-1 flex-shrink-0" />
          <div className="small flex-grow-1">
            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
              <strong>Sync — API-driven + Connector Picker</strong>
              <span className="badge bg-secondary bg-opacity-10 text-secondary fw-normal" style={{ fontSize: 11 }}>⭐⭐⭐ Medium effort</span>
            </div>
            Shows active connectors for the user to pick. Passes the selected <code>integrationid</code> when creating the sync URL — connector selection on Chift's side is skipped.
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
              <div><StepBadge n={2} />Fetch connectors — <code>GET /integrations?status=active</code></div>
              <div><StepBadge n={3} />User picks a connector</div>
              <div><StepBadge n={4} />Get sync URL — <code>POST /consumers/{'{id}'}/syncs</code> with <code>syncid</code> + <code>integrationids: [selectedId]</code></div>
              <div><StepBadge n={5} />Redirect end-user to Chift-hosted sync page (connector pre-selected)</div>
              <div><StepBadge n={6} />Return here — <code>GET /consumers/{'{id}'}/accounting/clients</code></div>
            </div>
            {config.consumerId && (
              <div className="alert alert-info small mb-0 mt-3 py-2">
                <i className="bi bi-person-badge me-1" />
                Existing consumer: <code>{config.consumerId}</code> — consumer creation will be skipped.
              </div>
            )}
            <ApiCallLog calls={calls} onClear={clearLog} />
          </div>
        )}
      </div>
    </div>
  );
}
