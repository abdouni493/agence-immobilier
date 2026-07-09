import { useState } from 'react';
import { User, Phone, Mail, MapPin, IdCard } from 'lucide-react';
import { useI18n } from '@/i18n';
import { TextField, TextArea } from '@/components/ui/Field';
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
}: {
  initial?: Mediator;
  onSave: (data: MediatorFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<MediatorFormData>(initial ? { ...empty, ...initial } : empty);
  const [error, setError] = useState('');

  const set = <K extends keyof MediatorFormData>(key: K, value: MediatorFormData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const submit = () => {
    if (!data.firstName.trim() || !data.lastName.trim() || !data.phone.trim()) {
      setError(t('login.required'));
      return;
    }
    setError('');
    onSave(data);
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
