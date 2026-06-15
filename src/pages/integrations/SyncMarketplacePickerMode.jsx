import { useState, useEffect } from 'react';
import { useChiftConfig } from '../../contexts/ChiftConfigContext.jsx';
import { getToken, buildHeaders, DOC_URLS } from '../../lib/chiftApi.js';
import { useApiLog } from '../../hooks/useApiLog.js';
import { ApiCallLog } from '../../components/ApiCallLog.jsx';

export default function SyncMarketplacePickerMode() {
  const { config }                                          = useChiftConfig();
  const [techOpen, setTechOpen]                             = useState(false);
  const { calls, logCall, resolveCall, failCall, clearLog } = useApiLog();

  const [integrations, setIntegrations] = useState([]);
  const [intLoading,   setIntLoading]   = useState(false);
  const [intError,     setIntError]     = useState(null);

  const isConfigured = !!(config.clientId && config.clientSecret && config.marketplaceSlug);

  useEffect(() => {
    if (isConfigured) loadIntegrations();
  }, [config.clientId, config.clientSecret, config.accountId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadIntegrations = async () => {
    setIntLoading(true);
    setIntError(null);
    clearLog();
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
      setIntegrations(list);
    } catch (err) {
      failCall('integrations_load', err.message);
      setIntError(`Could not load integrations: ${err.message}`);
    } finally {
      setIntLoading(false);
    }
  };

  const handleConnect = (integration) => {
    const url = `https://marketplaces.chift.app/en/${config.marketplaceSlug}/apps/${integration.integrationid}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ maxWidth: 800 }}>
      {!config.marketplaceSlug && (
        <div className="alert alert-warning d-flex gap-2 align-items-center mb-4">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
          <span>Marketplace slug not set. <a href="/settings" className="alert-link">Go to Settings</a>.</span>
        </div>
      )}

      {!config.clientId && (
        <div className="alert alert-warning d-flex gap-2 align-items-center mb-4">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
          <span>API credentials not set. <a href="/settings" className="alert-link">Go to Settings</a>.</span>
        </div>
      )}

      {/* Connector grid */}
      <div className="rounded-3 p-4 shadow-sm" style={{ background: 'rgba(13, 110, 253, 0.04)' }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h6 className="mb-0 fw-semibold">Set up your accounting synchronization</h6>
            <div className="text-muted small">Choose your accounting software to get started</div>
          </div>
          {isConfigured && (
            <button className="btn btn-outline-secondary btn-sm" onClick={loadIntegrations} disabled={intLoading}>
              <i className="bi bi-arrow-clockwise me-1" />Reload
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
          {integrations.map((integration) => (
            <div key={integration.integrationid} className="col-6 col-md-4 col-lg-3">
              <button
                className="card border h-100 w-100 text-start p-0 bg-white"
                style={{ cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s', border: '1px solid #dee2e6' }}
                onClick={() => handleConnect(integration)}
                disabled={!config.marketplaceSlug}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = '#4a90d9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = '#dee2e6'; }}
              >
                <div className="card-body d-flex flex-column align-items-center text-center p-3 gap-2">
                  {integration.logo_url || integration.icon_url ? (
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
                </div>
              </button>
            </div>
          ))}
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
              <strong>Marketplace — Connector Picker</strong>
              <span className="badge bg-secondary bg-opacity-10 text-secondary fw-normal" style={{ fontSize: 11 }}>⭐⭐ Low effort</span>
            </div>
            Shows active connectors. User picks one, then is redirected to the Marketplace with that connector pre-selected. User must create a Chift account.
          </div>
          <i className={`bi bi-chevron-${techOpen ? 'up' : 'down'} text-muted flex-shrink-0 mt-1`} style={{ fontSize: 13 }} />
        </div>
        <div className="px-4 pb-2" style={{ marginTop: -4 }}>
          <a href="https://docs.chift.eu/syncs/marketplace" target="_blank" rel="noopener noreferrer" className="small" onClick={(e) => e.stopPropagation()}>
            <i className="bi bi-book me-1" />Documentation
          </a>
        </div>
        {techOpen && (
          <div className="border-top px-4 py-3" style={{ background: 'rgba(0,0,0,0.02)' }}>
            <div className="small fw-medium text-muted mb-2" style={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11 }}>
              Technical flow
            </div>
            <div className="d-flex flex-column gap-2 small text-muted mb-3">
              <div>
                <span className="badge bg-primary bg-opacity-10 text-primary me-2" style={{ minWidth: 24 }}>1</span>
                Fetch connectors — <code>GET /integrations?status=active</code>
              </div>
              <div>
                <span className="badge bg-primary bg-opacity-10 text-primary me-2" style={{ minWidth: 24 }}>2</span>
                User picks a connector
              </div>
              <div>
                <span className="badge bg-primary bg-opacity-10 text-primary me-2" style={{ minWidth: 24 }}>3</span>
                Open <code>{`https://marketplaces.chift.app/en/{slug}/apps/{integration_id}`}</code> in a new tab
              </div>
            </div>
            <p className="text-muted small fst-italic mb-0">
              No callback or consumer ID is sent back to this app — connection status is only visible in the Chift back-office.
            </p>
            <ApiCallLog calls={calls} onClear={clearLog} />
          </div>
        )}
      </div>
    </div>
  );
}
