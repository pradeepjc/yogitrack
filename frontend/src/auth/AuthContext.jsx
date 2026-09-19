import { createContext, useContext, useEffect, useState } from 'react';
import { login as loginApi, fetchMe } from '../api/auth.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('yogitrack_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('yogitrack_token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then((profile) => {
        setUser(profile);
        localStorage.setItem('yogitrack_user', JSON.stringify(profile));
      })
      .catch(() => {
        localStorage.removeItem('yogitrack_token');
        localStorage.removeItem('yogitrack_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const { token, user: loggedInUser } = await loginApi(username, password);
    localStorage.setItem('yogitrack_token', token);
    localStorage.setItem('yogitrack_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  }

  function logout() {
    localStorage.removeItem('yogitrack_token');
    localStorage.removeItem('yogitrack_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
