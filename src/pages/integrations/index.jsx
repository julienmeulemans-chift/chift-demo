import { useChiftConfig } from '../../contexts/ChiftConfigContext.jsx';

import UnifiedApiGenericMode from './UnifiedApiGenericMode.jsx';
import UnifiedApiPickerMode from './UnifiedApiPickerMode.jsx';
import SyncMarketplaceMode from './SyncMarketplaceMode.jsx';
import SyncApiDrivenMode from './SyncApiDrivenMode.jsx';
import SyncEmbeddedMode from './SyncEmbeddedMode.jsx';

const MODE_LABELS = {
  'unified-api-generic':     'Unified API — Generic',
  'unified-api-picker':      'Unified API — Connector Picker',
  'sync-marketplace':        'Sync — Marketplace',
  'sync-marketplace-oauth2': 'Sync — Marketplace + OAuth2',
  'sync-api':                'Sync — API-driven',
  'sync-embedded':           'Sync — Fully Embedded',
};

export default function Integrations() {
  const { config } = useChiftConfig();

  return (
    <div>
      <div className="d-flex align-items-start justify-content-between mb-4 gap-3 flex-wrap">
        <div>
          <h4 className="fw-semibold mb-1">Integrations</h4>
          <p className="text-muted mb-0">Connect your financial software to {config.appName || 'AcmeCorp'}.</p>
        </div>
        <span className="badge bg-primary bg-opacity-10 text-primary fw-medium px-3 py-2 flex-shrink-0">
          <i className="bi bi-sliders me-1" />
          {MODE_LABELS[config.demoMode] ?? config.demoMode}
        </span>
      </div>

      {config.demoMode === 'unified-api-generic' && <UnifiedApiGenericMode />}

      {config.demoMode === 'unified-api-picker' && <UnifiedApiPickerMode />}

      {(config.demoMode === 'sync-marketplace' || config.demoMode === 'sync-marketplace-oauth2') && (
        <SyncMarketplaceMode isOAuth2={config.demoMode === 'sync-marketplace-oauth2'} />
      )}

      {config.demoMode === 'sync-api' && <SyncApiDrivenMode />}

      {config.demoMode === 'sync-embedded' && <SyncEmbeddedMode />}
    </div>
  );
}
