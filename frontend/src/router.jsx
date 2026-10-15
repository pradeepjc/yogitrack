import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import RoleRoute from './auth/RoleRoute';
import LoginPage from './pages/LoginPage';
import AppLayout from './pages/AppLayout';
import InstructorsPage from './pages/manager/InstructorsPage';
import ClassesPage from './pages/manager/ClassesPage';
import PackagesPage from './pages/manager/PackagesPage';
import CustomersPage from './pages/manager/CustomersPage';
import SalesPage from './pages/manager/SalesPage';
import ReportsPage from './pages/manager/ReportsPage';
import AttendancePage from './pages/instructor/AttendancePage';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'instructor' ? '/instructor' : '/manager'} replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute role="manager" />}>
          <Route path="/manager" element={<AppLayout />}>
            <Route index element={<Navigate to="instructors" replace />} />
            <Route path="instructors" element={<InstructorsPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
        </Route>
        <Route element={<RoleRoute role="instructor" />}>
          <Route path="/instructor" element={<AppLayout />}>
            <Route index element={<Navigate to="attendance" replace />} />
            <Route path="attendance" element={<AttendancePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
