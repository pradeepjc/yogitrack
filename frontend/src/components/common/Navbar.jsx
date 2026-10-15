import { useAuth } from '../../auth/AuthContext';

export default function Navbar({ sidebarOpen, onToggleSidebar }) {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? 'Hide menu' : 'Show menu'}
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
      >
        ☰
      </button>
      <div className="navbar-brand">YogiTrack</div>
      <div className="navbar-user">
        {/* Instructor usernames are their ids, stored lowercase. */}
        <span>{user?.role === 'instructor' ? user.username.toUpperCase() : user?.username}</span>
        <button type="button" className="btn btn-link" onClick={logout}>
          Log out
        </button>
      </div>
    </nav>
  );
}
