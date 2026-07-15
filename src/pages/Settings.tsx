import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, Building2, UserCog, Database, Save, Upload, Download,
  ImagePlus, KeyRound, AlertTriangle,
} from 'lucide-react';
import { useApp } from '@/store/appStore';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, Tabs } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientCard } from '@/components/ui/GradientCard';
import { TextField, TextArea } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { downloadJSON, initials, todayISO } from '@/lib/utils';
import { uploadImage } from '@/lib/storage';
import type { StoreInfo } from '@/types';

export default function Settings() {
  const { t } = useI18n();
  const [tab, setTab] = useState<'residence' | 'account' | 'database'>('residence');

  return (
    <div>
      <PageHeader icon={<SettingsIcon size={24} />} title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="mb-6">
        <Tabs<'residence' | 'account' | 'database'>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'residence', label: t('settings.tabResidence'), icon: <Building2 size={15} /> },
            { value: 'account', label: t('settings.tabAccount'), icon: <UserCog size={15} /> },
            { value: 'database', label: t('settings.tabDatabase'), icon: <Database size={15} /> },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
          {tab === 'residence' && <ResidenceSettings />}
          {tab === 'account' && <AccountSettings />}
          {tab === 'database' && <DatabaseSettings />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ResidenceSettings() {
  const { t } = useI18n();
  const toast = useToast();
  const storeInfo = useApp((s) => s.storeInfo);
  const updateStoreInfo = useApp((s) => s.updateStoreInfo);
  const [form, setForm] = useState<StoreInfo>({ ...storeInfo });
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof StoreInfo>(k: K, v: StoreInfo[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      const url = await uploadImage('logos', file, 'residence/');
      set('logo', url);
      toast.success(t('settings.logoLoaded'));
    } catch {
      toast.error(t('toast.error'));
    }
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error(t('login.required'));
    await updateStoreInfo(form);
    toast.success(t('settings.savedOk'));
  };

  return (
    <GradientCard className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-grad-primary text-white overflow-hidden shrink-0">
          {form.logo ? <img src={form.logo} alt="" className="h-full w-full object-cover" /> : <Building2 size={32} />}
        </div>
        <div>
          <GradientButton variant="glass" icon={<ImagePlus size={16} />} onClick={() => fileRef.current?.click()}>{t('settings.logo')}</GradientButton>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
          {form.logo && <button onClick={() => set('logo', null)} className="ms-2 text-xs text-rose-600">{t('common.delete')}</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField wrapClassName="sm:col-span-2" label={t('settings.residenceName')} required value={form.name} onChange={(e) => set('name', e.target.value)} />
        <TextArea wrapClassName="sm:col-span-2" label={t('common.description')} value={form.description} onChange={(e) => set('description', e.target.value)} />
        <TextField label={t('common.email')} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        <TextField label={t('common.phone')} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        <TextField wrapClassName="sm:col-span-2" label={t('common.address')} value={form.address} onChange={(e) => set('address', e.target.value)} />
        <div className="sm:col-span-2 pt-1">
          <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wide">Informations légales</p>
        </div>
        <TextField label="NIF" value={form.nif} onChange={(e) => set('nif', e.target.value)} />
        <TextField label="NIS" value={form.nis} onChange={(e) => set('nis', e.target.value)} />
        <TextField label="Article" value={form.article} onChange={(e) => set('article', e.target.value)} />
        <TextField label="RC" value={form.rc} onChange={(e) => set('rc', e.target.value)} />
      </div>

      <div className="mt-6 flex justify-end">
        <GradientButton icon={<Save size={17} />} onClick={save}>{t('common.save')}</GradientButton>
      </div>
    </GradientCard>
  );
}

function AccountSettings() {
  const { t } = useI18n();
  const toast = useToast();
  const user = useApp((s) => s.user);
  const updateAccount = useApp((s) => s.updateAccount);
  const changePassword = useApp((s) => s.changePassword);
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.name.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState(user?.name.split(' ').slice(1).join(' ') ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? null);

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const onAvatar = async (file: File | undefined) => {
    if (!file) return;
    try {
      const url = await uploadImage('avatars', file, `users/${user?.id}/`);
      setAvatar(url);
    } catch {
      toast.error(t('toast.error'));
    }
  };

  const saveProfile = async () => {
    await updateAccount({ name: `${firstName} ${lastName}`.trim(), username, email, avatar });
    toast.success(t('settings.savedOk'));
  };

  const savePassword = async () => {
    if (!oldPw || !newPw) return toast.error(t('login.required'));
    if (newPw !== confirmPw) return toast.error(t('login.mismatch'));
    if (await changePassword(oldPw, newPw)) {
      toast.success(t('settings.savedOk'));
      setOldPw(''); setNewPw(''); setConfirmPw('');
    } else {
      toast.error(t('settings.oldPassword') + ' ✗');
    }
  };

  return (
    <div className="space-y-4">
      <GradientCard className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-grad-rose text-white text-xl font-bold overflow-hidden shrink-0">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials(user?.name ?? '')}
          </div>
          <div>
            <GradientButton variant="glass" icon={<ImagePlus size={16} />} onClick={() => fileRef.current?.click()}>{t('settings.profilePhoto')}</GradientButton>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={t('login.firstName')} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <TextField label={t('login.lastName')} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <TextField label={t('login.username')} value={username} onChange={(e) => setUsername(e.target.value)} />
          <TextField label={t('common.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="mt-6 flex justify-end">
          <GradientButton icon={<Save size={17} />} onClick={saveProfile}>{t('common.save')}</GradientButton>
        </div>
      </GradientCard>

      <GradientCard className="p-6">
        <h3 className="flex items-center gap-2 font-bold text-ink-primary mb-4"><KeyRound size={18} className="text-brand-400" /> {t('settings.changePassword')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TextField label={t('settings.oldPassword')} type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
          <TextField label={t('settings.newPassword')} type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <TextField label={t('login.confirmPassword')} type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
        </div>
        <div className="mt-6 flex justify-end">
          <GradientButton variant="secondary" icon={<KeyRound size={17} />} onClick={savePassword}>{t('settings.changePassword')}</GradientButton>
        </div>
      </GradientCard>
    </div>
  );
}

function DatabaseSettings() {
  const { t } = useI18n();
  const toast = useToast();
  const exportData = useApp((s) => s.exportData);
  const importData = useApp((s) => s.importData);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingJson, setPendingJson] = useState<string | null>(null);

  const handleExport = () => {
    const json = exportData();
    downloadJSON(`residence-backup-${todayISO()}.json`, json);
    toast.success(t('common.export'));
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setPendingJson(text);
  };

  return (
    <div className="space-y-4">
      <GradientCard className="p-6">
        <h3 className="flex items-center gap-2 font-bold text-ink-primary mb-1"><Download size={18} className="text-emerald-600" /> {t('settings.backup')}</h3>
        <p className="text-sm text-ink-secondary mb-4">Exporte toutes les données (clients, réservations, chambres, etc.) en JSON.</p>
        <GradientButton variant="success" icon={<Download size={17} />} onClick={handleExport}>{t('settings.downloadBackup')}</GradientButton>
      </GradientCard>

      <GradientCard className="p-6">
        <h3 className="flex items-center gap-2 font-bold text-ink-primary mb-1"><Upload size={18} className="text-amber-600" /> {t('settings.restore')}</h3>
        <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-500/10 border border-amber-400/30 rounded-xl px-3.5 py-2.5 mb-4">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{t('settings.restoreWarning')}</span>
        </div>
        <GradientButton variant="glass" icon={<Upload size={17} />} onClick={() => fileRef.current?.click()}>{t('settings.importBackup')}</GradientButton>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </GradientCard>

      <ConfirmDialog
        open={!!pendingJson}
        onClose={() => setPendingJson(null)}
        danger
        title={t('settings.restore')}
        message={t('settings.restoreWarning')}
        confirmLabel={t('common.import')}
        onConfirm={() => {
          if (pendingJson && importData(pendingJson)) toast.success(t('settings.restoredOk'));
          else toast.error(t('toast.error'));
          setPendingJson(null);
        }}
      />
    </div>
  );
}
