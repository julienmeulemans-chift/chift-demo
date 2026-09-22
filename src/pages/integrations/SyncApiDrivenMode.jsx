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

export default function SyncApiDrivenMode() {
  const { config, setConfig }                               = useChiftConfig();
  const [searchParams]                                      = useSearchParams();
  const navigate                                            = useNavigate();
  const { calls, logCall, resolveCall, failCall, clearLog } = useApiLog('api-log-sync-driven');

  const [status,      setStatus]      = useState('idle');
  const [clientCount, setClientCount] = useState(null);
  const [error,       setError]       = useState(null);
  const [techOpen,    setTechOpen]    = useState(false);

  const isConfigured = !!(config.clientId && config.clientSecret && config.syncId);
  const didInit      = useRef(false);

  // ── OAuth2 return / auto-load ─────────────────────────────────────
  useEffect(() => {
    if (didInit.current) return; // prevent React StrictMode double-invoke
    didInit.current = true;
    const isReturn      = searchParams.get('chift_return') === '1';
    const urlConsumerId = searchParams.get('consumerId') ?? searchParams.get('consumer_id');
    if (!isReturn) {
      if (config.consumerId && isConfigured) fetchClients(config.consumerId);
      return;
    }
    const consumerId = urlConsumerId || config.consumerId;
    if (urlConsumerId && urlConsumerId !== config.consumerId) setConfig({ consumerId: urlConsumerId });
    navigate('/integrations', { replace: true });
    fetchClients(consumerId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchClients = async (consumerId) => {
    setStatus('loading');
    setError(null);
    try {
      const token = await getToken(config);
      const hdrs  = buildHeaders(token, config.accountId);

      logCall({ id: 'clients_load', method: 'GET',
        endpoint: `/consumers/${consumerId}/accounting/clients`,
        docUrl:   DOC_URLS.clients });
      const res = await fetch(
        `${config.baseUrl}/consumers/${consumerId}/accounting/clients`,
        { headers: hdrs }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        failCall('clients_load', `HTTP ${res.status} — ${body.error_code ?? JSON.stringify(body)}`);
        if (body.error_code === 'ERROR_NO_ACTIVE_CONNECTION') { setStatus('idle'); return; }
        throw new Error(`HTTP ${res.status} — ${JSON.stringify(body)}`);
      }
      const data = await res.json();
      resolveCall('clients_load', data);
      setClientCount(extractCount(data));
      setStatus('success');
    } catch (err) {
      setError(`Could not load accounting clients: ${err.message}`);
      setStatus('idle');
    }
  };

  const handleConnect = async () => {
    if (!isConfigured) {
      setError('Please set Client ID, Client Secret and Sync ID in Settings.');
      return;
    }
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

      // Get sync redirect URL
      const syncBody = {
        syncid: config.syncId,
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
      setStatus('idle');
    }
  };

  const handleReset = async () => {
    const consumerId = config.consumerId;
    // Clear only local connection state; keep stored consumerId
    setStatus('idle');
    setClientCount(null);
    setError(null);

    if (!consumerId) return;

    try {
      const token = await getToken(config);
      const hdrs  = buildHeaders(token, config.accountId);
      const res = await fetch(`${config.baseUrl}/consumers/${consumerId}/connections`, { headers: hdrs });
      if (!res.ok) { failCall('conn_list', `HTTP ${res.status}`); return; }
      const list = await res.json().catch(() => []);
      const conns = Array.isArray(list) ? list : [];
      for (const conn of conns) {
        if (!conn?.connectionid) continue;
        const id = conn.connectionid;
        logCall({ id: `conn_delete_${id}`, method: 'DELETE', endpoint: `/consumers/${consumerId}/connections/${id}`, docUrl: DOC_URLS.connections_get });
        try {
          await deleteConnection(config, consumerId, id);
          resolveCall(`conn_delete_${id}`, null);
        } catch (err) {
          console.error(err);
          failCall(`conn_delete_${id}`, err.message);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      {!isConfigured && status !== 'loading' && (
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

      <div className="card border-0 shadow-sm" style={{ background: 'rgba(var(--bs-primary-rgb), 0.04)' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            <div className="rounded-3 bg-light d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 56, height: 56 }}>
              <i className="bi bi-arrow-left-right text-primary" style={{ fontSize: 26 }} />
            </div>
            <div className="flex-grow-1">
              <h6 className="mb-0 fw-semibold">Configure the synchronization with your accounting software</h6>
              <div className="text-muted small">Sync ID: <code>{config.syncId || '—'}</code></div>
            </div>
            {status === 'success' && (
              <span className="badge bg-success bg-opacity-10 text-success fw-medium px-3 py-2 flex-shrink-0">
                <i className="bi bi-check-circle-fill me-1" />Connected
              </span>
            )}
          </div>

          {/* IDLE */}
          {status === 'idle' && (
            <button className="btn btn-primary btn-lg" onClick={handleConnect} disabled={!isConfigured}>
              <i className="bi bi-plug-fill me-2" />Connect your accounting software
            </button>
          )}

          {/* LOADING */}
          {status === 'loading' && (
            <div className="d-flex align-items-center gap-3 py-2">
              <div className="spinner-border spinner-border-sm text-primary" role="status" />
              <span className="text-muted">Setting up sync…</span>
            </div>
          )}

          {/* SUCCESS */}
          {status === 'success' && (
            <div>
              {config.consumerId && (
                <div className="small mb-3">
                  <span className="text-muted">Consumer ID: </span>
                  <code>{config.consumerId}</code>
                </div>
              )}
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
                <button className="btn btn-outline-primary btn-sm" onClick={() => fetchClients(config.consumerId)}>
                  <i className="bi bi-arrow-clockwise me-1" />Refresh
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={handleReset}>
                  Reset
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
              <strong>Sync — Generic</strong>
              <span className="badge bg-secondary bg-opacity-10 text-secondary fw-normal" style={{ fontSize: 11 }}>⭐⭐ Low effort</span>
            </div>
            Creates a sync instance via API and redirects the user to a Chift-hosted sync page.
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
              <div><StepBadge n={2} />Get sync URL — <code>POST /consumers/{'{id}'}/syncs</code> with <code>syncid</code></div>
              <div><StepBadge n={3} />Redirect end-user to Chift-hosted sync page</div>
              <div><StepBadge n={4} />Return here — <code>GET /consumers/{'{id}'}/accounting/clients</code></div>
            </div>
            {config.consumerId && (
              <div className="alert alert-info small mb-0 mt-3 py-2">
                <i className="bi bi-person-badge me-1" />
                Existing consumer: <code>{config.consumerId}</code> — Step 1 (consumer creation) will be skipped.
              </div>
            )}
            <ApiCallLog calls={calls} onClear={clearLog} />
          </div>
        )}
      </div>
    </div>
  );
}
