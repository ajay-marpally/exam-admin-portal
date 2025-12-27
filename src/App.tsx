import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { RoleGuard } from './components/guards/RoleGuard';
import { MainLayout } from './components/layout/MainLayout';

// Loading component for lazy-loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
  </div>
);

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const LiveMonitoring = lazy(() => import('./pages/LiveMonitoring').then(m => ({ default: m.LiveMonitoring })));
const CCTVView = lazy(() => import('./pages/CCTVView').then(m => ({ default: m.CCTVView })));
const AlertQueue = lazy(() => import('./pages/AlertQueue').then(m => ({ default: m.AlertQueue })));
const EvidenceReview = lazy(() => import('./pages/EvidenceReview').then(m => ({ default: m.EvidenceReview })));
const Districts = lazy(() => import('./pages/Districts').then(m => ({ default: m.Districts })));
const Mandals = lazy(() => import('./pages/Mandals').then(m => ({ default: m.Mandals })));
const Centres = lazy(() => import('./pages/Centres').then(m => ({ default: m.Centres })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Exports = lazy(() => import('./pages/Exports').then(m => ({ default: m.Exports })));
const AuditLogs = lazy(() => import('./pages/AuditLogs').then(m => ({ default: m.AuditLogs })));
const Students = lazy(() => import('./pages/Students').then(m => ({ default: m.Students })));
const Users = lazy(() => import('./pages/Users').then(m => ({ default: m.Users })));
const Exams = lazy(() => import('./pages/Exams').then(m => ({ default: m.Exams })));
const HallTickets = lazy(() => import('./pages/HallTickets').then(m => ({ default: m.HallTickets })));

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} /> {/* TEMPORARY - Delete before production */}
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes */}
              <Route
                element={
                  <RoleGuard>
                    <MainLayout />
                  </RoleGuard>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/monitoring" element={<LiveMonitoring />} />
                <Route path="/cctv" element={<CCTVView />} />
                <Route path="/alerts" element={<AlertQueue />} />
                <Route path="/evidence" element={<EvidenceReview />} />
                <Route path="/students" element={<Students />} />
                <Route
                  path="/users"
                  element={
                    <RoleGuard allowedRoles={['SUPER_ADMIN']}>
                      <Users />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/exams"
                  element={
                    <RoleGuard allowedRoles={['SUPER_ADMIN', 'DISTRICT_IN_CHARGE']}>
                      <Exams />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/hall-tickets"
                  element={
                    <RoleGuard allowedRoles={['SUPER_ADMIN', 'DISTRICT_IN_CHARGE']}>
                      <HallTickets />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/districts"
                  element={
                    <RoleGuard allowedRoles={['SUPER_ADMIN', 'DISTRICT_IN_CHARGE']}>
                      <Districts />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/mandals"
                  element={
                    <RoleGuard allowedRoles={['SUPER_ADMIN', 'DISTRICT_IN_CHARGE', 'MANDAL_IN_CHARGE']}>
                      <Mandals />
                    </RoleGuard>
                  }
                />
                <Route path="/centres" element={<Centres />} />
                <Route
                  path="/reports"
                  element={
                    <RoleGuard allowedRoles={['SUPER_ADMIN', 'DISTRICT_IN_CHARGE']}>
                      <Reports />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/exports"
                  element={
                    <RoleGuard allowedRoles={['SUPER_ADMIN', 'DISTRICT_IN_CHARGE']}>
                      <Exports />
                    </RoleGuard>
                  }
                />
                <Route path="/audit-logs" element={<AuditLogs />} />
              </Route>

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
