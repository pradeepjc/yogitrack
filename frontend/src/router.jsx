import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import RoleRoute from './auth/RoleRoute';
import LoginPage from './pages/LoginPage';
import ManagerLayout from './pages/manager/ManagerLayout';
import InstructorsPage from './pages/manager/InstructorsPage';
import ClassesPage from './pages/manager/ClassesPage';
import PackagesPage from './pages/manager/PackagesPage';
import CustomersPage from './pages/manager/CustomersPage';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/manager" replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute role="manager" />}>
          <Route path="/manager" element={<ManagerLayout />}>
            <Route index element={<Navigate to="instructors" replace />} />
            <Route path="instructors" element={<InstructorsPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="customers" element={<CustomersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
