import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { RoleGuard } from './components/guards/RoleGuard';
import { MainLayout } from './components/layout/MainLayout';

// Pages
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { CCTVView } from './pages/CCTVView';
import { AlertQueue } from './pages/AlertQueue';
import { EvidenceReview } from './pages/EvidenceReview';
import { Districts } from './pages/Districts';
import { Mandals } from './pages/Mandals';
import { Centres } from './pages/Centres';
import { Reports } from './pages/Reports';
import { Exports } from './pages/Exports';
import { AuditLogs } from './pages/AuditLogs';

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
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
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
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
