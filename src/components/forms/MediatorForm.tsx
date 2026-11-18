import { useState } from 'react';
import { User, Phone, Mail, MapPin, IdCard, KeyRound, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n';
import { TextField, TextArea, Toggle } from '@/components/ui/Field';
import { GradientButton } from '@/components/ui/GradientButton';
import type { Mediator } from '@/types';

export type MediatorFormData = Omit<Mediator, 'id' | 'createdAt' | 'payments'>;

const empty: MediatorFormData = {
  firstName: '',
  lastName: '',
  phone: '',
  phone2: '',
  email: '',
  address: '',
  city: '',
  cin: '',
  notes: '',
};

export function MediatorForm({
  initial,
  onSave,
  onCancel,
  submitLabel,
  withAccount = false,
}: {
  initial?: Mediator;
  onSave: (data: MediatorFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
  /** Show the optional login-account section (email, username, password). */
  withAccount?: boolean;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<MediatorFormData>(initial ? { ...empty, ...initial } : empty);
  const [error, setError] = useState('');

  /** An account that already exists in Supabase Auth cannot be edited here. */
  const accountExists = !!initial?.authUserId || !!initial?.hasAccount;
  const [hasAccount, setHasAccount] = useState(!!initial?.hasAccount);
  const [accEmail, setAccEmail] = useState(initial?.account?.email ?? '');
  const [accUsername, setAccUsername] = useState(initial?.account?.username ?? '');
  const [accPassword, setAccPassword] = useState('');

  const set = <K extends keyof MediatorFormData>(key: K, value: MediatorFormData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const submit = () => {
    if (!data.firstName.trim() || !data.lastName.trim() || !data.phone.trim()) {
      setError(t('login.required'));
      return;
    }
    if (withAccount && hasAccount && !accountExists) {
      if (!accEmail.trim() || !accUsername.trim() || !accPassword) {
        setError(t('mediators.accountRequired'));
        return;
      }
      if (accPassword.length < 6) {
        setError(t('mediators.passwordShort'));
        return;
      }
    }
    setError('');
    const { permissions: _p, authUserId: _a, hasAccount: _h, account: _c, ...base } = data;
    onSave(
      withAccount && hasAccount && !accountExists
        ? { ...base, hasAccount: true, account: { email: accEmail.trim(), username: accUsername.trim(), password: accPassword } }
        : base,
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <User size={16} className="text-brand-400" />
        <h4 className="text-sm font-bold text-ink-primary uppercase tracking-wide">
          {t('clients.personalInfo')}
        </h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField label={t('login.firstName')} required value={data.firstName} onChange={(e) => set('firstName', e.target.value)} />
        <TextField label={t('login.lastName')} required value={data.lastName} onChange={(e) => set('lastName', e.target.value)} />
        <TextField label={t('clients.phoneMain')} required icon={<Phone size={16} />} value={data.phone} onChange={(e) => set('phone', e.target.value)} />
        <TextField label={t('clients.phoneSecond')} icon={<Phone size={16} />} value={data.phone2} onChange={(e) => set('phone2', e.target.value)} />
        <TextField label={t('common.email')} type="email" icon={<Mail size={16} />} value={data.email} onChange={(e) => set('email', e.target.value)} />
        <TextField label={t('clients.city')} icon={<MapPin size={16} />} value={data.city} onChange={(e) => set('city', e.target.value)} />
        <TextField label={t('common.address')} value={data.address} onChange={(e) => set('address', e.target.value)} />
        <TextField label={t('mediators.cin')} icon={<IdCard size={16} />} value={data.cin} onChange={(e) => set('cin', e.target.value)} />
        <TextArea wrapClassName="sm:col-span-2" label={t('mediators.notes')} value={data.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>

      {withAccount && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-brand-400" />
            <h4 className="text-sm font-bold text-ink-primary uppercase tracking-wide">{t('mediators.account')}</h4>
          </div>
          {accountExists ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-ink-primary">{t('mediators.accountActive')}</p>
                <p className="text-xs text-ink-secondary truncate">
                  {initial?.account?.username ? `@${initial.account.username} · ` : ''}{initial?.account?.email}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-slate-100/70 border border-slate-200 p-4">
                <Toggle checked={hasAccount} onChange={setHasAccount} label={t('mediators.hasAccount')} />
                <p className="text-[11px] text-ink-muted mt-1.5">{t('mediators.accountHint')}</p>
              </div>
              {hasAccount && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField label={t('login.username')} required value={accUsername} onChange={(e) => setAccUsername(e.target.value)} icon={<User size={16} />} />
                  <TextField label={t('common.email')} required type="email" value={accEmail} onChange={(e) => setAccEmail(e.target.value)} icon={<Mail size={16} />} />
                  <TextField wrapClassName="sm:col-span-2" label={t('login.password')} required type="password" value={accPassword} onChange={(e) => setAccPassword(e.target.value)} icon={<KeyRound size={16} />} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-3 justify-end pt-2">
        {onCancel && (
          <GradientButton variant="glass" onClick={onCancel}>
            {t('common.cancel')}
          </GradientButton>
        )}
        <GradientButton onClick={submit}>{submitLabel ?? t('common.save')}</GradientButton>
      </div>
    </div>
  );
}
