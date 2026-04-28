import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HotelProvider } from './context/HotelContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EmergencyDetailPage from './pages/EmergencyDetailPage';
import StaffPage from './pages/StaffPage';
import LocationsPage from './pages/LocationsPage';
import HotelSetupPage from './pages/HotelSetupPage';
import ReportPage from './pages/ReportPage';
import PublicReportPage from './pages/PublicReportPage';
import QRPage from './pages/QRPage';
import StaffDashboardPage from './pages/StaffDashboardPage';

function PrivateRoute({ children, allowedRoles }) {
  const { user, userProfile } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    // Redirect to correct dashboard based on role
    return <Navigate to={userProfile.role === 'staff' ? '/staff-dashboard' : '/dashboard'} replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, userProfile } = useAuth();
  if (!user) return children;
  return <Navigate to={userProfile?.role === 'staff' ? '/staff-dashboard' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HotelProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
            <Route path="/report/:locationId" element={<PublicReportPage />} />

            {/* Admin only */}
            <Route path="/dashboard" element={<PrivateRoute allowedRoles={['admin']}><DashboardPage /></PrivateRoute>} />
            <Route path="/emergency/:id" element={<PrivateRoute allowedRoles={['admin']}><EmergencyDetailPage /></PrivateRoute>} />
            <Route path="/staff" element={<PrivateRoute allowedRoles={['admin']}><StaffPage /></PrivateRoute>} />
            <Route path="/locations" element={<PrivateRoute allowedRoles={['admin']}><LocationsPage /></PrivateRoute>} />
            <Route path="/qr-codes" element={<PrivateRoute allowedRoles={['admin']}><QRPage /></PrivateRoute>} />
            <Route path="/setup" element={<PrivateRoute allowedRoles={['admin']}><HotelSetupPage /></PrivateRoute>} />
            <Route path="/incident-report/:id" element={<PrivateRoute allowedRoles={['admin']}><ReportPage /></PrivateRoute>} />

            {/* Staff only */}
            <Route path="/staff-dashboard" element={<PrivateRoute allowedRoles={['staff']}><StaffDashboardPage /></PrivateRoute>} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </HotelProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
