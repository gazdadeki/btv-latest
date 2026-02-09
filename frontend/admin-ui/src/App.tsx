import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import AuthGuard from '@/components/AuthGuard';
import { AuthProvider } from '@/lib/authContext';
import AuditPage from '@/pages/AuditPage';
import CalendarPage from '@/pages/CalendarPage';
import DashboardPage from '@/pages/DashboardPage';
import GamesPage from '@/pages/GamesPage';
import LoginPage from '@/pages/LoginPage';
import MessagesPage from '@/pages/MessagesPage';
import NotFoundPage from '@/pages/NotFoundPage';
import SchedulesPage from '@/pages/SchedulesPage';
import StripeProductsPage from '@/pages/StripeProductsPage';
import SubscriptionsPage from '@/pages/SubscriptionsPage';
import TutorialsPage from '@/pages/TutorialsPage';
import UsersPage from '@/pages/UsersPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AdminLayout />}>
          <Route element={<AuthGuard />}>
            <Route index element={<DashboardPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="schedules" element={<SchedulesPage />} />
            <Route path="games" element={<GamesPage />} />
            <Route path="events" element={<GamesPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="tutorials" element={<TutorialsPage />} />
            <Route path="stripe-products" element={<StripeProductsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="audit" element={<AuditPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
