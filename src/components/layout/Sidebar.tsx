import { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Building2, ChevronRight, Pin, PinOff } from 'lucide-react';
import { NAV_ITEMS } from './navConfig';
import { GRADIENT_CLASS } from '@/design-tokens';
import { useApp, useCurrentPermissions, canAccess } from '@/store/appStore';
import { useI18n } from '@/i18n';
import { sidebarItemVariant, staggerFast } from '@/animations';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onNavigate?: () => void;
  pinned?: boolean;
  onTogglePin?: () => void;
}

export function Sidebar({ onNavigate, pinned = false, onTogglePin }: SidebarProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const storeInfo = useApp((s) => s.storeInfo);
  const logout = useApp((s) => s.logout);
  const perms = useCurrentPermissions();

  const items = useMemo(() => NAV_ITEMS.filter((i) => canAccess(perms, i.module)), [perms]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (!pinned) onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col bg-white border-e border-slate-200/80">
      {/* Logo / brand */}
      <div className="flex items-center gap-3 px-5 h-[68px] border-b border-slate-100 shrink-0">
        <motion.div
          initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18 }}
          className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#0891b2] text-white shadow-glow shrink-0 overflow-hidden"
        >
          {storeInfo.logo ? (
            <img src={storeInfo.logo} alt="" className="h-full w-full object-cover" />
          ) : (
            <Building2 size={22} />
          )}
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 text-sm leading-tight truncate">
            {storeInfo.name}
          </p>
          <p className="text-[11px] text-slate-500 truncate">{t('app.tagline')}</p>
        </div>
        {/* Pin button — only shown on desktop (mobile doesn't need it) */}
        {onTogglePin && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onTogglePin}
            title={pinned ? 'Déspingler la sidebar' : 'Épingler la sidebar'}
            className={cn(
              'shrink-0 grid place-items-center h-7 w-7 rounded-lg transition-colors',
              pinned
                ? 'bg-slate-100 text-brand-600 border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
            )}
          >
            {pinned ? <Pin size={14} /> : <PinOff size={14} />}
          </motion.button>
        )}
      </div>

      {/* Nav */}
      <motion.nav
        variants={staggerFast}
        initial="initial"
        animate="animate"
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.path}
              variants={sidebarItemVariant}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <NavLink
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    'group relative z-0 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="active-nav"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#0891b2] border border-blue-700/10 shadow-md shadow-blue-900/10 -z-10"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    {/* colored icon chip */}
                    <span
                      className={cn(
                        'grid place-items-center h-8 w-8 rounded-lg shrink-0 transition-all duration-200',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-650 group-hover:bg-slate-200 group-hover:text-slate-900 group-hover:shadow-sm',
                      )}
                    >
                      <Icon size={18} className="transition-transform group-hover:scale-110 group-hover:rotate-6 duration-200" />
                    </span>
                    <span className="truncate flex-1 font-medium">{t(item.labelKey)}</span>
                    <ChevronRight
                      size={14}
                      className={cn(
                        'shrink-0 transition-all duration-200',
                        isActive
                          ? 'text-white opacity-100 translate-x-0'
                          : 'text-slate-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0',
                      )}
                    />
                  </>
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-100 shrink-0">
        <motion.button
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all duration-205"
        >
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-rose-50 text-rose-600 shrink-0">
            <LogOut size={18} className="transition-transform group-hover:-translate-x-0.5 duration-200" />
          </span>
          {t('nav.logout')}
        </motion.button>
      </div>
    </div>
  );
}
