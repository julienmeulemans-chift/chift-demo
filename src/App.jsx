import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChiftConfigProvider } from './contexts/ChiftConfigContext.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Analytics from './pages/Analytics.jsx';
import Customers from './pages/Customers.jsx';
import Integrations from './pages/integrations/index.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const basename = import.meta.env.BASE_URL;

  return (
    <ChiftConfigProvider>
      <BrowserRouter basename={basename}>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ChiftConfigProvider>
  );
}