import { useNavigate } from 'react-router-dom';

const KPIS = [
  { label: 'Total Revenue',     value: '€124,300', trend: '+12%', icon: 'bi-currency-euro',  color: 'primary' },
  { label: 'Orders',            value: '1,842',    trend: '+8%',  icon: 'bi-bag-check',       color: 'success' },
  { label: 'Active Customers',  value: '3,216',    trend: '+5%',  icon: 'bi-people',           color: 'info'    },
  { label: 'Growth',            value: '18.4%',    trend: '+2.1pp', icon: 'bi-graph-up-arrow', color: 'warning' },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h4 className="fw-semibold mb-1">Welcome back, John 👋</h4>
        <p className="text-muted mb-0">Here's what's happening with your business today.</p>
      </div>

      {/* KPI cards */}
      <div className="row g-3 mb-4">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <div className={`bg-${kpi.color} bg-opacity-10 rounded p-3`}>
                  <i className={`bi ${kpi.icon} text-${kpi.color}`} style={{ fontSize: 22 }} />
                </div>
                <div>
                  <div className="text-muted small">{kpi.label}</div>
                  <div className="fw-bold fs-5">{kpi.value}</div>
                  <div className="text-success small">{kpi.trend} this month</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Integrations CTA */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4 d-flex align-items-start gap-3">
          <div className="bg-primary bg-opacity-10 rounded p-3 flex-shrink-0">
            <i className="bi bi-plug-fill text-primary" style={{ fontSize: 24 }} />
          </div>
          <div>
            <h6 className="fw-semibold mb-1">Accounting Integrations</h6>
            <p className="text-muted small mb-3">
              Connect your accounting software to automatically sync your accounting data.
              Head to the <strong>Integrations</strong> page to get started.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/integrations')}>
              Set up integrations <i className="bi bi-arrow-right ms-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
