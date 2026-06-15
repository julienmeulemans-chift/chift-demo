import { useState } from 'react';
import { useChiftConfig } from '../../contexts/ChiftConfigContext.jsx';

export default function SyncMarketplaceMode() {
  const { config }              = useChiftConfig();
  const [techOpen, setTechOpen] = useState(false);

  const marketplaceUrl = config.marketplaceSlug
    ? `https://marketplaces.chift.app/en/${config.marketplaceSlug}`
    : null;

  const title = 'Marketplace — Generic';
  const badge = '⭐ Minimal effort';
  const description = 'Redirect to a Chift-hosted Marketplace. User must create a Chift account.';

  return (
    <div style={{ maxWidth: 680 }}>
      {!config.marketplaceSlug && (
        <div className="alert alert-warning d-flex gap-2 align-items-center mb-4">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
          <span>Marketplace slug not set. <a href="/settings" className="alert-link">Go to Settings</a>.</span>
        </div>
      )}

      <div className="card border-0 shadow-sm" style={{ background: 'rgba(13, 110, 253, 0.04)' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            <div className="rounded-3 bg-light d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 56, height: 56 }}>
              <i className="bi bi-shop text-primary" style={{ fontSize: 26 }} />
            </div>
            <div>
              <h6 className="mb-0 fw-semibold">Set up your accounting synchronization</h6>
              <div className="text-muted small">Connect your accounting software to automatically synchronize your data</div>
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            disabled={!marketplaceUrl}
            onClick={() => window.open(marketplaceUrl, '_blank', 'noopener,noreferrer')}
          >
            <i className="bi bi-box-arrow-up-right me-2" />
            Open external marketplace
          </button>
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
              <strong>{title}</strong>
              <span className="badge bg-secondary bg-opacity-10 text-secondary fw-normal" style={{ fontSize: 11 }}>{badge}</span>
            </div>
            {description}
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
              Technical details
            </div>
            <p className="text-muted small mb-2">The end-user will:</p>
            <ol className="small text-muted mb-3 ps-4">
              <li>Create a Chift account (Google or magic link)</li>
              <li>Connect their accounting software</li>
              <li>Configure the sync (journal mappings, VAT accounts, etc.)</li>
              <li>Manage and monitor all their connections from the Marketplace</li>
            </ol>
            <p className="text-muted small fst-italic mb-2">
              No callback or consumer ID is sent back to this app — connection status is only
              visible in the Chift back-office.
            </p>
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
    </div>
  );
}
