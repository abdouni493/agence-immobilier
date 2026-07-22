import { useState } from 'react';
import { User, Phone, Mail, MapPin, IdCard, ImagePlus, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { TextField, SelectField, RadioGroup, Label } from '@/components/ui/Field';
import { GradientButton } from '@/components/ui/GradientButton';
import { uploadImage } from '@/lib/storage';
import type { Client, DocumentType, Sexe } from '@/types';

export type ClientFormData = Omit<Client, 'id' | 'createdAt'>;

const empty: ClientFormData = {
  firstName: '',
  lastName: '',
  birthDate: '',
  birthPlace: '',
  sexe: 'M',
  profession: '',
  address: '',
  city: '',
  phone: '',
  phone2: '',
  email: '',
  documentType: 'cin',
  documentNumber: '',
  documentIssueDate: '',
  documentExpiryDate: '',
  documentIssuePlace: '',
  photos: [],
};

export function ClientForm({
  initial,
  onSave,
  onCancel,
  submitLabel,
}: {
  initial?: Client;
  onSave: (data: ClientFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<ClientFormData>(initial ? { ...empty, ...initial } : empty);
  const [error, setError] = useState('');

  const set = <K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const handlePhotos = async (files: FileList | null) => {
    if (!files) return;
    const urls = await Promise.all(Array.from(files).map((f) => uploadImage('client-photos', f, 'clients/')));
    set('photos', [...(data.photos ?? []), ...urls]);
  };

  const submit = () => {
    if (!data.firstName.trim() || !data.lastName.trim() || !data.phone.trim()) {
      setError(t('login.required'));
      return;
    }
    setError('');
    onSave(data);
  };

  return (
    <div className="space-y-6">
      {/* Personal info */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <User size={16} className="text-brand-400" />
          <h4 className="text-sm font-bold text-ink-primary uppercase tracking-wide">
            {t('clients.personalInfo')}
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label={t('login.firstName')} required value={data.firstName} onChange={(e) => set('firstName', e.target.value)} />
          <TextField label={t('login.lastName')} required value={data.lastName} onChange={(e) => set('lastName', e.target.value)} />
          <TextField label={t('clients.birthDate')} type="date" value={data.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
          <TextField label={t('clients.birthPlace')} value={data.birthPlace} onChange={(e) => set('birthPlace', e.target.value)} />
          <div>
            <Label>{t('clients.sexe')}</Label>
            <RadioGroup<Sexe>
              value={data.sexe ?? 'M'}
              onChange={(v) => set('sexe', v)}
              options={[
                { value: 'M', label: t('clients.male') },
                { value: 'F', label: t('clients.female') },
              ]}
            />
          </div>
          <TextField label={t('clients.profession')} value={data.profession} onChange={(e) => set('profession', e.target.value)} />
          <TextField label={t('clients.phoneMain')} required icon={<Phone size={16} />} value={data.phone} onChange={(e) => set('phone', e.target.value)} />
          <TextField label={t('clients.phoneSecond')} icon={<Phone size={16} />} value={data.phone2} onChange={(e) => set('phone2', e.target.value)} />
          <TextField label={t('clients.city')} icon={<MapPin size={16} />} value={data.city} onChange={(e) => set('city', e.target.value)} />
          <TextField label={t('common.email')} type="email" icon={<Mail size={16} />} value={data.email} onChange={(e) => set('email', e.target.value)} />
          <TextField wrapClassName="sm:col-span-2" label={t('common.address')} value={data.address} onChange={(e) => set('address', e.target.value)} />
        </div>
      </section>

      {/* ID document */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <IdCard size={16} className="text-brand-400" />
          <h4 className="text-sm font-bold text-ink-primary uppercase tracking-wide">
            {t('clients.idDocument')}
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField
            label={t('clients.docType')}
            value={data.documentType}
            onChange={(e) => set('documentType', e.target.value as DocumentType)}
          >
            <option value="permis">{t('clients.docPermis')}</option>
            <option value="cin">{t('clients.docCin')}</option>
            <option value="passeport">{t('clients.docPassport')}</option>
          </SelectField>
          <TextField label={t('clients.docNumber')} value={data.documentNumber} onChange={(e) => set('documentNumber', e.target.value)} />
          <TextField label={t('clients.issueDate')} type="date" value={data.documentIssueDate} onChange={(e) => set('documentIssueDate', e.target.value)} />
          <TextField label={t('clients.expiryDate')} type="date" value={data.documentExpiryDate} onChange={(e) => set('documentExpiryDate', e.target.value)} />
          <TextField wrapClassName="sm:col-span-2" label={t('clients.issuePlace')} value={data.documentIssuePlace} onChange={(e) => set('documentIssuePlace', e.target.value)} />
        </div>
      </section>

      {/* Documents / photos */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ImagePlus size={16} className="text-brand-400" />
          <h4 className="text-sm font-bold text-ink-primary uppercase tracking-wide">
            {t('clients.documents')}
          </h4>
        </div>
        <div className="flex flex-wrap gap-3">
          {(data.photos ?? []).map((url, i) => (
            <div key={i} className="relative h-24 w-24 rounded-xl overflow-hidden border border-slate-200 group">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => set('photos', (data.photos ?? []).filter((_, idx) => idx !== i))}
                className="absolute top-1 end-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <label className="h-24 w-24 rounded-xl border-2 border-dashed border-slate-300 grid place-items-center cursor-pointer hover:border-brand-400/50 hover:bg-slate-100/70 transition-colors text-ink-muted">
            <div className="flex flex-col items-center gap-1">
              <ImagePlus size={20} />
              <span className="text-[10px] text-center px-1">{t('clients.addPhoto')}</span>
            </div>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotos(e.target.files)} />
          </label>
        </div>
      </section>

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
