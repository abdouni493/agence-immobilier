import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Mail, Lock, LogIn, UserPlus,
  MapPin, Phone, Star, ShieldCheck, User, AtSign,
} from 'lucide-react';
import { useApp } from '@/store/appStore';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { TextField } from '@/components/ui/Field';
import { GradientButton } from '@/components/ui/GradientButton';
import { LanguageToggle } from '@/components/LanguageToggle';
import { staggerContainer, fadeInUp } from '@/animations';

// ─── Decorative blobs (left panel) ───────────────────────────────────────────
function Orb({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-25 pointer-events-none ${className}`}
      animate={{ scale: [1, 1.18, 1], opacity: [0.22, 0.35, 0.22] }}
      transition={{ duration: 7, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// ─── Floating feature badge ───────────────────────────────────────────────────
function FeatureBadge({
  icon, label, delay,
}: { icon: React.ReactNode; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3"
    >
      <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/15 text-white shrink-0">
        {icon}
      </div>
      <span className="text-sm text-white/80 font-medium">{label}</span>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const login = useApp((s) => s.login);
  const signup = useApp((s) => s.signup);
  const storeInfo = useApp((s) => s.storeInfo);
  const loadStoreInfo = useApp((s) => s.loadStoreInfo);

  // Ensure the residence name/logo are loaded whenever the login screen is
  // shown — covers arriving here after logout (client-side nav, no App remount).
  useEffect(() => {
    loadStoreInfo();
  }, [loadStoreInfo]);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [submitting, setSubmitting] = useState(false);

  // Sign-in fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Sign-up (admin account) fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return toast.error(t('login.required'));
    setSubmitting(true);
    try {
      if (await login(identifier, password)) {
        toast.success(t('login.welcome'));
        navigate('/app/dashboard');
      } else {
        toast.error(t('login.error'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !email || !signupPassword || !confirmPassword) {
      return toast.error(t('login.required'));
    }
    if (signupPassword !== confirmPassword) {
      return toast.error(t('login.mismatch'));
    }
    // Split the full name into first/last for the profile record.
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts.shift() ?? '';
    const lastName = parts.join(' ');

    setSubmitting(true);
    try {
      const res = await signup({
        firstName,
        lastName,
        email: email.trim(),
        username: username.trim(),
        password: signupPassword,
      });
      if (res.ok) {
        toast.success(t('login.accountCreated'));
        navigate('/app/dashboard');
      } else {
        toast.error(res.error || t('login.error'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (next: 'signin' | 'signup') => {
    setMode(next);
    setPassword('');
    setSignupPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden bg-slate-50">

      {/* ── Left branding panel ─────────────────────────────────────── */}
      <div className="relative hidden lg:flex lg:w-[52%] flex-col justify-between overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
      >
        {/* Decorative orbs */}
        <Orb className="h-80 w-80 bg-sky-400 -top-16 -left-16" delay={0} />
        <Orb className="h-64 w-64 bg-brand-400 top-1/3 -right-20" delay={2.5} />
        <Orb className="h-96 w-96 bg-sky-600 -bottom-24 left-1/4" delay={1.2} />

        {/* Animated grid lines */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">

          {/* Top: logo + name */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 mb-auto"
          >
            {storeInfo.logo ? (
              <img src={storeInfo.logo} alt={storeInfo.name} className="h-10 w-auto max-w-[120px] object-contain" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/20">
                <Building2 size={20} />
              </div>
            )}
            <span className="text-white font-bold text-lg tracking-wide opacity-90">{storeInfo.name}</span>
          </motion.div>

          {/* Center: hero */}
          <div className="py-16">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 20, delay: 0.15 }}
              className="mb-8"
            >
              {storeInfo.logo ? (
                // Full logo, no frame / no crop — shown directly
                <img
                  src={storeInfo.logo}
                  alt={storeInfo.name}
                  className="h-28 w-auto max-w-[260px] object-contain drop-shadow-2xl"
                />
              ) : (
                <div className="relative inline-block">
                  <div className="grid h-24 w-24 place-items-center rounded-3xl ring-4 ring-white/20 shadow-2xl overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.08))' }}
                  >
                    <Building2 size={44} className="text-white" />
                  </div>
                  {/* Glow ring (fallback icon only) */}
                  <motion.div
                    className="absolute inset-0 rounded-3xl ring-2 ring-sky-300/60"
                    animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              )}
            </motion.div>

            {/* Residence name */}
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-3"
              style={{ textShadow: '0 2px 24px rgba(14,165,233,0.4)' }}
            >
              {storeInfo.name}
            </motion.h1>

            {storeInfo.description && (
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="text-white/60 text-base leading-relaxed max-w-xs mb-8"
              >
                {storeInfo.description}
              </motion.p>
            )}

            {/* Feature badges */}
            <div className="space-y-3 mt-6">
              <FeatureBadge icon={<ShieldCheck size={16} />} label={t('login.featureSecure')} delay={0.6} />
              <FeatureBadge icon={<Star size={16} />} label={t('login.featureManage')} delay={0.75} />
              {storeInfo.address && (
                <FeatureBadge icon={<MapPin size={16} />} label={storeInfo.address} delay={0.9} />
              )}
              {storeInfo.phone && (
                <FeatureBadge icon={<Phone size={16} />} label={storeInfo.phone} delay={1.05} />
              )}
            </div>
          </div>

          {/* Bottom: copyright */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-white/30 text-xs"
          >
            © {new Date().getFullYear()} {storeInfo.name}
          </motion.p>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative bg-white">
        {/* Language toggle */}
        <div className="absolute top-5 end-5 z-10">
          <LanguageToggle />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 26, delay: 0.1 }}
            className="w-full max-w-md"
          >
            {/* Mobile-only logo */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:hidden flex flex-col items-center mb-8"
            >
              {storeInfo.logo ? (
                // Full logo, no frame / no crop
                <img
                  src={storeInfo.logo}
                  alt={storeInfo.name}
                  className="h-20 w-auto max-w-[200px] object-contain mb-3 drop-shadow-lg"
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-2xl text-white shadow-glow mb-3 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
                >
                  <Building2 size={30} />
                </div>
              )}
              <h2 className="text-xl font-extrabold text-ink-primary">{storeInfo.name}</h2>
            </motion.div>

            {/* Form card */}
            <div className="relative bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_40px_rgba(2,132,199,0.10)] p-7 sm:p-9 overflow-hidden">
              {/* Subtle corner accent */}
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-10 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }} />

              <motion.div variants={staggerContainer} initial="initial" animate="animate">
                {/* Header */}
                <motion.div variants={fadeInUp} className="mb-7">
                  <h2 className="text-2xl font-extrabold text-ink-primary">
                    {mode === 'signin' ? t('login.signIn') : t('login.signUpTitle')}
                  </h2>
                  <p className="text-sm text-ink-muted mt-1">
                    {mode === 'signin' ? t('login.subtitle') : t('login.createAccountHint')}
                  </p>
                </motion.div>

                {mode === 'signin' ? (
                  /* ── Sign-in form ── */
                  <motion.form onSubmit={handleLogin} className="space-y-4">
                    <motion.div variants={fadeInUp}>
                      <TextField
                        label={t('login.identifier')}
                        icon={<Mail size={17} />}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="email ou nom d'utilisateur"
                        autoComplete="username"
                        autoFocus
                      />
                    </motion.div>
                    <motion.div variants={fadeInUp}>
                      <TextField
                        label={t('login.password')}
                        type="password"
                        icon={<Lock size={17} />}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                    </motion.div>

                    <motion.div variants={fadeInUp} className="pt-1">
                      <GradientButton
                        type="submit"
                        fullWidth
                        size="lg"
                        icon={<LogIn size={18} />}
                        glow
                        disabled={submitting}
                      >
                        {t('login.signIn')}
                      </GradientButton>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                      >
                        {t('login.createAccount')}
                      </button>
                    </motion.div>
                  </motion.form>
                ) : (
                  /* ── Sign-up (create admin account) form ── */
                  <motion.form onSubmit={handleSignup} className="space-y-4">
                    <motion.div variants={fadeInUp}>
                      <TextField
                        label={t('login.fullName')}
                        icon={<User size={17} />}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t('login.fullName')}
                        autoComplete="name"
                        autoFocus
                      />
                    </motion.div>
                    <motion.div variants={fadeInUp}>
                      <TextField
                        label={t('login.username')}
                        icon={<AtSign size={17} />}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t('login.username')}
                        autoComplete="username"
                      />
                    </motion.div>
                    <motion.div variants={fadeInUp}>
                      <TextField
                        label={t('login.email')}
                        type="email"
                        icon={<Mail size={17} />}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@exemple.com"
                        autoComplete="email"
                      />
                    </motion.div>
                    <motion.div variants={fadeInUp}>
                      <TextField
                        label={t('login.password')}
                        type="password"
                        icon={<Lock size={17} />}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                    </motion.div>
                    <motion.div variants={fadeInUp}>
                      <TextField
                        label={t('login.confirmPassword')}
                        type="password"
                        icon={<Lock size={17} />}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                    </motion.div>

                    <motion.div variants={fadeInUp} className="pt-1">
                      <GradientButton
                        type="submit"
                        fullWidth
                        size="lg"
                        icon={<UserPlus size={18} />}
                        glow
                        disabled={submitting}
                      >
                        {t('login.signUpAction')}
                      </GradientButton>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => switchMode('signin')}
                        className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                      >
                        {t('login.backToSignIn')}
                      </button>
                    </motion.div>
                  </motion.form>
                )}
              </motion.div>
            </div>

            {/* Bottom text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center text-xs text-ink-muted mt-5"
            >
              Système de gestion · {storeInfo.name}
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
