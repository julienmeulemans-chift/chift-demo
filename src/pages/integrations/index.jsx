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
  'sync-api':                'Sync — API-driven',
  'sync-embedded':           'Sync — Fully Embedded',
};

export default function Integrations() {
  const { config } = useChiftConfig();

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-semibold mb-1">Integrations</h4>
        <p className="text-muted mb-0">Connect your accounting software to {config.appName || 'AcmeCorp'}.</p>
      </div>

      {config.demoMode === 'unified-api-generic' && <UnifiedApiGenericMode />}

      {config.demoMode === 'unified-api-picker' && <UnifiedApiPickerMode />}

      {config.demoMode === 'sync-marketplace' && <SyncMarketplaceMode />}

      {config.demoMode === 'sync-api' && <SyncApiDrivenMode />}

      {config.demoMode === 'sync-embedded' && <SyncEmbeddedMode />}
    </div>
  );
}
