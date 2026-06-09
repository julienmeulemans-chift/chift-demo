export default function Analytics() {
  return (
    <div>
      <h4 className="fw-semibold mb-1">Analytics</h4>
      <p className="text-muted mb-4">Detailed analytics and reports.</p>
      <div className="card border-0 shadow-sm" style={{ height: 320 }}>
        <div className="card-body d-flex align-items-center justify-content-center text-muted">
          <div className="text-center">
            <i className="bi bi-bar-chart-line" style={{ fontSize: 56, opacity: 0.2 }} />
            <div className="mt-3 fw-medium">Charts coming soon</div>
            <div className="small">Connect your financial data via the Integrations page first.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
