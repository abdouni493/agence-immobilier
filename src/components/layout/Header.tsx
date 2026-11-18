import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, ChevronDown, LogOut, UserCog, ShieldCheck } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { useI18n } from '@/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';
import { initials, formatDateLong, todayISO } from '@/lib/utils';

export function Header({ onMenu }: { onMenu: () => void }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const user = useApp((s) => s.user);
  const logout = useApp((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 h-[68px] px-4 sm:px-6 glass-strong border-b border-slate-200">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenu}
          className="lg:hidden grid place-items-center h-10 w-10 rounded-xl glass border border-slate-200 text-ink-primary"
          aria-label="Menu"
        >
          <Menu size={20} />
        </button>
        <div className="hidden md:block min-w-0">
          <p className="text-xs text-ink-muted capitalize truncate">
            {formatDateLong(todayISO(), lang)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <LanguageToggle />

        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-xl glass border border-slate-200 ps-1.5 pe-3 h-11 hover:bg-slate-200/70 transition-colors"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-grad-primary text-white text-xs font-bold overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(user.name)
              )}
            </span>
            <span className="hidden sm:flex flex-col items-start min-w-0">
              <span className="text-sm font-semibold text-ink-primary leading-none truncate max-w-[140px]">
                {user.name}
              </span>
              <span className="text-[11px] text-ink-muted leading-none mt-0.5 flex items-center gap-1">
                {user.role === 'admin' ? <ShieldCheck size={11} /> : <UserCog size={11} />}
                {user.role === 'admin' ? 'Admin' : user.role === 'mediator' ? t('nav.mediators') : t('nav.workers')}
              </span>
            </span>
            <ChevronDown size={16} className="text-ink-muted" />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="absolute end-0 mt-2 w-56 glass-strong rounded-2xl border border-slate-200 shadow-card overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-slate-200">
                  <p className="text-sm font-semibold text-ink-primary truncate">{user.name}</p>
                  <p className="text-xs text-ink-muted truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate('/app/settings');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-secondary hover:bg-slate-100 hover:text-ink-primary transition-colors"
                >
                  <UserCog size={17} />
                  {t('settings.tabAccount')}
                </button>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-500/15 transition-colors"
                >
                  <LogOut size={17} />
                  {t('nav.logout')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
