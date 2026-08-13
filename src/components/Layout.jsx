import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useChiftConfig } from '../contexts/ChiftConfigContext.jsx';

const NAV_ITEMS = [
  { path: '/',             label: 'Dashboard',    icon: 'bi-speedometer2'   },
  { path: '/analytics',   label: 'Analytics',    icon: 'bi-bar-chart-line'  },
  { path: '/customers',   label: 'Customers',    icon: 'bi-people'          },
  { path: '/integrations',label: 'Integrations', icon: 'bi-plug-fill'       },
  { path: '/settings',    label: 'Settings',     icon: 'bi-gear'            },
];

function SidebarNav({ onNavigate }) {
  return (
    <nav className="d-flex flex-column pt-3 h-100">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            'd-flex align-items-center gap-2 px-4 py-2 text-decoration-none ' +
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
  );
}

export default function Layout({ children }) {
  const navigate       = useNavigate();
  const location       = useLocation();
  const { config }     = useChiftConfig();
  const appName        = config.appName || 'AcmeCorp';
  const appLogo        = config.appLogo || '';
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { document.title = appName; }, [appName]);

  // Close drawer on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── Top navbar ─────────────────────────────────────────────── */}
      <nav
        className="navbar navbar-light bg-white border-bottom shadow-sm px-3 px-md-4"
        style={{ height: 60, flexShrink: 0 }}
      >
        {/* Hamburger — mobile only */}
        <button
          className="btn btn-light d-lg-none me-2 p-1"
          style={{ lineHeight: 1 }}
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <i className="bi bi-list" style={{ fontSize: 22 }} />
        </button>

        {/* Brand */}
        <button
          className="navbar-brand mb-0 h5 fw-bold text-primary d-flex align-items-center gap-2 border-0 bg-transparent p-0"
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
        >
          <div
            className="rounded d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: 30, height: 30, overflow: 'hidden',
              background: appLogo ? 'transparent' : 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
            }}
          >
            {appLogo
              ? <img src={appLogo} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              : <i className="bi bi-grid-fill text-white" style={{ fontSize: 14 }} />}
          </div>
          {appName}
        </button>

        {/* User avatar */}
        <div className="ms-auto d-flex align-items-center gap-3">
          <span className="text-muted small d-none d-md-inline">John Doe</span>
          <div
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-semibold flex-shrink-0"
            style={{ width: 36, height: 36, fontSize: 13 }}
          >
            JD
          </div>
        </div>
      </nav>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="d-flex flex-grow-1" style={{ overflow: 'hidden' }}>

        {/* Desktop sidebar — hidden on mobile */}
        <aside
          className="bg-white border-end d-none d-lg-block"
          style={{ width: 220, flexShrink: 0, overflowY: 'auto' }}
        >
          <SidebarNav />
        </aside>

        {/* Mobile offcanvas backdrop */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1040,
              background: 'rgba(0,0,0,0.4)',
            }}
          />
        )}

        {/* Mobile offcanvas drawer */}
        <div
          style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 1045,
            width: 260,
            background: '#fff',
            transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease',
            display: 'flex', flexDirection: 'column',
            boxShadow: menuOpen ? '4px 0 20px rgba(0,0,0,0.15)' : 'none',
          }}
        >
          {/* Drawer header */}
          <div className="d-flex align-items-center justify-content-between px-4 border-bottom" style={{ height: 60, flexShrink: 0 }}>
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded d-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: 28, height: 28, overflow: 'hidden',
                  background: appLogo ? 'transparent' : 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                }}
              >
                {appLogo
                  ? <img src={appLogo} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  : <i className="bi bi-grid-fill text-white" style={{ fontSize: 13 }} />}
              </div>
              <span className="fw-bold text-primary" style={{ fontSize: 16 }}>{appName}</span>
            </div>
            <button
              className="btn btn-light btn-sm p-1"
              style={{ lineHeight: 1 }}
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <i className="bi bi-x-lg" style={{ fontSize: 16 }} />
            </button>
          </div>

          {/* Drawer nav */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <SidebarNav onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>

        {/* Main content */}
        <main
          className="flex-grow-1 p-3 p-md-4 bg-white overflow-auto"
          style={{ maxHeight: 'calc(100vh - 60px)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
