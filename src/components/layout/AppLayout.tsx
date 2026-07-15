import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeftOpen } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useI18n } from '@/i18n';
import { useApp } from '@/store/appStore';

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const { dir } = useI18n();
  const logo = useApp((s) => s.storeInfo.logo);

  const handleNavigate = () => {
    setMobileOpen(false);
    if (!sidebarPinned) setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Residence logo watermark — subtle brand background behind every page */}
      {logo && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden">
          <img
            src={logo}
            alt=""
            className="w-[min(72vw,760px)] max-w-none select-none object-contain opacity-[0.04]"
          />
        </div>
      )}

      {/* Desktop sidebar with animation */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="desktop-sidebar"
            className="relative z-10 hidden lg:block w-[260px] shrink-0 overflow-hidden"
            initial={{ x: -260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -260, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Sidebar
              onNavigate={handleNavigate}
              pinned={sidebarPinned}
              onTogglePin={() => setSidebarPinned((p) => !p)}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Floating re-open button (desktop only, shown when sidebar is closed) */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.button
            key="reopen-btn"
            className="hidden lg:flex fixed left-3 top-1/2 -translate-y-1/2 z-40 items-center justify-center h-10 w-10 rounded-xl bg-white shadow-lg border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 transition-colors"
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={() => setSidebarOpen(true)}
            title="Ouvrir la sidebar"
          >
            <PanelLeftOpen size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mobile drawer sidebar */}
      {createPortal(
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="fixed inset-0 z-50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, pointerEvents: 'none' }}
            >
              <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
              />
              <motion.div
                className="absolute top-0 bottom-0 w-[260px]"
                style={dir === 'rtl' ? { right: 0 } : { left: 0 }}
                initial={{ x: dir === 'rtl' ? '100%' : '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: dir === 'rtl' ? '100%' : '-100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <Sidebar
                  onNavigate={() => setMobileOpen(false)}
                  pinned={false}
                  onTogglePin={() => {}}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Main */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <Header onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
