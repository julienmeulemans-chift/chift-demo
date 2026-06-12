import { useChiftConfig } from '../../contexts/ChiftConfigContext.jsx';

import UnifiedApiGenericMode from './UnifiedApiGenericMode.jsx';
import UnifiedApiPickerMode from './UnifiedApiPickerMode.jsx';
import SyncMarketplaceMode from './SyncMarketplaceMode.jsx';
import SyncMarketplacePickerMode from './SyncMarketplacePickerMode.jsx';
import SyncApiDrivenMode from './SyncApiDrivenMode.jsx';
import SyncApiDrivenPickerMode from './SyncApiDrivenPickerMode.jsx';
import SyncEmbeddedMode from './SyncEmbeddedMode.jsx';

const MODE_LABELS = {
  'unified-api-generic':     'Unified API — Generic',
  'unified-api-picker':      'Unified API — Connector Picker',
  'sync-marketplace':        'Marketplace — Generic',
  'sync-marketplace-picker': 'Marketplace — Connector Picker',
  'sync-api':                'Sync — API-driven',
  'sync-api-picker':         'Sync — API-driven + Connector Picker',
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

      {config.demoMode === 'sync-marketplace-picker' && <SyncMarketplacePickerMode />}

      {config.demoMode === 'sync-api' && <SyncApiDrivenMode />}

      {config.demoMode === 'sync-api-picker' && <SyncApiDrivenPickerMode />}

      {config.demoMode === 'sync-embedded' && <SyncEmbeddedMode />}
    </div>
  );
}
