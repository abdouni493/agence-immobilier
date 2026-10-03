import { lazy, Suspense, type ReactNode, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp, useCurrentPermissions, canAccess, fetchWorkerPermissions } from '@/store/appStore';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { pageTransition } from '@/animations';
import type { ModuleKey, Permissions } from '@/types';

const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Reservations = lazy(() => import('@/pages/Reservations'));
const Ventes = lazy(() => import('@/pages/Ventes'));
const Achats = lazy(() => import('@/pages/Achats'));
const Chambres = lazy(() => import('@/pages/Chambres'));
const Services = lazy(() => import('@/pages/Services'));
const Clients = lazy(() => import('@/pages/Clients'));
const Mediateurs = lazy(() => import('@/pages/Mediateurs'));
const Workers = lazy(() => import('@/pages/Workers'));
const Expenses = lazy(() => import('@/pages/Expenses'));
const Caisse = lazy(() => import('@/pages/Caisse'));
const Reports = lazy(() => import('@/pages/Reports'));
const Zakat = lazy(() => import('@/pages/Zakat'));
const Settings = lazy(() => import('@/pages/Settings'));

// Preload all pages to avoid white-screen delays on first navigation
const preload = () => {
  import('@/pages/Dashboard');
  import('@/pages/Reservations');
  import('@/pages/Ventes');
  import('@/pages/Achats');
  import('@/pages/Chambres');
  import('@/pages/Clients');
  import('@/pages/Mediateurs');
  import('@/pages/Workers');
  import('@/pages/Services');
  import('@/pages/Expenses');
  import('@/pages/Caisse');
  import('@/pages/Reports');
  import('@/pages/Zakat');
  import('@/pages/Settings');
};

function PageShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate">
      {/* key on Suspense forces remount on route change, preventing stale content flashes */}
      <Suspense key={location.pathname} fallback={<PageSkeleton />}>
        {children}
      </Suspense>
    </motion.div>
  );
}

function RequireModule({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const perms = useCurrentPermissions();
  if (!canAccess(perms, module)) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  return (
    // No exit animation / AnimatePresence "wait": rapid clicks in the sidebar
    // could interrupt the exit and leave a blank page until refresh.
    <ErrorBoundary key={location.pathname}>
      <Routes location={location}>
        <Route path="dashboard" element={<PageShell><Dashboard /></PageShell>} />
        <Route
          path="reservations"
          element={<PageShell><RequireModule module="reservations"><Reservations /></RequireModule></PageShell>}
        />
        <Route
          path="ventes"
          element={<PageShell><RequireModule module="ventes"><Ventes /></RequireModule></PageShell>}
        />
        <Route
          path="achats"
          element={<PageShell><RequireModule module="achats"><Achats /></RequireModule></PageShell>}
        />
        <Route
          path="chambres"
          element={<PageShell><RequireModule module="chambres"><Chambres /></RequireModule></PageShell>}
        />
        <Route
          path="services"
          element={<PageShell><RequireModule module="services"><Services /></RequireModule></PageShell>}
        />
        <Route
          path="clients"
          element={<PageShell><RequireModule module="clients"><Clients /></RequireModule></PageShell>}
        />
        <Route
          path="mediators"
          element={<PageShell><RequireModule module="mediators"><Mediateurs /></RequireModule></PageShell>}
        />
        <Route
          path="workers"
          element={<PageShell><RequireModule module="workers"><Workers /></RequireModule></PageShell>}
        />
        <Route
          path="expenses"
          element={<PageShell><RequireModule module="expenses"><Expenses /></RequireModule></PageShell>}
        />
        <Route
          path="caisse"
          element={<PageShell><RequireModule module="caisse"><Caisse /></RequireModule></PageShell>}
        />
        <Route
          path="reports"
          element={<PageShell><RequireModule module="reports"><Reports /></RequireModule></PageShell>}
        />
        <Route
          path="zakat"
          element={<PageShell><RequireModule module="reports"><Zakat /></RequireModule></PageShell>}
        />
        <Route
          path="settings"
          element={<PageShell><RequireModule module="settings"><Settings /></RequireModule></PageShell>}
        />
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  const user = useApp((s) => s.user);
  const setUser = useApp((s) => s.setUser);
  const loadAll = useApp((s) => s.loadAll);
  const loadStoreInfo = useApp((s) => s.loadStoreInfo);
  const logo = useApp((s) => s.storeInfo.logo);
  const location = useLocation();
  const [authLoading, setAuthLoading] = useState(true);

  // The agency logo is painted full-size behind every page (see `.app-bg::after`).
  useEffect(() => {
    document.documentElement.style.setProperty('--app-logo', logo ? `url("${logo}")` : 'none');
  }, [logo]);

  useEffect(() => {
    // Load residence identity up-front so the login screen shows the real
    // name/logo from the database (not the default placeholder).
    loadStoreInfo();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles').select('*').eq('id', session.user.id).single();
          if (profile) {
            await loadAll();
            const p = profile as Record<string, unknown>;
            const role = (p.role as 'admin' | 'worker') ?? 'worker';
            let workerId = (p.worker_id as string) ?? undefined;
            let permissions: Permissions | undefined;
            if (role === 'worker') {
              const wc = await fetchWorkerPermissions(session.user.id);
              workerId = wc.workerId ?? workerId;
              permissions = wc.permissions;
            }
            setUser({
              id: session.user.id,
              name: (p.name as string) ?? '',
              username: (p.username as string) ?? '',
              email: session.user.email ?? '',
              password: '',
              role,
              avatar: (p.avatar_url as string) ?? null,
              workerId,
              permissions,
            });
          }
        } catch {
          // session exists but profile fetch failed — stay on login
        }
      }
      setAuthLoading(false);
      preload();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setUser(null);
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authLoading) return <PageSkeleton />;

  return (
    <>
      <div className={location.pathname === '/login' ? 'app-bg login-bg' : 'app-bg'} />
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/app/dashboard" replace />
            ) : (
              <Suspense fallback={<PageSkeleton />}>
                <Login />
              </Suspense>
            )
          }
        />
        <Route
          path="/app/*"
          element={
            user ? (
              <AppLayout>
                <AppRoutes />
              </AppLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={user ? '/app/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  );
}
