import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useChiftConfig } from '../contexts/ChiftConfigContext.jsx';

const NAV_ITEMS = [
  { path: '/',            label: 'Dashboard',    icon: 'bi-speedometer2'  },
  { path: '/analytics',  label: 'Analytics',    icon: 'bi-bar-chart-line' },
  { path: '/customers',  label: 'Customers',    icon: 'bi-people'         },
  { path: '/integrations', label: 'Integrations', icon: 'bi-plug-fill'   },
  { path: '/settings',   label: 'Settings',     icon: 'bi-gear'           },
];

export default function Layout({ children }) {
  const navigate        = useNavigate();
  const { config }      = useChiftConfig();
  const appName         = config.appName || 'AcmeCorp';

  useEffect(() => { document.title = appName; }, [appName]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ── Top navbar ─────────────────────────────────────────────── */}
      <nav
        className="navbar navbar-light bg-white border-bottom shadow-sm px-4"
        style={{ height: 60, flexShrink: 0 }}
      >
        <button
          className="navbar-brand mb-0 h5 fw-bold text-primary d-flex align-items-center gap-2 border-0 bg-transparent p-0"
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
        >
          <div
            className="rounded d-flex align-items-center justify-content-center"
            style={{
              width: 30,
              height: 30,
              background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
            }}
          >
            <i className="bi bi-grid-fill text-white" style={{ fontSize: 14 }} />
          </div>
          {appName}
        </button>

        <div className="ms-auto d-flex align-items-center gap-3">
          <span className="text-muted small d-none d-md-inline">John Doe</span>
          <div
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-semibold"
            style={{ width: 36, height: 36, fontSize: 13, flexShrink: 0 }}
          >
            JD
          </div>
        </div>
      </nav>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="d-flex flex-grow-1" style={{ overflow: 'hidden' }}>
        {/* Sidebar */}
        <nav
          className="bg-white border-end d-flex flex-column pt-3"
          style={{ width: 220, flexShrink: 0, overflowY: 'auto' }}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                'nav-link-sidebar d-flex align-items-center gap-2 px-4 py-2 text-decoration-none ' +
                (isActive
                  ? 'text-primary fw-semibold bg-primary bg-opacity-10 border-start border-primary border-3'
                  : 'text-secondary border-start border-transparent border-3')
              }
              style={{ fontSize: 14 }}
            >
              <i className={`bi ${item.icon}`} style={{ fontSize: 16, width: 18 }} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Main content */}
        <main
          className="flex-grow-1 p-4 bg-white overflow-auto"
          style={{ maxHeight: 'calc(100vh - 60px)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
