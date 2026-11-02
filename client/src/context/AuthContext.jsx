import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, getToken, setToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [penNames, setPenNames] = useState([]);
  const [activePenName, setActivePenName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  const fetchUser = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setPenNames([]);
      setActivePenName(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiRequest('/auth/me');
      setUser(data.user);
      setPenNames(data.penNames || []);

      const savedPenId = localStorage.getItem('indigo_active_pen_id');
      const matched = data.penNames?.find(p => p.id === savedPenId);
      if (matched) {
        setActivePenName(matched);
      } else if (data.penNames && data.penNames.length > 0) {
        setActivePenName(data.penNames[0]);
        localStorage.setItem('indigo_active_pen_id', data.penNames[0].id);
      }
      fetchNotifications();
    } catch (err) {
      console.warn('Session verification failed:', err.message);
      setToken(null);
      setUser(null);
      setPenNames([]);
      setActivePenName(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest('/notifications');
      setNotifications(data.notifications || []);
      setUnreadNotifsCount(data.unreadCount || 0);
    } catch (err) {
      // ignore
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadNotifsCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadNotifsCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const selectActivePenName = (penName) => {
    setActivePenName(penName);
    if (penName) {
      localStorage.setItem('indigo_active_pen_id', penName.id);
    } else {
      localStorage.removeItem('indigo_active_pen_id');
    }
  };

  const login = async (identifier, password) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: identifier, password })
    });
    setToken(data.token);
    setUser(data.user);
    setPenNames(data.penNames || []);
    if (data.penNames && data.penNames.length > 0) {
      selectActivePenName(data.penNames[0]);
    }
    fetchNotifications();
    return data;
  };

  const register = async (username, email, password) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    setToken(data.token);
    setUser(data.user);
    setPenNames(data.penNames || []);
    if (data.penNames && data.penNames.length > 0) {
      selectActivePenName(data.penNames[0]);
    }
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setPenNames([]);
    setActivePenName(null);
    localStorage.removeItem('indigo_active_pen_id');
  };

  const createPenName = async (name, bio, avatar_url) => {
    const data = await apiRequest('/pen-names', {
      method: 'POST',
      body: JSON.stringify({ name, bio, avatar_url })
    });
    const updated = [...penNames, data.penName];
    setPenNames(updated);
    selectActivePenName(data.penName);
    return data.penName;
  };

  const updatePenName = async (id, name, bio, avatar_url) => {
    const data = await apiRequest(`/pen-names/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, bio, avatar_url })
    });
    const updated = penNames.map(p => p.id === id ? data.penName : p);
    setPenNames(updated);
    if (activePenName && activePenName.id === id) {
      setActivePenName(data.penName);
    }
    return data.penName;
  };

  const deletePenName = async (id, action, transferToPenNameId) => {
    await apiRequest(`/pen-names/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ action, transferToPenNameId })
    });
    const updated = penNames.filter(p => p.id !== id);
    setPenNames(updated);
    if (activePenName && activePenName.id === id) {
      selectActivePenName(updated.length > 0 ? updated[0] : null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        penNames,
        activePenName,
        selectActivePenName,
        loading,
        login,
        register,
        logout,
        fetchUser,
        createPenName,
        updatePenName,
        deletePenName,
        notifications,
        unreadNotifsCount,
        markNotificationRead,
        markAllNotificationsRead,
        refreshNotifications: fetchNotifications
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
