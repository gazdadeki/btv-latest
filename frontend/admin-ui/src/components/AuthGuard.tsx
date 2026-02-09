import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { webSocketManager } from '@/lib/websocketManager';

export default function AuthGuard() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (user) {
      webSocketManager.resetAuthFailure();
      webSocketManager.connect();
    } else {
      webSocketManager.disconnect();
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="content-wrapper">
        <section className="content">
          <div className="container-fluid">
            <div className="text-center p-5">
              <i className="fas fa-spinner fa-spin fa-2x" />
              <p className="mt-3 text-muted">Loading...</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
