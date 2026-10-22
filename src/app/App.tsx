import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Alerts from '../pages/Alerts';
import Dashboard from '../pages/Dashboard';
import IntersectionDetail from '../pages/IntersectionDetail';
import Intersections from '../pages/Intersections';
import LiveView from '../pages/LiveView';
import Login from '../pages/Login';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';
import ViolationDetail from '../pages/ViolationDetail';
import Violations from '../pages/Violations';
import { qc } from '../services/queryClient';
import { ADMIN, OPS, useAuth } from '../store/auth';
import type { Role } from '../types';
import Layout from './Layout';

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuth((s) => s.token);
  const loc = useLocation();
  return token ? <>{children}</> : <Navigate to="/login" replace state={{ from: loc.pathname }} />;
}

/** Route guard: roles that can't use a page never see it (the sidebar hides it too). */
function Only({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const role = useAuth((s) => s.user?.role);
  return role && roles.includes(role) ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="live" element={<Only roles={OPS}><LiveView /></Only>} />
            <Route path="intersections" element={<Intersections />} />
            <Route path="intersections/:id" element={<IntersectionDetail />} />
            <Route path="violations" element={<Only roles={OPS}><Violations /></Only>} />
            <Route path="violations/:id" element={<Only roles={OPS}><ViolationDetail /></Only>} />
            <Route path="reports" element={<Reports />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="settings" element={<Only roles={ADMIN}><Settings /></Only>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
