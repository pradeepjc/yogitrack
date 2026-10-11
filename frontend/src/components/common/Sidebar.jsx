import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();

  if (user?.role !== 'manager') {
    return null;
  }

  return (
    <aside className="sidebar" id="app-sidebar">
      <NavLink to="/manager/instructors">Instructors</NavLink>
      <NavLink to="/manager/classes">Classes</NavLink>
      <NavLink to="/manager/packages">Packages</NavLink>
      <NavLink to="/manager/customers">Customers</NavLink>
    </aside>
  );
}
