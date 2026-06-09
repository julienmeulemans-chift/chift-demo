import { useState } from 'react';
import { useChiftConfig } from '../../contexts/ChiftConfigContext.jsx';

export default function SyncMarketplaceMode({ isOAuth2 }) {
  const { config }   = useChiftConfig();
  const [techOpen, setTechOpen] = useState(false);

  const base = config.marketplaceSlug
    ? `https://marketplaces.chift.app/en/${config.marketplaceSlug}`
    : null;

  const marketplaceUrl = base
    ? config.syncIntegrationId
      ? `${base}/apps/${config.syncIntegrationId}`
      : base
    : null;

  const title = isOAuth2 ? 'Sync — Option 2: Marketplace + OAuth2' : 'Sync — Option 1: Marketplace';
  const description = isOAuth2
    ? 'The user is redirected to the Chift-hosted Marketplace and logs in via your OAuth2 — no Chift account required.'
    : 'The user is redirected to the Chift-hosted Marketplace and must create a Chift account to proceed.';

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
            <strong>{title}</strong><br />
            {description}
          </div>
          <i className={`bi bi-chevron-${techOpen ? 'up' : 'down'} text-muted flex-shrink-0 mt-1`} style={{ fontSize: 13 }} />
        </div>

        {techOpen && (
          <div className="border-top px-4 py-3" style={{ background: 'rgba(0,0,0,0.02)' }}>
            <div className="small fw-medium text-muted mb-2" style={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11 }}>
              Technical details
            </div>
            <p className="text-muted small mb-2">The end-user will:</p>
            <ol className="small text-muted mb-3 ps-4">
              {!isOAuth2 && <li>Create a Chift account (Google or magic link)</li>}
              {isOAuth2  && <li>Authenticate via your OAuth2 (no Chift account needed)</li>}
              <li>Connect their accounting / financial software</li>
              <li>Configure the sync (journal mappings, VAT accounts, etc.)</li>
              <li>Manage and monitor all their connections from the Marketplace</li>
            </ol>
            {marketplaceUrl ? (
              <div className="p-3 bg-white rounded border mb-0">
                <div className="text-muted small mb-1">URL</div>
                <code className="small text-break">{marketplaceUrl}</code>
              </div>
            ) : (
              <div className="text-muted small fst-italic">
                URL will appear here once the marketplace slug is configured in Settings.
              </div>
            )}
          </div>
        )}
      </div>

      {!config.marketplaceSlug && (
        <div className="alert alert-warning d-flex gap-2 align-items-center mb-4">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
          <span>Marketplace slug not set. <a href="/settings" className="alert-link">Go to Settings</a>.</span>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            <div className="rounded-3 bg-light d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 56, height: 56 }}>
              <i className="bi bi-shop text-primary" style={{ fontSize: 26 }} />
            </div>
            <div>
              <h6 className="mb-0 fw-semibold">Chift Marketplace</h6>
              <div className="text-muted small">Hosted integration portal</div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            disabled={!marketplaceUrl}
            onClick={() => window.open(marketplaceUrl, '_blank', 'noopener,noreferrer')}
          >
            <i className="bi bi-box-arrow-up-right me-2" />
            {config.syncIntegrationId ? 'Open connector page' : 'Open Marketplace'}
          </button>
        </div>
      </div>

      <div className="card border-0 bg-light">
        <div className="card-body py-3 px-4 small text-muted">
          <i className="bi bi-info-circle me-1" />
          After the user completes the setup, their connection appears as <strong>Active</strong> in
          the Chift back-office. No callback is sent back to this app in Marketplace mode.
        </div>
      </div>
    </div>
  );
}
