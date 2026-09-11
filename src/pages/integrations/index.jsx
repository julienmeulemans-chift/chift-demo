import { useChiftConfig } from '../../contexts/ChiftConfigContext.jsx';
import { UNIFIED_API_CONTEXTS } from '../../lib/chiftApi.js';

import UnifiedApiGenericMode       from './UnifiedApiGenericMode.jsx';
import UnifiedApiPickerMode        from './UnifiedApiPickerMode.jsx';
import SyncMarketplaceMode         from './SyncMarketplaceMode.jsx';
import SyncMarketplacePickerMode   from './SyncMarketplacePickerMode.jsx';
import SyncApiDrivenMode           from './SyncApiDrivenMode.jsx';
import SyncApiDrivenPickerMode     from './SyncApiDrivenPickerMode.jsx';

const DEMO_MODES = [
  { value: 'unified-api-generic',     label: 'Unified API — Generic' },
  { value: 'unified-api-picker',      label: 'Unified API — Connector Picker' },
  { value: 'sync-marketplace',        label: 'Marketplace — Generic' },
  { value: 'sync-marketplace-picker', label: 'Marketplace — Connector Picker' },
  { value: 'sync-api',                label: 'Sync — Generic' },
  { value: 'sync-api-picker',         label: 'Sync — Connector Picker' },
];

export default function Integrations() {
  const { config, setConfig } = useChiftConfig();

  // Fall back to the first mode if a removed/unknown mode is stored in localStorage
  const mode = DEMO_MODES.some(m => m.value === config.demoMode)
    ? config.demoMode
    : DEMO_MODES[0].value;

  const isUnifiedApi = mode.startsWith('unified-api');
  const apiCtx = UNIFIED_API_CONTEXTS.find(c => c.value === config.unifiedApiContext)
    ?? UNIFIED_API_CONTEXTS[0];
  const subtitle = isUnifiedApi
    ? `Connect your ${apiCtx.connectorLabel.toLowerCase()} to ${config.appName || 'AcmeCorp'}. (${apiCtx.label})`
    : `Connect your accounting software to ${config.appName || 'AcmeCorp'}. (Accounting)`;

  return (
    <div>
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-semibold mb-1">Integrations</h4>
          <p className="text-muted mb-0">{subtitle}</p>
        </div>
        <select
          className="form-select form-select-sm"
          style={{ width: 'auto', minWidth: 240 }}
          value={mode}
          onChange={e => setConfig({ demoMode: e.target.value })}
        >
          {DEMO_MODES.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {mode === 'unified-api-generic'     && <UnifiedApiGenericMode />}
      {mode === 'unified-api-picker'      && <UnifiedApiPickerMode />}
      {mode === 'sync-marketplace'        && <SyncMarketplaceMode />}
      {mode === 'sync-marketplace-picker' && <SyncMarketplacePickerMode />}
      {mode === 'sync-api'                && <SyncApiDrivenMode />}
      {mode === 'sync-api-picker'         && <SyncApiDrivenPickerMode />}
    </div>
  );
}
