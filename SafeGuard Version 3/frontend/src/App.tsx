import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import AboutPage from './pages/AboutPage';
import AdminDashboard from './pages/AdminDashboard';
import ContactsPage from './pages/ContactsPage';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import MonitorPage from './pages/MonitorPage';
import PrivacyPage from './pages/PrivacyPage';
import { LoginPage, RegisterPage } from './pages/AuthPage';
import { getAuthSession, getAuthToken } from './services/auth';

function RequireAuth() {
  const location = useLocation();
  return getAuthToken() ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
function RequireAdmin() {
  return getAuthSession()?.user.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/dashboard" replace />;
}
export default function App() {
  return <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<RequireAuth />}>
      <Route element={<Layout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="map" element={<MapPage />} />
        <Route path="monitor" element={<MonitorPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="admin" element={<RequireAdmin />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
