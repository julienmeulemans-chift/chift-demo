import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getToken, buildHeaders, extractCount } from '../lib/chiftApi.js';

function Row({ label, value, error }) {
  return (
    <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
      <span className="text-muted small">{label}</span>
      <span className="fw-semibold small font-monospace">
        {error
          ? <span className="text-danger small fw-normal">{error}</span>
          : value === null
            ? <span className="text-muted">—</span>
            : typeof value === 'number'
              ? value.toLocaleString()
              : value}
      </span>
    </div>
  );
}

function DetailCard({ title, children, raw }) {
  return (
    <div className="rounded-3 p-3 mt-3" style={{ background: '#f8f9fa' }}>
      <div className="text-muted mb-2" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
        {title}
      </div>
      {children}
      {raw && <pre className="mb-0 small" style={{ fontSize: 11 }}>{JSON.stringify(raw, null, 2)}</pre>}
    </div>
  );
}

function FolderCard({ folder, total }) {
  if (!folder) return null;
  const name   = folder.name ?? folder.folderName ?? folder.company_name ?? null;
  const ref    = folder.reference ?? folder.folder_reference ?? folder.code ?? null;
  const vat    = folder.vat_number ?? folder.vatNumber ?? folder.vat ?? null;
  const period = folder.period ?? folder.fiscal_year ?? folder.fiscalYear ?? null;
  const hasFields = name || ref || vat || period;
  return (
    <DetailCard title={total === 1 ? 'Folder' : `First folder (of ${total})`} raw={!hasFields ? folder : null}>
      {name   && <div className="fw-semibold small">{name}</div>}
      {ref    && <div className="text-muted small font-monospace">Ref: {ref}</div>}
      {vat    && <div className="text-muted small font-monospace">VAT: {vat}</div>}
      {period && <div className="text-muted small font-monospace">Period: {period}</div>}
    </DetailCard>
  );
}

function LocationCard({ location, total }) {
  if (!location) return null;
  const name = location.name ?? location.location_name ?? null;
  const id   = location.locationid ?? location.location_id ?? location.id ?? null;

  // address may be a nested object {street, number, city, postal_code, country, …}
  const addrObj  = typeof location.address === 'object' && location.address !== null ? location.address : null;
  const street   = addrObj ? [addrObj.street, addrObj.number, addrObj.box].filter(Boolean).join(' ') : (location.street ?? null);
  const city     = addrObj ? [addrObj.postal_code, addrObj.city].filter(Boolean).join(' ') : (location.city ?? null);
  const country  = addrObj?.country ?? null;

  const hasFields = name || id || street || city;
  return (
    <DetailCard title={total === 1 ? 'Location' : `First location (of ${total})`} raw={!hasFields ? location : null}>
      {name    && <div className="fw-semibold small">{name}</div>}
      {id      && <div className="text-muted small font-monospace">ID: {id}</div>}
      {street  && <div className="text-muted small font-monospace">{street}</div>}
      {city    && <div className="text-muted small font-monospace">{city}{country ? `, ${country}` : ''}</div>}
    </DetailCard>
  );
}

export function TestConnectionModal({ consumerId, config, apiType, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [data,    setData]    = useState(null);
  const didRun = useRef(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    if (!didRun.current) {
      didRun.current = true;
      runTests();
    }
    return () => { document.body.style.overflow = ''; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const safe = async (promise) => {
    try {
      const res = await promise;
      if (!res.ok) return { error: `HTTP ${res.status}`, data: null };
      const json = await res.json().catch(() => null);
      return { error: null, data: json };
    } catch (e) {
      return { error: e.message, data: null };
    }
  };

  const runTests = async () => {
    try {
      const token = await getToken(config);
      const hdrs  = buildHeaders(token, config.accountId);
      const base  = `${config.baseUrl}/consumers/${consumerId}`;

      if (apiType === 'Accounting') {
        const [clients, ledger, folders] = await Promise.all([
          safe(fetch(`${base}/accounting/clients`,        { headers: hdrs })),
          safe(fetch(`${base}/accounting/chart-of-accounts`, { headers: hdrs })),
          safe(fetch(`${base}/accounting/folders`,        { headers: hdrs })),
        ]);
        const folderList = folders.data
          ? (Array.isArray(folders.data) ? folders.data : (folders.data.items ?? folders.data.results ?? []))
          : [];
        setData({
          type:        'accounting',
          clientCount: clients.error  ? null : extractCount(clients.data),
          clientError: clients.error,
          ledgerCount: ledger.error   ? null : extractCount(ledger.data),
          ledgerError: ledger.error,
          folderCount: folderList.length,
          folderError: folders.error,
          firstFolder: folderList[0] ?? null,
        });
      } else {
        // Point of Sale — orders scoped to last 7 days
        const toDate   = new Date();
        const fromDate = new Date(toDate);
        fromDate.setDate(fromDate.getDate() - 7);
        const fmt = (d) => d.toISOString().slice(0, 10);
        const ordersUrl = `${base}/pos/orders?date_from=${fmt(fromDate)}&date_to=${fmt(toDate)}&state=all`;

        const [products, orders, locations] = await Promise.all([
          safe(fetch(`${base}/pos/products`,  { headers: hdrs })),
          safe(fetch(ordersUrl,               { headers: hdrs })),
          safe(fetch(`${base}/pos/locations`, { headers: hdrs })),
        ]);
        const locationList = locations.data
          ? (Array.isArray(locations.data) ? locations.data : (locations.data.items ?? locations.data.results ?? []))
          : [];
        setData({
          type:           'pos',
          productCount:   products.error  ? null : extractCount(products.data),
          productError:   products.error,
          orderCount:     orders.error    ? null : extractCount(orders.data),
          orderError:     orders.error,
          locationCount:  locations.error ? null : locationList.length,
          locationError:  locations.error,
          firstLocation:  locationList[0] ?? null,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(0,0,0,0.45)' }}
      />
      {/* Dialog */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1055, width: '100%', maxWidth: 480, padding: '0 16px',
      }}>
        <div className="rounded-3 shadow-lg" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.15)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #dee2e6' }}>
            <h5 style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>Test Connection</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          {/* Body */}
          <div style={{ padding: '20px' }}>
            {loading && (
              <div className="d-flex align-items-center gap-3 py-2">
                <div className="spinner-border spinner-border-sm text-primary" role="status" />
                <span className="text-muted small">Fetching data from the connector…</span>
              </div>
            )}
            {error && (
              <div className="alert alert-danger small mb-0">{error}</div>
            )}
            {data?.type === 'accounting' && (
              <>
                <Row label="Clients"         value={data.clientCount} error={data.clientError} />
                <Row label="Ledger accounts" value={data.ledgerCount} error={data.ledgerError} />
                <Row label="Number of folders" value={data.folderError ? null : data.folderCount} error={data.folderError} />
                <FolderCard folder={data.firstFolder} total={data.folderCount} />
              </>
            )}
            {data?.type === 'pos' && (
              <>
                <Row label="Products"            value={data.productCount}  error={data.productError} />
                <Row label="Orders (last 7 days)" value={data.orderCount}   error={data.orderError} />
                <Row label="Locations"            value={data.locationCount} error={data.locationError} />
                <LocationCard location={data.firstLocation} total={data.locationCount} />
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid #dee2e6' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
