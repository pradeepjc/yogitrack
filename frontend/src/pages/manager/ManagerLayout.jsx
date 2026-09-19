import { Outlet } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';

export default function ManagerLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
