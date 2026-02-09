import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AuthUtils } from '@/lib/auth';
import '@/styles/login.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const logoutInProgress = sessionStorage.getItem('logoutInProgress');
        if (logoutInProgress === 'true') {
          sessionStorage.removeItem('logoutInProgress');
          AuthUtils.clearAuth();
          return;
        }
      } catch {
        // sessionStorage might not be available
      }

      try {
        const user = await api.getMe();
        if (!active) return;
        if (user) {
          AuthUtils.setUserCookie(user);
          window.location.href = '/admin';
        }
      } catch {
        // Not authenticated
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const result = await api.login(email.trim(), password);
      if (result?.user) {
        AuthUtils.setUserCookie(result.user);
        await new Promise((resolve) => setTimeout(resolve, 50));
        window.location.href = '/admin';
      } else {
        setError('Invalid response from server');
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <b>BaltazarTV</b> Admin
        </div>
        <div className="card login-card-body">
          <p className="login-box-msg">Sign in to start your session</p>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="input-group mb-3">
              <input
                type="email"
                className="form-control"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <div className="input-group-append">
                <div className="input-group-text">
                  <span className="fas fa-envelope" />
                </div>
              </div>
            </div>
            <div className="input-group mb-3">
              <input
                type="password"
                className="form-control"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <div className="input-group-append">
                <div className="input-group-text">
                  <span className="fas fa-lock" />
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col-12">
                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={loading}
                >
                  {loading && (
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                      style={{ marginRight: '6px' }}
                    />
                  )}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
