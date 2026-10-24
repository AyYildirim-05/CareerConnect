import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, fetchMe } from '../services/authService';
import { fetchMyCompany } from '../services/companyService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  // The logged-in recruiter's company. userId records whose company was loaded,
  // so we can tell "not loaded yet" apart from "this recruiter has no company".
  const [companyState, setCompanyState] = useState({ userId: null, company: null });

  const userId = user ? user.id : null;
  const isRecruiter = Boolean(user && user.role === 'Recruiter');

  // Load the recruiter's company whenever a recruiter logs in
  useEffect(() => {
    if (!isRecruiter || !token) return;

    let cancelled = false;
    async function loadCompany() {
      try {
        const res = await fetchMyCompany(token);
        if (!cancelled) setCompanyState({ userId, company: res.company });
      } catch (err) {
        console.error('Failed to load company:', err);
        if (!cancelled) setCompanyState({ userId, company: null });
      }
    }
    loadCompany();
    return () => { cancelled = true; };
  }, [userId, isRecruiter, token]);

  const companyLoaded = !isRecruiter || companyState.userId === userId;
  const company = companyState.userId === userId ? companyState.company : null;

  // Called after the company page is created or edited
  const setCompany = (newCompany) => {
    setCompanyState({ userId, company: newCompany });
  };

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await fetchMe(token);
          setUser(res.user);
        } catch (err) {
          console.error('Failed to load user profile:', err);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    if (res.token) {
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const register = async (email, password, role) => {
    const res = await registerUser({ email, password, role });
    if (res.token) {
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        company,
        companyLoaded,
        setCompany,
        login,
        register,
        logout
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
