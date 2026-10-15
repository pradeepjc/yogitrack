import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

const LINKS = {
  manager: [
    { to: '/manager/instructors', label: 'Instructors' },
    { to: '/manager/classes', label: 'Classes' },
    { to: '/manager/packages', label: 'Packages' },
    { to: '/manager/customers', label: 'Customers' },
    { to: '/manager/sales', label: 'Sales' },
    { to: '/manager/reports', label: 'Reports' },
  ],
  instructor: [{ to: '/instructor/attendance', label: 'Attendance' }],
};

export default function Sidebar() {
  const { user } = useAuth();
  const links = LINKS[user?.role];

  if (!links) {
    return null;
  }

  return (
    <aside className="sidebar" id="app-sidebar">
      {links.map((link) => (
        <NavLink key={link.to} to={link.to}>
          {link.label}
        </NavLink>
      ))}
    </aside>
  );
}
