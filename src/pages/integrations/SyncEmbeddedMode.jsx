import { useState } from 'react';
import { useChiftConfig } from '../../contexts/ChiftConfigContext.jsx';

export default function SyncEmbeddedMode() {
  const { config }              = useChiftConfig();
  const [techOpen, setTechOpen] = useState(false);

  const isConfigured = !!(config.syncId && config.accountId && config.envId);

  const iframeUrl = isConfigured
    ? `https://www.chift.app/oauth2/syncs/${config.syncId}/accounts/${config.accountId}/envs/${config.envId}`
    : null;

  return (
    <div>
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

          <div className="card border-0 shadow-sm overflow-hidden" style={{ maxWidth: 900, height: 620, background: 'rgba(13, 110, 253, 0.04)' }}>
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

      {/* Info banner — collapsible technical details */}
      <div className="alert alert-light border mt-4" style={{ maxWidth: 680, padding: 0, overflow: 'hidden' }}>
        <div
          className="d-flex gap-3 align-items-start"
          style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setTechOpen((o) => !o)}
        >
          <i className="bi bi-info-circle-fill text-primary mt-1 flex-shrink-0" />
          <div className="small flex-grow-1">
            <strong>Sync — Fully Embedded</strong><br />
            The entire sync activation flow is embedded directly in your app. No Chift branding is
            visible to the end-user. Requires OpenID Connect on your OAuth2.
          </div>
          <i className={`bi bi-chevron-${techOpen ? 'up' : 'down'} text-muted flex-shrink-0 mt-1`} style={{ fontSize: 13 }} />
        </div>
        {techOpen && (
          <div className="border-top px-4 py-3" style={{ background: 'rgba(0,0,0,0.02)' }}>
            <div className="small fw-medium text-muted mb-2" style={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11 }}>
              Technical details
            </div>
            <div className="d-flex flex-column gap-2 small text-muted mb-0">
              <div>The app renders an <code>&lt;iframe&gt;</code> pointing to the Chift sync URL.</div>
              <div>The user authenticates via your OAuth2 (OpenID Connect) — no redirect needed.</div>
            </div>
            {iframeUrl && (
              <div className="p-3 bg-white rounded border mt-3">
                <div className="text-muted small mb-1">iframe src</div>
                <code className="small text-break">{iframeUrl}</code>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
