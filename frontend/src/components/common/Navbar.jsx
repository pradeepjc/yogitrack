import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">YogiTrack</div>
      {user?.role === 'manager' && (
        <div className="navbar-links">
          <NavLink to="/manager/instructors">Instructors</NavLink>
          <NavLink to="/manager/classes">Classes</NavLink>
        </div>
      )}
      <div className="navbar-user">
        <span>{user?.username}</span>
        <button type="button" className="btn btn-link" onClick={logout}>
          Log out
        </button>
      </div>
    </nav>
  );
}
