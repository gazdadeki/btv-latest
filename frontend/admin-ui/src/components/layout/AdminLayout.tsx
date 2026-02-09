import React, { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import WebSocketStatusIndicator from '@/components/WebSocketStatusIndicator';
import { api } from '@/lib/api';
import { AdminCommon } from '@/lib/adminCommon';
import { useAuth } from '@/lib/authContext';
import { webSocketManager } from '@/lib/websocketManager';

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'fas fa-tachometer-alt', end: true },
  { to: '/calendar', label: 'Calendar', icon: 'fas fa-calendar' },
  { to: '/users', label: 'Users', icon: 'fas fa-users' },
  { to: '/schedules', label: 'Schedules', icon: 'fas fa-calendar-alt' },
  { to: '/games', label: 'Games', icon: 'fas fa-calendar-check' },
  { to: '/subscriptions', label: 'Subscriptions', icon: 'fas fa-crown' },
  { to: '/tutorials', label: 'Tutorials', icon: 'fas fa-book' },
  { to: '/stripe-products', label: 'Stripe Products', icon: 'fas fa-credit-card' },
  { to: '/messages', label: 'Messages', icon: 'fas fa-comments', hasUnread: true },
  { to: '/audit', label: 'Audit Logs', icon: 'fas fa-history' },
];

export default function AdminLayout() {
  const { user } = useAuth();

  useEffect(() => {
    AdminCommon.updateUnreadBadge();
    const unsubscribe = webSocketManager.on('unread:updated', (data) => {
      const payload = data as { count?: number };
      if (typeof payload.count === 'number') {
        AdminCommon.updateUnreadBadgeFromCount(payload.count);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="wrapper">
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link" data-widget="pushmenu" href="#" role="button">
              <i className="fas fa-bars" />
            </a>
          </li>
        </ul>
        <ul className="navbar-nav ml-auto">
          <WebSocketStatusIndicator />
          <li className="nav-item">
            <a
              className="nav-link"
              href="#"
              id="logoutLink"
              onClick={(event) => {
                event.preventDefault();
                api.logout();
              }}
            >
              <i className="fas fa-sign-out-alt" /> Logout
            </a>
          </li>
        </ul>
      </nav>

      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <a href="/admin" className="brand-link">
          <span className="brand-text font-weight-light">BaltazarTV Admin</span>
        </a>
        <div className="sidebar">
          <div className="user-panel mt-3 pb-3 mb-3 d-flex">
            <div className="info">
              <span className="d-block" id="userEmail">
                {user?.email || 'Admin User'}
              </span>
            </div>
          </div>
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" role="menu">
              {navItems.map((item) => (
                <li className="nav-item" key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `nav-link${isActive ? ' active' : ''}`
                    }
                  >
                    <i className={`nav-icon ${item.icon}`} />
                    <p>
                      {item.label}
                      {item.hasUnread && (
                        <span
                          className="badge badge-danger ml-2"
                          id="unreadBadge"
                          style={{ display: 'none' }}
                        >
                          0
                        </span>
                      )}
                    </p>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      <Outlet />
    </div>
  );
}
