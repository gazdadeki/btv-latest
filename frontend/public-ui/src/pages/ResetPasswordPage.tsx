import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const resetStyles = `
  .reset-page {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .reset-box {
    width: 100%;
    max-width: 400px;
  }

  .reset-logo {
    font-size: 2.1rem;
    font-weight: 300;
    margin-bottom: 1.5rem;
    text-align: center;
    color: #fff;
  }

  .reset-card {
    background: #fff;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }

  .reset-title {
    text-align: center;
    margin-bottom: 20px;
    color: #333;
  }

  .reset-description {
    text-align: center;
    color: #666;
    margin-bottom: 25px;
    font-size: 14px;
  }

  .form-control {
    height: 45px;
    border-radius: 8px;
  }

  .form-control:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    height: 45px;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.7;
    transform: none;
  }

  .password-toggle {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    color: #666;
    z-index: 10;
  }

  .password-wrapper {
    position: relative;
  }

  .success-icon {
    font-size: 64px;
    color: #28a745;
    margin-bottom: 20px;
  }

  .error-icon {
    font-size: 64px;
    color: #dc3545;
    margin-bottom: 20px;
  }

  .login-link {
    text-align: center;
    margin-top: 20px;
  }

  .login-link a {
    color: #667eea;
    text-decoration: none;
  }

  .login-link a:hover {
    text-decoration: underline;
  }

  .password-requirements {
    font-size: 12px;
    color: #666;
    margin-top: 8px;
  }

  .password-requirements li {
    margin-bottom: 2px;
  }

  .requirement-met {
    color: #28a745;
  }

  .requirement-unmet {
    color: #dc3545;
  }
`;

type Mode = 'form' | 'success' | 'error' | 'no-token';

export default function ResetPasswordPage() {
  const location = useLocation();
  const token = useMemo(
    () => new URLSearchParams(location.search).get('token'),
    [location.search],
  );
  const [mode, setMode] = useState<Mode>('form');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [errorCardMessage, setErrorCardMessage] = useState(
    'This password reset link is invalid or has expired. Please request a new password reset.',
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const requirements = useMemo(
    () => ({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    }),
    [password],
  );

  const isPasswordValid = useMemo(
    () => Object.values(requirements).every(Boolean),
    [requirements],
  );

  useEffect(() => {
    document.title = 'Reset Password - BaltazarTV';
    const style = document.createElement('style');
    style.textContent = resetStyles;
    document.head.appendChild(style);
    const previousClassName = document.body.className;
    document.body.className = previousClassName
      ? `${previousClassName} reset-page`
      : 'reset-page';

    return () => {
      style.remove();
      document.body.className = previousClassName;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setMode('no-token');
      return;
    }
    setMode('form');
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setMode('no-token');
      return;
    }

    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = (await response.json()) as { message?: string };
      if (response.ok) {
        setMode('success');
      } else if (response.status === 401) {
        setErrorCardMessage(
          data.message ||
            'This password reset link is invalid or has expired. Please request a new password reset.',
        );
        setMode('error');
      } else {
        setError(data.message || 'An error occurred. Please try again.');
      }
    } catch (fetchError) {
      console.error('Reset password error:', fetchError);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-box">
      <div className="reset-logo">
        <b>BaltazarTV</b>
      </div>

      <div
        className="reset-card"
        id="resetFormCard"
        style={{ display: mode === 'form' ? 'block' : 'none' }}
      >
        <h4 className="reset-title">
          <i className="fas fa-key mr-2" />
          Reset Password
        </h4>
        <p className="reset-description">
          Enter your new password below. Make sure it&#39;s strong and secure.
        </p>

        <div
          id="errorAlert"
          className="alert alert-danger"
          style={{ display: error ? 'block' : 'none' }}
        >
          {error}
        </div>

        <form id="resetForm" onSubmit={handleSubmit}>
          <div className="form-group password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="form-control"
              placeholder="New Password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <span
              className="password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              <i
                className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                id="password-icon"
              />
            </span>
          </div>

          <ul className="password-requirements" id="passwordRequirements">
            <li
              id="req-length"
              className={requirements.length ? 'requirement-met' : 'requirement-unmet'}
            >
              <i className={`fas ${requirements.length ? 'fa-check-circle' : 'fa-circle'}`} /> At least 8 characters
            </li>
            <li
              id="req-upper"
              className={requirements.upper ? 'requirement-met' : 'requirement-unmet'}
            >
              <i className={`fas ${requirements.upper ? 'fa-check-circle' : 'fa-circle'}`} /> One uppercase letter
            </li>
            <li
              id="req-lower"
              className={requirements.lower ? 'requirement-met' : 'requirement-unmet'}
            >
              <i className={`fas ${requirements.lower ? 'fa-check-circle' : 'fa-circle'}`} /> One lowercase letter
            </li>
            <li
              id="req-number"
              className={requirements.number ? 'requirement-met' : 'requirement-unmet'}
            >
              <i className={`fas ${requirements.number ? 'fa-check-circle' : 'fa-circle'}`} /> One number
            </li>
          </ul>

          <div className="form-group password-wrapper mt-3">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              className="form-control"
              placeholder="Confirm New Password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <span
              className="password-toggle"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              <i
                className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                id="confirmPassword-icon"
              />
            </span>
          </div>

          <button type="submit" className="btn btn-primary btn-block" id="submitBtn" disabled={loading}>
            <span
              className="spinner-border spinner-border-sm mr-2"
              role="status"
              aria-hidden="true"
              style={{ display: loading ? 'inline-block' : 'none' }}
              id="spinner"
            />
            <span id="btnText">{loading ? 'Resetting...' : 'Reset Password'}</span>
          </button>
        </form>
      </div>

      <div
        className="reset-card text-center"
        id="successCard"
        style={{ display: mode === 'success' ? 'block' : 'none' }}
      >
        <div className="success-icon">
          <i className="fas fa-check-circle" />
        </div>
        <h4 className="reset-title">Password Reset Successful!</h4>
        <p className="reset-description">
          Your password has been reset successfully. You can now log in with your new password.
        </p>
        <a href="/admin/login" className="btn btn-primary btn-block">
          <i className="fas fa-sign-in-alt mr-2" />
          Go to Login
        </a>
      </div>

      <div
        className="reset-card text-center"
        id="errorCard"
        style={{ display: mode === 'error' ? 'block' : 'none' }}
      >
        <div className="error-icon">
          <i className="fas fa-times-circle" />
        </div>
        <h4 className="reset-title">Invalid or Expired Link</h4>
        <p className="reset-description" id="errorMessage">
          {errorCardMessage}
        </p>
        <a href="/admin/login" className="btn btn-primary btn-block">
          <i className="fas fa-arrow-left mr-2" />
          Back to Login
        </a>
      </div>

      <div
        className="reset-card text-center"
        id="noTokenCard"
        style={{ display: mode === 'no-token' ? 'block' : 'none' }}
      >
        <div className="error-icon">
          <i className="fas fa-exclamation-triangle" />
        </div>
        <h4 className="reset-title">Missing Reset Token</h4>
        <p className="reset-description">
          No password reset token was provided. Please use the link from your password reset email.
        </p>
        <a href="/admin/login" className="btn btn-primary btn-block">
          <i className="fas fa-arrow-left mr-2" />
          Back to Login
        </a>
      </div>
    </div>
  );
}
