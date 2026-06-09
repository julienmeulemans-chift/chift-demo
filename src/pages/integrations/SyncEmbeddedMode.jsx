import { useChiftConfig } from '../../contexts/ChiftConfigContext.jsx';

export default function SyncEmbeddedMode() {
  const { config } = useChiftConfig();

  const isConfigured = !!(config.syncId && config.accountId && config.envId);

  const iframeUrl = isConfigured
    ? `https://www.chift.app/oauth2/syncs/${config.syncId}/accounts/${config.accountId}/envs/${config.envId}`
    : null;

  return (
    <div>
      {/* Info banner */}
      <div className="alert alert-light border d-flex gap-3 align-items-start mb-4" style={{ maxWidth: 680 }}>
        <i className="bi bi-info-circle-fill text-primary mt-1 flex-shrink-0" />
        <div className="small">
          <strong>Sync — Option 4: Fully Embedded</strong>
          <br />
          The entire sync activation flow is embedded directly in your app. No Chift branding is
          visible to the end-user. Requires OpenID Connect on your OAuth2.
        </div>
      </div>

      {!isConfigured && (
        <div className="alert alert-warning d-flex gap-2 align-items-center mb-4" style={{ maxWidth: 680 }}>
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
          <span>
            Sync ID, Account ID, or Env ID not set.{' '}
            <a href="/settings" className="alert-link">Go to Settings</a>.
          </span>
        </div>
      )}

      {iframeUrl && (
        <>
          <div className="d-flex align-items-center justify-content-between mb-3" style={{ maxWidth: 900 }}>
            <h6 className="mb-0 fw-semibold">Embedded Sync Configuration</h6>
            <a
              href={iframeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-secondary btn-sm"
            >
              <i className="bi bi-box-arrow-up-right me-1" />Open in new tab
            </a>
          </div>

          <div className="card border-0 shadow-sm overflow-hidden" style={{ maxWidth: 900, height: 620 }}>
            <iframe
              src={iframeUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Chift Sync Configuration"
            />
          </div>

          <p className="text-muted small mt-2" style={{ maxWidth: 900 }}>
            <i className="bi bi-info-circle me-1" />
            If the iframe is blocked by the target URL's{' '}
            <code>X-Frame-Options</code> or CSP headers, use the "Open in new tab" button as fallback.
          </p>
        </>
      )}
    </div>
  );
}
