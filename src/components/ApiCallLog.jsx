import { useState, useRef, useEffect } from 'react';

const METHOD_STYLE = {
  GET:    { background: '#e8f4ff', color: '#1a5fa8' },
  POST:   { background: '#e8fff0', color: '#1a6e3c' },
  PATCH:  { background: '#fff8e8', color: '#a85020' },
  DELETE: { background: '#ffe8e8', color: '#a81a1a' },
};

function CallRow({ call }) {
  const [open, setOpen] = useState(false);
  const badge = METHOD_STYLE[call.method] ?? { background: '#f0f0f0', color: '#555' };

  return (
    <div className="border-bottom">
      {/* Header row */}
      <div
        className="d-flex align-items-center gap-2 px-3 py-2"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)}
      >
        {/* Status indicator */}
        <span className="flex-shrink-0" style={{ width: 16, display: 'flex', alignItems: 'center' }}>
          {call.status === 'pending' && (
            <div className="spinner-border text-warning" role="status"
              style={{ width: 13, height: 13, borderWidth: '2px' }} />
          )}
          {call.status === 'success' && <i className="bi bi-check-circle-fill text-success" style={{ fontSize: 13 }} />}
          {call.status === 'error'   && <i className="bi bi-x-circle-fill text-danger"   style={{ fontSize: 13 }} />}
        </span>

        {/* Method badge */}
        <span className="fw-semibold rounded flex-shrink-0"
          style={{ ...badge, fontSize: 10, padding: '1px 5px', letterSpacing: '0.04em' }}>
          {call.method}
        </span>

        {/* Endpoint — clicking opens API docs, row click toggles body */}
        <a
          href={call.docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-monospace flex-grow-1 text-body text-decoration-none"
          style={{ fontSize: 12 }}
          title="Open API reference"
          onClick={e => e.stopPropagation()}
        >
          {call.endpoint}
        </a>

        <i className={`bi bi-chevron-${open ? 'up' : 'down'} text-muted flex-shrink-0`} style={{ fontSize: 11 }} />
      </div>

      {/* Expanded body */}
      {open && (
        <div className="px-3 pb-3 pt-1" style={{ background: 'rgba(0,0,0,0.015)' }}>
          {call.requestBody != null && (
            <div className="mb-2">
              <div className="text-muted mb-1" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Request body
              </div>
              <pre className="rounded p-2 mb-0"
                style={{ background: '#f8f9fa', maxHeight: 180, overflow: 'auto', fontSize: 11, margin: 0 }}>
                {JSON.stringify(call.requestBody, null, 2)}
              </pre>
            </div>
          )}

          {call.status === 'success' && call.responseData != null && (
            <div>
              <div className="text-muted mb-1" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Response
              </div>
              <pre className="rounded p-2 mb-0"
                style={{ background: '#f0fff4', maxHeight: 200, overflow: 'auto', fontSize: 11, margin: 0 }}>
                {JSON.stringify(call.responseData, null, 2)}
              </pre>
            </div>
          )}

          {call.status === 'error' && call.errorMsg && (
            <div className="text-danger" style={{ fontSize: 12 }}>{call.errorMsg}</div>
          )}
        </div>
      )}
    </div>
  );
}

export function ApiCallLog({ calls, onClear }) {
  // Show the box once at least one call has ever been logged (survives clearing)
  const everHadCalls = useRef(false);
  useEffect(() => { if (calls && calls.length > 0) everHadCalls.current = true; }, [calls]);

  if (!calls || (!everHadCalls.current && calls.length === 0)) return null;

  return (
    <div className="border rounded-3 mt-4 overflow-hidden">
      <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom"
        style={{ background: 'rgba(0,0,0,0.02)' }}>
        <span className="fw-semibold text-muted"
          style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          API Calls
        </span>
        {onClear && (
          <button type="button" className="btn p-0 text-muted lh-1" onClick={onClear} title="Clear log"
            style={{ fontSize: 18, lineHeight: 1 }}>
            <i className="bi bi-x" />
          </button>
        )}
      </div>
      {calls.length === 0 ? (
        <div className="px-3 py-3 text-muted" style={{ fontSize: 12 }}>No calls yet.</div>
      ) : (
        calls.map(call => <CallRow key={call.id} call={call} />)
      )}
    </div>
  );
}
