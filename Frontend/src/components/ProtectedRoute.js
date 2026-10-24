import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Only render children for logged-in users (optionally limited to allowedRoles).
 * Recruiters must set up their company page first: until they do, every page
 * except the setup page (allowWithoutCompany) redirects to /recruiter/company.
 */
export default function ProtectedRoute({ children, allowedRoles, allowWithoutCompany = false }) {
  const { user, isAuthenticated, loading, company, companyLoaded } = useAuth();

  if (loading || (isAuthenticated && !companyLoaded)) {
    return (
      <div className="auth-container">
        <div className="auth-box glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#94a3b8' }}>Loading session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user.role === 'Recruiter' && !company && !allowWithoutCompany) {
    return <Navigate to="/recruiter/company" replace />;
  }

  return children;
}
