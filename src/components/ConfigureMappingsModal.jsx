import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getToken, buildHeaders } from '../lib/chiftApi.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.items ?? data.results ?? [];
}

// ── SearchableSelect ──────────────────────────────────────────────────────────
// Dropdown is portalled to document.body so it's never clipped by overflow:auto.

function SearchableSelect({ options, value, onChange, placeholder = 'Select…', loading = false }) {
  const [open,      setOpen]      = useState(false);
  const [query,     setQuery]     = useState('');
  const [dropStyle, setDropStyle] = useState({});
  const btnRef  = useRef(null);
  const dropRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        btnRef.current  && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropStyle({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(o => !o);
    setQuery('');
  };

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );
  const selected = options.find(o => o.value === value);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="form-select text-start w-100"
        style={{ cursor: 'pointer', fontWeight: 'normal', fontSize: 13 }}
        onClick={handleToggle}
      >
        {loading
          ? <span className="text-muted">Loading…</span>
          : selected
            ? selected.label
            : <span className="text-muted">{placeholder}</span>}
      </button>

      {open && !loading && createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'fixed', zIndex: 1300,
            ...dropStyle,
            background: '#fff',
            border: '1px solid #dee2e6', borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            maxHeight: 260, display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid #f0f0f0' }}>
            <input
              autoFocus
              className="form-control form-control-sm"
              placeholder="Search…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <div className="text-muted small" style={{ padding: '10px 12px' }}>No results</div>
            )}
            {filtered.map(o => (
              <div
                key={o.value}
                style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                  background: o.value === value ? '#e8f0fe' : 'transparent',
                }}
                onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = '#f8f9fa'; }}
                onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = o.value === value ? '#e8f0fe' : 'transparent'; }}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── MappingRow ────────────────────────────────────────────────────────────────

function MappingRow({ label, description, options, value, onChange, loading }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
      <div style={{ flex: '0 0 160px' }}>
        <div className="small fw-medium">{label}</div>
        {description && <div className="text-muted" style={{ fontSize: 11, marginTop: 1 }}>{description}</div>}
      </div>
      <div style={{ flex: 1 }}>
        <SearchableSelect
          options={options}
          value={value}
          onChange={onChange}
          placeholder="Select…"
          loading={loading}
        />
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function ConfigureMappingsModal({ consumerId, config, apiCtx, connectionId, onClose }) {
  const storageKey = connectionId ? `chift_mappings_${connectionId}` : null;

  const [activeTab, setActiveTab] = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [resources, setResources] = useState({});
  const [mappings,  setMappings]  = useState(() => {
    if (!storageKey) return {};
    try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}'); } catch { return {}; }
  });
  const didRun = useRef(false);

  const isAccounting = apiCtx.api === 'Accounting';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    if (!didRun.current) {
      didRun.current = true;
      fetchResources();
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

  // ── Auto-default helpers ────────────────────────────────────────────────────

  // If a filtered list has exactly 1 option → auto-select it.
  // Otherwise try to find an option whose label loosely contains any of the keywords.
  const pickDefault = (options, keywords = []) => {
    if (!options || options.length === 0) return null;
    if (options.length === 1) return options[0].value;
    if (keywords.length === 0) return null;
    const kws = keywords.map(k => k.toLowerCase());
    const hit = options.find(o => kws.some(kw => o.label.toLowerCase().includes(kw)));
    return hit ? hit.value : null;
  };

  const computeAutoDefaults = (res) => {
    const defaults = {};
    const set = (key, options, keywords = []) => {
      const v = pickDefault(options, keywords);
      if (v != null) defaults[key] = v;
    };

    if (isAccounting) {
      set('journal_sales',    res.journalsSales);
      set('journal_purchase', res.journalsPurchase);
      set('account_physical',          res.accountsIncome);
      set('account_digital',           res.accountsIncome);
      set('account_shipping',          res.accountsIncome,  ['shipping', 'frais', 'transport', 'livraison']);
      set('account_revenue',           res.accountsIncome);
      set('account_expense',           res.accountsExpense);
      set('account_vat_payable',       res.accountsVat,     ['payable', 'due', 'collected', 'output']);
      set('account_vat_recoverable',   res.accountsVat,     ['recoverable', 'deductible', 'input', 'deduc']);
      set('vat_standard', res.vatCodes21);
      set('vat_reduced',  res.vatCodesReduced);
      set('vat_zero',     res.vatCodes0);
      set('vat_21',       res.vatCodes21);
      set('vat_6',        res.vatCodes6);
      set('vat_0',        res.vatCodes0);
    } else {
      // Locations: auto-check if only 1
      if ((res.locations ?? []).length === 1) {
        defaults[`loc_${res.locations[0].id}`] = true;
      }

      // Product categories → buckets (keyword-based)
      const FOOD_KW    = ['food', 'beverage', 'drink', 'boisson', 'repas', 'cuisine', 'nourriture', 'restaurant', 'pizza', 'burger', 'italian', 'italien', 'alcohol', 'alcool', 'bière', 'biere', 'vin', 'wine', 'soft'];
      const RETAIL_KW  = ['retail', 'shop', 'store', 'merchandise', 'goods', 'vente', 'magasin', 'product'];
      (res.productCategories ?? []).forEach(item => {
        const name = (item.name ?? '').toLowerCase();
        if (FOOD_KW.some(kw => name.includes(kw)))       defaults[`cat_${item.id}`] = 'Food & Beverage';
        else if (RETAIL_KW.some(kw => name.includes(kw))) defaults[`cat_${item.id}`] = 'Retail';
        else                                               defaults[`cat_${item.id}`] = 'Other';
      });

      // Payment methods → buckets (keyword-based)
      const CASH_KW = ['cash', 'espece', 'espèce', 'liquide', 'coins', 'monnaie'];
      const CARD_KW = ['card', 'carte', 'visa', 'mastercard', 'credit', 'debit', 'cb', 'bank', 'banque', 'pin', 'tpe'];
      (res.paymentMethods ?? []).forEach(item => {
        const name = (item.name ?? '').toLowerCase();
        if (CASH_KW.some(kw => name.includes(kw)))       defaults[`pay_${item.id}`] = 'Cash';
        else if (CARD_KW.some(kw => name.includes(kw)))  defaults[`pay_${item.id}`] = 'Card';
        else                                               defaults[`pay_${item.id}`] = 'Other';
      });
    }

    return defaults;
  };

  const fetchResources = async () => {
    try {
      const token = await getToken(config);
      const hdrs  = buildHeaders(token, config.accountId);
      const base  = `${config.baseUrl}/consumers/${consumerId}`;
      let newRes;

      if (isAccounting) {
        const toAccounts = (res) => toList(res.data).map(a => ({ value: a.number, label: `${a.number} — ${a.name}` }));
        const [journals, acctIncome, acctExpense, acctVat, vatCodes] = await Promise.all([
          safe(fetch(`${base}/accounting/journals`,                        { headers: hdrs })),
          safe(fetch(`${base}/accounting/chart-of-accounts?type=income`,  { headers: hdrs })),
          safe(fetch(`${base}/accounting/chart-of-accounts?type=expense`, { headers: hdrs })),
          safe(fetch(`${base}/accounting/chart-of-accounts?type=vat`,     { headers: hdrs })),
          safe(fetch(`${base}/accounting/vat-codes`,                       { headers: hdrs })),
        ]);
        const toJournals = (arr) => arr.map(j => ({
          value: j.id,
          label: j.name + (j.journal_type ? ` (${j.journal_type.replace(/_/g, ' ')})` : ''),
        }));
        const allJournals = toList(journals.data);
        const toVat = (arr) => arr.map(v => ({
          value: v.id,
          label: [v.code, v.label, v.rate != null ? `${v.rate}%` : null].filter(Boolean).join(' — '),
        }));
        const allVat = toList(vatCodes.data);
        newRes = {
          journalsSales:    toJournals(allJournals.filter(j => j.journal_type === 'customer_invoice')),
          journalsPurchase: toJournals(allJournals.filter(j => j.journal_type === 'supplier_invoice')),
          journals:         toJournals(allJournals),
          accountsIncome:   toAccounts(acctIncome),
          accountsExpense:  toAccounts(acctExpense),
          accountsVat:      toAccounts(acctVat),
          vatCodes:         toVat(allVat),
          vatCodes21:       toVat(allVat.filter(v => v.rate === 21)),
          vatCodes12:       toVat(allVat.filter(v => v.rate === 12)),
          vatCodes6:        toVat(allVat.filter(v => v.rate === 6)),
          vatCodes0:        toVat(allVat.filter(v => v.rate === 0)),
          vatCodesReduced:  toVat(allVat.filter(v => v.rate != null && v.rate > 0 && v.rate < 21)),
        };
      } else {
        // POS
        const [locations, productCategories, paymentMethods] = await Promise.all([
          safe(fetch(`${base}/pos/locations`,                               { headers: hdrs })),
          safe(fetch(`${base}/pos/product-categories?only_parents=true`,   { headers: hdrs })),
          safe(fetch(`${base}/pos/payment-methods`,                         { headers: hdrs })),
        ]);
        const distinctByName = (arr, limit = 5) => {
          const seen = new Set();
          const out = [];
          for (const item of arr) {
            const key = (item.name ?? '').trim().toLowerCase();
            if (!seen.has(key)) { seen.add(key); out.push(item); }
            if (out.length >= limit) break;
          }
          return out;
        };
        newRes = {
          locations:         toList(locations.data),
          productCategories: distinctByName(toList(productCategories.data)),
          paymentMethods:    distinctByName(toList(paymentMethods.data)),
        };
      }

      setResources(newRes);

      // Apply auto-defaults only for keys not already saved
      const autoDefaults = computeAutoDefaults(newRes);
      setMappings(current => {
        const merged = { ...autoDefaults, ...current }; // saved values win
        if (storageKey) { try { localStorage.setItem(storageKey, JSON.stringify(merged)); } catch {} }
        return merged;
      });
    } catch (err) {
      console.error('Failed to load mapping resources', err);
    } finally {
      setLoading(false);
    }
  };

  const setMapping = (key, val) => setMappings(m => {
    const next = { ...m, [key]: val };
    if (storageKey) { try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {} }
    return next;
  });

  const handleSave = () => {
    if (storageKey) { try { localStorage.setItem(storageKey, JSON.stringify(mappings)); } catch {} }
    onClose();
  };

  const handleReset = () => {
    setMappings({});
    if (storageKey) { try { localStorage.removeItem(storageKey); } catch {} }
  };

  // ── Tab definitions ─────────────────────────────────────────────────────────

  let tabs;

  if (apiCtx.value === 'accounting-from-ecommerce') {
    tabs = [
      {
        label: 'Journal',
        rows: [
          { key: 'journal_sales', label: 'Sales journal', description: 'Customer invoices & orders', optKey: 'journalsSales' },
        ],
      },
      {
        label: 'Revenue accounts',
        rows: [
          { key: 'account_physical',  label: 'Physical goods',  optKey: 'accountsIncome' },
          { key: 'account_digital',   label: 'Digital products', optKey: 'accountsIncome' },
          { key: 'account_shipping',  label: 'Shipping fees',   optKey: 'accountsIncome' },
        ],
      },
      {
        label: 'VAT codes',
        rows: [
          { key: 'vat_standard', label: 'Standard rate', description: '21%',      optKey: 'vatCodes21' },
          { key: 'vat_reduced',  label: 'Reduced rate',  description: '6% / 12%', optKey: 'vatCodesReduced' },
          { key: 'vat_zero',     label: 'Zero rate',     description: '0%',        optKey: 'vatCodes0' },
        ],
      },
    ];

  } else if (apiCtx.value === 'accounting-from-accounting') {
    tabs = [
      {
        label: 'Journals',
        rows: [
          { key: 'journal_sales',    label: 'Sales journal',    description: 'Customer invoices', optKey: 'journalsSales' },
          { key: 'journal_purchase', label: 'Purchase journal', description: 'Supplier invoices', optKey: 'journalsPurchase' },
        ],
      },
      {
        label: 'Ledger accounts',
        rows: [
          { key: 'account_revenue',          label: 'Revenue',          optKey: 'accountsIncome' },
          { key: 'account_expense',          label: 'Expense',          optKey: 'accountsExpense' },
          { key: 'account_vat_payable',      label: 'VAT payable',      optKey: 'accountsVat' },
          { key: 'account_vat_recoverable',  label: 'VAT recoverable',  optKey: 'accountsVat' },
        ],
      },
      {
        label: 'VAT codes',
        rows: [
          { key: 'vat_21', label: '21%', description: 'Standard rate', optKey: 'vatCodes21' },
          { key: 'vat_6',  label: '6%',  description: 'Reduced rate',  optKey: 'vatCodes6' },
          { key: 'vat_0',  label: '0%',  description: 'Exempt',        optKey: 'vatCodes0' },
        ],
      },
    ];

  } else {
    // POS
    tabs = [
      { label: 'Product categories', type: 'pos-mapping', itemsKey: 'productCategories', buckets: ['Food & Beverage', 'Retail', 'Other'], keyPrefix: 'cat_' },
      { label: 'Payment methods',   type: 'pos-mapping', itemsKey: 'paymentMethods',    buckets: ['Cash', 'Card', 'Other'],               keyPrefix: 'pay_' },
    ];
  }

  // ── Tab content renderer ────────────────────────────────────────────────────

  const renderContent = () => {
    if (loading) {
      return (
        <div className="d-flex align-items-center gap-3 py-4">
          <div className="spinner-border spinner-border-sm text-primary" role="status" />
          <span className="text-muted small">Loading connector data…</span>
        </div>
      );
    }

    const tab = tabs[activeTab];

    // Standard rows (accounting)
    if (tab.rows) {
      return tab.rows.map(row => (
        <MappingRow
          key={row.key}
          label={row.label}
          description={row.description}
          options={resources[row.optKey] ?? []}
          value={mappings[row.key] ?? ''}
          onChange={val => setMapping(row.key, val)}
          loading={loading}
        />
      ));
    }

    // POS: location checkboxes
    if (tab.type === 'location-select') {
      const locs = resources.locations ?? [];
      return (
        <>
          <div className="text-muted small mb-3">Select the locations your tool will track.</div>
          {locs.length === 0 && <div className="text-muted small">No locations found.</div>}
          {locs.map(loc => {
            const addr = typeof loc.address === 'object' && loc.address !== null ? loc.address : null;
            const city = addr ? [addr.postal_code, addr.city, addr.country].filter(Boolean).join(' ') : null;
            return (
              <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  className="form-check-input flex-shrink-0"
                  checked={!!(mappings[`loc_${loc.id}`])}
                  onChange={e => setMapping(`loc_${loc.id}`, e.target.checked)}
                  style={{ marginTop: 0 }}
                />
                <div>
                  <div className="small fw-medium">{loc.name}</div>
                  {city && <div className="text-muted" style={{ fontSize: 11 }}>{city}</div>}
                </div>
              </label>
            );
          })}
        </>
      );
    }

    // POS: API items → fixed internal buckets
    if (tab.type === 'pos-mapping') {
      const items       = resources[tab.itemsKey] ?? [];
      const bucketOpts  = tab.buckets.map(b => ({ value: b, label: b }));
      return (
        <>
          {items.length === 0 && <div className="text-muted small">No items found.</div>}
          {items.map(item => (
            <MappingRow
              key={item.id}
              label={item.name}
              options={bucketOpts}
              value={mappings[`${tab.keyPrefix}${item.id}`] ?? ''}
              onChange={val => setMapping(`${tab.keyPrefix}${item.id}`, val)}
              loading={false}
            />
          ))}
        </>
      );
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return createPortal(
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(0,0,0,0.45)' }} />

      {/* Dialog */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1055, width: '100%', maxWidth: 580, padding: '0 16px',
      }}>
        <div className="rounded-3 shadow-lg" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.15)' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #dee2e6' }}>
            <h5 style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>Configure Mappings</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          {/* Tabs */}
          <div style={{ padding: '0 20px', borderBottom: '1px solid #dee2e6' }}>
            <div style={{ display: 'flex' }}>
              {tabs.map((tab, i) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  style={{
                    padding: '10px 16px', border: 'none', background: 'none',
                    cursor: 'pointer', fontSize: 13,
                    fontWeight: activeTab === i ? 600 : 400,
                    color: activeTab === i ? '#0d6efd' : '#6c757d',
                    borderBottom: activeTab === i ? '2px solid #0d6efd' : '2px solid transparent',
                    marginBottom: -1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '4px 20px 8px', height: 360, overflowY: 'auto' }}>
            {renderContent()}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '12px 20px', borderTop: '1px solid #dee2e6' }}>
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleReset} disabled={loading}>
              Reset mappings
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
