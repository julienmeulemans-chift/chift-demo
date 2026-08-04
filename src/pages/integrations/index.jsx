import { useChiftConfig } from '../../contexts/ChiftConfigContext.jsx';

import UnifiedApiGenericMode       from './UnifiedApiGenericMode.jsx';
import UnifiedApiPickerMode        from './UnifiedApiPickerMode.jsx';
import SyncMarketplaceMode         from './SyncMarketplaceMode.jsx';
import SyncMarketplacePickerMode   from './SyncMarketplacePickerMode.jsx';
import SyncApiDrivenMode           from './SyncApiDrivenMode.jsx';
import SyncApiDrivenPickerMode     from './SyncApiDrivenPickerMode.jsx';
import SyncEmbeddedMode            from './SyncEmbeddedMode.jsx';

const DEMO_MODES = [
  { value: 'unified-api-generic',     label: 'Unified API — Generic' },
  { value: 'unified-api-picker',      label: 'Unified API — Connector Picker' },
  { value: 'sync-marketplace',        label: 'Marketplace — Generic' },
  { value: 'sync-marketplace-picker', label: 'Marketplace — Connector Picker' },
  { value: 'sync-api',                label: 'Sync — Generic' },
  { value: 'sync-api-picker',         label: 'Sync — Connector Picker' },
  { value: 'sync-embedded',           label: 'Sync — Fully Embedded' },
];

export default function Integrations() {
  const { config, setConfig } = useChiftConfig();

  return (
    <div>
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-semibold mb-1">Integrations</h4>
          <p className="text-muted mb-0">Connect your accounting software to {config.appName || 'AcmeCorp'}.</p>
        </div>
        <select
          className="form-select form-select-sm"
          style={{ width: 'auto', minWidth: 240 }}
          value={config.demoMode}
          onChange={e => setConfig({ demoMode: e.target.value })}
        >
          {DEMO_MODES.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {config.demoMode === 'unified-api-generic'     && <UnifiedApiGenericMode />}
      {config.demoMode === 'unified-api-picker'      && <UnifiedApiPickerMode />}
      {config.demoMode === 'sync-marketplace'        && <SyncMarketplaceMode />}
      {config.demoMode === 'sync-marketplace-picker' && <SyncMarketplacePickerMode />}
      {config.demoMode === 'sync-api'                && <SyncApiDrivenMode />}
      {config.demoMode === 'sync-api-picker'         && <SyncApiDrivenPickerMode />}
      {config.demoMode === 'sync-embedded'           && <SyncEmbeddedMode />}
    </div>
  );
}
