import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HardHat, Plus, Pencil, Trash2, Eye, KeyRound, Wallet, Phone, CalendarDays, Check,
  ArrowLeft, ArrowRight, Shield, Coins, CalendarX, User, Briefcase, Building2, History,
} from 'lucide-react';
import { useApp, useCurrentPermissions, can } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, EmptyState, SearchInput, Stat, Tabs } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientCard } from '@/components/ui/GradientCard';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextField, SelectField, Toggle, RadioGroup, Checkbox } from '@/components/ui/Field';
import { workerPayCalc, workerCommissions } from '@/store/selectors';
import { clientName } from '@/lib/lookups';
import { MODULE_ACTIONS, MODULE_ORDER, fullPermissions } from '@/data/constants';
import { staggerContainer, listItem } from '@/animations';
import { formatDA, formatDate, todayISO, initials, cn } from '@/lib/utils';
import type { Worker, SalaryType, Permissions, ModuleKey, ActionKey } from '@/types';

export default function Workers() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const workers = useApp((s) => s.workers);
  const deleteWorker = useApp((s) => s.deleteWorker);
  const perms = useCurrentPermissions();

  const [search, setSearch] = useState('');
  const [wizardWorker, setWizardWorker] = useState<Worker | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [permWorker, setPermWorker] = useState<Worker | null>(null);
  const [profileWorker, setProfileWorker] = useState<Worker | null>(null);
  const [toDelete, setToDelete] = useState<Worker | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? workers.filter((w) => w.name.toLowerCase().includes(q) || w.role.toLowerCase().includes(q)) : workers;
  }, [workers, search]);

  // keep live reference for modals after store updates
  const liveProfile = profileWorker ? workers.find((w) => w.id === profileWorker.id) ?? null : null;
  const livePerm = permWorker ? workers.find((w) => w.id === permWorker.id) ?? null : null;

  return (
    <div>
      <PageHeader
        icon={<HardHat size={24} />}
        title={t('workers.title')}
        subtitle={t('workers.subtitle')}
        actions={
          can(perms, 'workers', 'create') && (
            <GradientButton icon={<Plus size={18} />} onClick={() => { setWizardWorker(null); setWizardOpen(true); }}>
              {t('workers.new')}
            </GradientButton>
          )
        }
      />

      <div className="mb-5 max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder={t('common.search')} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<HardHat size={36} />} title={t('common.noResults')} hint={t('common.emptyHint')} />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((w) => (
              <motion.div key={w.id} variants={listItem} layout exit="exit">
                <GradientCard
                  className="p-5 h-full flex flex-col border border-white/10 shadow-xl"
                  style={{ background: 'linear-gradient(145deg, #1b1f25 0%, #22272f 55%, #2a3039 100%)' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 text-white font-bold shrink-0">
                      {initials(w.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white truncate">{w.name}</h3>
                      <Badge className="mt-1 bg-sky-500/20 text-sky-200 border-sky-500/30">{w.role}</Badge>
                    </div>
                    <Badge
                      tone={w.active ? 'success' : 'neutral'}
                      dot
                      className={w.active ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-white/10 text-slate-350 border-white/10'}
                    >
                      {w.active ? t('workers.active') : t('workers.inactive')}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm text-ink-secondary flex-1">
                    <p className="flex items-center gap-2"><Phone size={14} className="text-sky-300" /> {w.phone}</p>
                    <p className="flex items-center gap-2"><CalendarDays size={14} className="text-sky-300" /> {formatDate(w.startDate, lang)}</p>
                    {w.hasSalary && (
                      <p className="flex items-center gap-2"><Wallet size={14} className="text-sky-300" /> {w.salaryType === 'monthly' ? t('workers.monthly') : t('workers.daily')} · {formatDA(w.salaryAmount ?? 0)}</p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 border-t border-white/10 pt-3 flex-wrap">
                    <button
                      onClick={() => setProfileWorker(w)}
                      className="btn-card-action btn-action-view"
                      title={t('common.view')}
                    >
                      <Eye size={15} />
                    </button>
                    {can(perms, 'workers', 'edit') && (
                      <button
                        onClick={() => { setWizardWorker(w); setWizardOpen(true); }}
                        className="btn-card-action btn-action-edit"
                        title={t('common.edit')}
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {can(perms, 'workers', 'edit') && w.hasAccount && (
                      <button
                        onClick={() => setPermWorker(w)}
                        className="btn-card-action btn-action-perm"
                        title={t('workers.permissions')}
                      >
                        <KeyRound size={15} />
                      </button>
                    )}
                    {can(perms, 'workers', 'pay') && (
                      <button
                        onClick={() => setProfileWorker(w)}
                        className="ms-auto btn-card-action btn-action-pay"
                        title={t('workers.payment')}
                      >
                        <Wallet size={15} />
                      </button>
                    )}
                    {can(perms, 'workers', 'delete') && (
                      <button
                        onClick={() => setToDelete(w)}
                        className="btn-card-action btn-action-delete"
                        title={t('common.delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </GradientCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {wizardOpen && <WorkerWizard worker={wizardWorker} onClose={() => { setWizardOpen(false); setWizardWorker(null); }} />}
      {livePerm && <PermissionsModal worker={livePerm} onClose={() => setPermWorker(null)} />}
      {liveProfile && <WorkerProfile worker={liveProfile} onClose={() => setProfileWorker(null)} />}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) { await deleteWorker(toDelete.id); toast.success(t('toast.deleted')); } }}
        message={toDelete ? `${t('common.deleteMsg')} (${toDelete.name})` : ''}
      />
    </div>
  );
}

// ---------------- WIZARD ----------------
function WorkerWizard({ worker, onClose }: { worker: Worker | null; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const roles = useApp((s) => s.roles);
  const addRole = useApp((s) => s.addRole);
  const addWorker = useApp((s) => s.addWorker);
  const updateWorker = useApp((s) => s.updateWorker);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(worker?.name ?? '');
  const [birthDate, setBirthDate] = useState(worker?.birthDate ?? '');
  const [cin, setCin] = useState(worker?.cin ?? '');
  const [phone, setPhone] = useState(worker?.phone ?? '');
  const [role, setRole] = useState(worker?.role ?? roles[0] ?? '');
  const [startDate, setStartDate] = useState(worker?.startDate ?? todayISO());
  const [newRole, setNewRole] = useState('');
  const [showRoleInput, setShowRoleInput] = useState(false);

  const [hasSalary, setHasSalary] = useState(worker?.hasSalary ?? true);
  const [salaryType, setSalaryType] = useState<SalaryType>(worker?.salaryType ?? 'monthly');
  const [salaryAmount, setSalaryAmount] = useState(String(worker?.salaryAmount ?? ''));

  const [hasAccount, setHasAccount] = useState(worker?.hasAccount ?? false);
  const [email, setEmail] = useState(worker?.account?.email ?? '');
  const [username, setUsername] = useState(worker?.account?.username ?? '');
  const [password, setPassword] = useState(worker?.account?.password ?? '');

  const steps = [t('workers.stepInfo'), t('workers.stepPayment'), t('workers.stepAccount')];

  const save = async () => {
    if (!name.trim() || !phone.trim() || !role) { setStep(0); return toast.error(t('login.required')); }
    const payload = {
      name: name.trim(), birthDate, cin, phone: phone.trim(), role, startDate,
      hasSalary, salaryType: hasSalary ? salaryType : undefined,
      salaryAmount: hasSalary ? Number(salaryAmount) : undefined,
      hasAccount,
      account: hasAccount ? { email, username, password } : undefined,
      active: worker?.active ?? true,
    };
    if (worker) {
      await updateWorker(worker.id, payload);
      toast.success(t('toast.updated'));
    } else {
      await addWorker({ ...payload, permissions: hasAccount ? { dashboard: ['view'] } : {} });
      toast.success(t('toast.created'));
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={worker ? `${t('common.edit')} · ${worker.name}` : t('workers.new')}
      size="md"
      footer={
        <div className="flex items-center justify-between">
          <GradientButton variant="glass" icon={<ArrowLeft size={16} />} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>{t('common.previous')}</GradientButton>
          {step < 2 ? (
            <GradientButton iconRight={<ArrowRight size={16} />} onClick={() => setStep((s) => s + 1)}>{t('common.next')}</GradientButton>
          ) : (
            <GradientButton icon={<Check size={18} />} onClick={save} glow>{t('common.save')}</GradientButton>
          )}
        </div>
      }
    >
      {/* mini stepper */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={cn('grid h-7 w-7 place-items-center rounded-full text-xs font-bold shrink-0', i < step ? 'bg-grad-success text-white' : i === step ? 'bg-grad-primary text-white' : 'bg-slate-100 text-ink-muted')}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={cn('text-xs', i === step ? 'text-ink-primary font-medium' : 'text-ink-muted')}>{label}</span>
            {i < steps.length - 1 && <div className="flex-1 h-0.5 bg-slate-100" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="min-h-[260px]">
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField wrapClassName="sm:col-span-2" label={t('workers.fullName')} required value={name} onChange={(e) => setName(e.target.value)} icon={<User size={16} />} />
              <TextField label={t('clients.birthDate')} type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              <TextField label={`${t('clients.docNumber')} (CIN)`} value={cin} onChange={(e) => setCin(e.target.value)} />
              <TextField label={t('common.phone')} required value={phone} onChange={(e) => setPhone(e.target.value)} icon={<Phone size={16} />} />
              <TextField label={t('workers.startDate')} required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <div className="sm:col-span-2">
                <SelectField label={t('workers.role')} value={role} onChange={(e) => setRole(e.target.value)}>
                  {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                </SelectField>
                {!showRoleInput ? (
                  <button type="button" onClick={() => setShowRoleInput(true)} className="mt-1.5 text-xs text-brand-600 flex items-center gap-1"><Plus size={13} /> {t('workers.newRole')}</button>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder={t('workers.newRole')} className="flex-1 h-9 rounded-lg bg-slate-100/70 border border-slate-200 px-3 text-sm text-ink-primary outline-none focus:border-brand-400/60" />
                    <button type="button" onClick={() => { if (newRole.trim()) { addRole(newRole.trim()); setRole(newRole.trim()); setNewRole(''); setShowRoleInput(false); } }} className="grid h-9 w-9 place-items-center rounded-lg bg-grad-primary text-white"><Check size={16} /></button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="rounded-xl bg-slate-100/70 border border-slate-200 p-4">
                <Toggle checked={hasSalary} onChange={setHasSalary} label={t('workers.hasSalary')} />
              </div>
              {hasSalary && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                  <RadioGroup<SalaryType>
                    value={salaryType}
                    onChange={setSalaryType}
                    options={[{ value: 'daily', label: t('workers.daily') }, { value: 'monthly', label: t('workers.monthly') }]}
                  />
                  <TextField label={`${t('common.amount')} (DA)`} type="number" value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} />
                </motion.div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="rounded-xl bg-slate-100/70 border border-slate-200 p-4">
                <Toggle checked={hasAccount} onChange={setHasAccount} label={t('workers.hasAccount')} />
              </div>
              {hasAccount && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 gap-4">
                  <TextField label={t('common.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <TextField label={t('login.username')} value={username} onChange={(e) => setUsername(e.target.value)} />
                  <TextField label={t('login.password')} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <p className="text-xs text-ink-muted">{t('workers.permissions')} → {t('common.edit')} après création (bouton 🔑).</p>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}

// ---------------- PERMISSIONS ----------------
function PermissionsModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const setWorkerPermissions = useApp((s) => s.setWorkerPermissions);
  const [perms, setPerms] = useState<Permissions>({ ...worker.permissions });

  const moduleEnabled = (m: ModuleKey) => !!perms[m] && perms[m]!.length > 0;
  const toggleModule = (m: ModuleKey) => {
    setPerms((p) => {
      const next = { ...p };
      if (moduleEnabled(m)) delete next[m];
      else next[m] = ['view'];
      return next;
    });
  };
  const toggleAction = (m: ModuleKey, a: ActionKey) => {
    setPerms((p) => {
      const cur = new Set(p[m] ?? []);
      if (cur.has(a)) cur.delete(a);
      else cur.add(a);
      return { ...p, [m]: [...cur] };
    });
  };
  const allOn = MODULE_ORDER.every((m) => moduleEnabled(m));
  const toggleAll = () => setPerms(allOn ? {} : fullPermissions());

  const save = async () => {
    try {
      await setWorkerPermissions(worker.id, perms);
      toast.success(t('toast.saved'));
      onClose();
    } catch {
      toast.error(t('toast.error'));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('workers.permissions')}
      subtitle={worker.name}
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <GradientButton variant="glass" icon={<Shield size={16} />} onClick={toggleAll}>{t('workers.toggleAll')}</GradientButton>
          <GradientButton onClick={save}>{t('common.save')}</GradientButton>
        </div>
      }
    >
      <div className="space-y-3">
        {MODULE_ORDER.map((m) => (
          <div key={m} className={cn('rounded-xl border p-4 transition-colors', moduleEnabled(m) ? 'border-brand-400/40 bg-brand-500/5' : 'border-slate-200 bg-slate-100/70')}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink-primary">{t(`nav.${m}`)}</span>
              <Toggle checked={moduleEnabled(m)} onChange={() => toggleModule(m)} />
            </div>
            {moduleEnabled(m) && (
              <div className="mt-3 flex flex-wrap gap-3 pt-3 border-t border-slate-200">
                {MODULE_ACTIONS[m].map((a) => (
                  <Checkbox key={a} checked={perms[m]?.includes(a) ?? false} onChange={() => toggleAction(m, a)} label={actionLabel(a, t)} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function actionLabel(a: ActionKey, t: (k: string) => string): string {
  const map: Record<ActionKey, string> = {
    view: t('common.view'), create: t('common.create'), edit: t('common.edit'),
    delete: t('common.delete'), print: t('common.print'), pay: t('common.pay'),
  };
  return map[a];
}

// ---------------- PROFILE ----------------
function WorkerProfile({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const addAdvance = useApp((s) => s.addWorkerAdvance);
  const addAbsence = useApp((s) => s.addWorkerAbsence);
  const addPayment = useApp((s) => s.addWorkerPayment);

  const data = useAppData();
  const [tab, setTab] = useState<'info' | 'advances' | 'absences' | 'payment' | 'history'>('info');
  // The pay slip only ever counts what has NOT been settled yet: pending
  // agency-fee commissions, pending absences and pending advances.
  const calc = useMemo(() => workerPayCalc(worker, data.reservations), [worker, data.reservations]);
  const allCommissions = useMemo(
    () => workerCommissions(worker.id, data.reservations),
    [worker.id, data.reservations],
  );
  const paidCommissions = useMemo(() => allCommissions.filter((c) => c.settled), [allCommissions]);
  const pendingAdvances = useMemo(() => worker.advances.filter((a) => !a.deducted), [worker.advances]);
  const pendingAbsences = useMemo(() => worker.absences.filter((a) => !a.deducted), [worker.absences]);
  const [netEdit, setNetEdit] = useState('');
  const [payDate, setPayDate] = useState(todayISO());
  const [payDesc, setPayDesc] = useState('');

  // advance form
  const [advAmount, setAdvAmount] = useState('');
  const [advDesc, setAdvDesc] = useState('');
  // absence form
  const [absCost, setAbsCost] = useState('');
  const [absDesc, setAbsDesc] = useState('');

  const net = netEdit === '' ? calc.net : Number(netEdit);

  return (
    <Modal open onClose={onClose} title={worker.name} subtitle={worker.role} size="lg">
      <div className="space-y-5">
        <Tabs<'info' | 'advances' | 'absences' | 'payment' | 'history'>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'info', label: t('workers.stepInfo'), icon: <User size={15} /> },
            { value: 'advances', label: t('workers.advances'), icon: <Coins size={15} /> },
            { value: 'absences', label: t('workers.absences'), icon: <CalendarX size={15} /> },
            { value: 'payment', label: t('workers.payment'), icon: <Wallet size={15} /> },
            { value: 'history', label: t('workers.history'), icon: <History size={15} /> },
          ]}
        />

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {tab === 'info' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Stat label={t('common.phone')} value={worker.phone} />
                <Stat label={t('workers.startDate')} value={formatDate(worker.startDate, lang)} />
                <Stat label={t('workers.role')} value={worker.role} />
                {worker.birthDate && <Stat label={t('clients.birthDate')} value={formatDate(worker.birthDate, lang)} />}
                {worker.cin && <Stat label="CIN" value={worker.cin} />}
                {worker.hasSalary && <Stat label={t('workers.payment')} value={`${worker.salaryType === 'monthly' ? t('workers.monthly') : t('workers.daily')} · ${formatDA(worker.salaryAmount ?? 0)}`} />}
                <Stat label={t('common.status')} value={worker.active ? t('workers.active') : t('workers.inactive')} tone={worker.active ? 'success' : 'default'} />
                {worker.hasAccount && worker.account && <Stat label={t('login.username')} value={worker.account.username} />}
              </div>
            )}

            {tab === 'advances' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-2">
                  <TextField label={t('common.amount')} type="number" value={advAmount} onChange={(e) => setAdvAmount(e.target.value)} wrapClassName="flex-1 min-w-[120px]" />
                  <TextField label={t('common.description')} value={advDesc} onChange={(e) => setAdvDesc(e.target.value)} wrapClassName="flex-1 min-w-[140px]" />
                  <GradientButton icon={<Plus size={16} />} onClick={async () => {
                    if (!advAmount) return toast.error(t('login.required'));
                    await addAdvance(worker.id, { date: todayISO(), description: advDesc, amount: Number(advAmount) });
                    setAdvAmount(''); setAdvDesc(''); toast.success(t('toast.created'));
                  }}>{t('common.add')}</GradientButton>
                </div>
                <ListBlock items={pendingAdvances.map((a) => ({ id: a.id, left: a.description || t('workers.advances'), date: a.date, amount: a.amount }))} lang={lang} empty={t('workers.noPending')} />
                <p className="text-[11px] text-ink-muted">{t('workers.historyHint')}</p>
              </div>
            )}

            {tab === 'absences' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-2">
                  <TextField label={t('workers.cost')} type="number" value={absCost} onChange={(e) => setAbsCost(e.target.value)} wrapClassName="flex-1 min-w-[120px]" />
                  <TextField label={t('common.description')} value={absDesc} onChange={(e) => setAbsDesc(e.target.value)} wrapClassName="flex-1 min-w-[140px]" />
                  <GradientButton icon={<Plus size={16} />} onClick={async () => {
                    if (!absCost) return toast.error(t('login.required'));
                    await addAbsence(worker.id, { date: todayISO(), description: absDesc, cost: Number(absCost) });
                    setAbsCost(''); setAbsDesc(''); toast.success(t('toast.created'));
                  }}>{t('common.add')}</GradientButton>
                </div>
                <ListBlock items={pendingAbsences.map((a) => ({ id: a.id, left: a.description || t('workers.absences'), date: a.date, amount: a.cost, negative: true }))} lang={lang} empty={t('workers.noPending')} />
                <p className="text-[11px] text-ink-muted">{t('workers.historyHint')}</p>
              </div>
            )}

            {tab === 'payment' && (
              <div className="space-y-4">
                {/* Pending agency-fee commissions: each one shows its location */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Briefcase size={14} /> {t('workers.commissions')}
                    </p>
                    <span className="text-sm font-extrabold text-amber-700">{formatDA(calc.commissionsTotal)}</span>
                  </div>
                  {calc.commissions.length === 0 ? (
                    <p className="text-sm text-ink-muted text-center py-3">{t('fee.noCommissions')}</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {calc.commissions.map((c) => (
                        <div key={c.reservationId} className="rounded-xl border border-amber-200 bg-white px-4 py-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-ink-primary flex items-center gap-1.5">
                                <Building2 size={13} className="text-amber-500 shrink-0" />
                                {t('fee.locationRef')} {c.code}
                              </p>
                              <p className="text-xs text-ink-secondary mt-0.5 truncate">{clientName(data, c.clientId)}</p>
                              <p className="text-[11px] text-ink-muted mt-0.5">
                                {formatDate(c.checkIn, lang)} → {formatDate(c.checkOut, lang)}
                              </p>
                              <p className="text-[11px] text-amber-700 mt-0.5 font-medium">
                                {t('fee.title')} {formatDA(c.agencyFee)} · {c.percent}%
                              </p>
                            </div>
                            <span className="text-sm font-extrabold text-amber-700 shrink-0">+{formatDA(c.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pay slip */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Stat label={t('workers.grossSalary')} value={formatDA(calc.gross)} />
                  <Stat label={t('workers.commissions')} value={`+${formatDA(calc.commissionsTotal)}`} tone="success" />
                  <Stat label={t('workers.deductAbsences')} value={`−${formatDA(calc.absencesDeduction)}`} tone="danger" />
                  <Stat label={t('workers.deductAdvances')} value={`−${formatDA(calc.advancesDeduction)}`} tone="danger" />
                  <Stat label={t('workers.netPay')} value={formatDA(calc.net)} tone="success" />
                </div>

                <div className="rounded-2xl bg-grad-success/10 border border-emerald-400/30 p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <TextField label={`${t('workers.netPay')} (DA)`} type="number" value={netEdit === '' ? String(calc.net) : netEdit} onChange={(e) => setNetEdit(e.target.value)} />
                    <TextField label={t('common.date')} type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                    <TextField label={t('common.description')} value={payDesc} onChange={(e) => setPayDesc(e.target.value)} />
                  </div>
                  <p className="text-[11px] text-ink-muted">{t('workers.historyHint')}</p>
                  <GradientButton variant="success" fullWidth icon={<Wallet size={16} />} onClick={async () => {
                    if (net <= 0) return toast.error(t('login.required'));
                    await addPayment(
                      worker.id,
                      {
                        date: payDate,
                        amount: net,
                        description: payDesc || t('workers.payment'),
                        gross: calc.gross,
                        commissionsTotal: calc.commissionsTotal,
                        absencesTotal: calc.absencesDeduction,
                        advancesTotal: calc.advancesDeduction,
                      },
                      { reservationIds: calc.commissions.map((c) => c.reservationId) },
                    );
                    toast.success(t('toast.paid')); setNetEdit(''); setPayDesc('');
                  }}>{t('workers.savePayment')}</GradientButton>
                </div>
              </div>
            )}

            {tab === 'history' && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold text-ink-muted uppercase mb-2">{t('workers.history')}</p>
                  {worker.payments.length === 0 ? (
                    <p className="text-sm text-ink-muted text-center py-4">{t('common.noData')}</p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {[...worker.payments].sort((a, b) => b.date.localeCompare(a.date)).map((p) => (
                        <div key={p.id} className="rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink-primary truncate">{p.description || t('workers.payment')}</p>
                              <p className="text-xs text-ink-muted">{formatDate(p.date, lang)}</p>
                            </div>
                            <span className="text-sm font-extrabold text-emerald-600 shrink-0">+{formatDA(p.amount)}</span>
                          </div>
                          {(p.gross != null || p.commissionsTotal != null) && (
                            <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                              <span className="text-ink-muted">{t('workers.grossSalary')}: <b className="text-ink-primary">{formatDA(p.gross ?? 0)}</b></span>
                              <span className="text-ink-muted">{t('workers.commissions')}: <b className="text-emerald-600">+{formatDA(p.commissionsTotal ?? 0)}</b></span>
                              <span className="text-ink-muted">{t('workers.absences')}: <b className="text-rose-600">−{formatDA(p.absencesTotal ?? 0)}</b></span>
                              <span className="text-ink-muted">{t('workers.advances')}: <b className="text-rose-600">−{formatDA(p.advancesTotal ?? 0)}</b></span>
                            </div>
                          )}
                          {/* Items settled by this payment */}
                          <SettledItems
                            paymentId={p.id}
                            worker={worker}
                            commissions={paidCommissions}
                            data={data}
                            lang={lang}
                            t={t}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </Modal>
  );
}

/** The advances / absences / commissions a given payment absorbed. */
function SettledItems({
  paymentId, worker, commissions, data, lang, t,
}: {
  paymentId: string;
  worker: Worker;
  commissions: ReturnType<typeof workerCommissions>;
  data: ReturnType<typeof useAppData>;
  lang: 'fr' | 'ar';
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  const advances = worker.advances.filter((a) => a.workerPaymentId === paymentId);
  const absences = worker.absences.filter((a) => a.workerPaymentId === paymentId);
  const comms = commissions.filter((c) => c.paymentId === paymentId);
  if (advances.length === 0 && absences.length === 0 && comms.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
      {comms.map((c) => (
        <p key={c.reservationId} className="text-[11px] text-ink-secondary flex items-center justify-between gap-2">
          <span className="truncate">
            <Briefcase size={10} className="inline text-amber-500 me-1" />
            {t('fee.locationRef')} {c.code} · {clientName(data, c.clientId)} · {c.percent}%
          </span>
          <span className="font-semibold text-emerald-600 shrink-0">+{formatDA(c.amount)}</span>
        </p>
      ))}
      {absences.map((a) => (
        <p key={a.id} className="text-[11px] text-ink-secondary flex items-center justify-between gap-2">
          <span className="truncate">
            <CalendarX size={10} className="inline text-rose-500 me-1" />
            {a.description || t('workers.absences')} · {formatDate(a.date, lang)}
          </span>
          <span className="font-semibold text-rose-600 shrink-0">−{formatDA(a.cost)}</span>
        </p>
      ))}
      {advances.map((a) => (
        <p key={a.id} className="text-[11px] text-ink-secondary flex items-center justify-between gap-2">
          <span className="truncate">
            <Coins size={10} className="inline text-amber-500 me-1" />
            {a.description || t('workers.advances')} · {formatDate(a.date, lang)}
          </span>
          <span className="font-semibold text-rose-600 shrink-0">−{formatDA(a.amount)}</span>
        </p>
      ))}
    </div>
  );
}

function ListBlock({
  items, lang, empty, deductedLabel,
}: {
  items: { id: string; left: string; date: string; amount: number; negative?: boolean; positive?: boolean; deducted?: boolean }[];
  lang: 'fr' | 'ar';
  empty: string;
  deductedLabel?: string;
}) {
  if (items.length === 0) return <p className="text-sm text-ink-muted text-center py-4">{empty}</p>;
  return (
    <div className="space-y-2 max-h-56 overflow-y-auto">
      {items.map((it) => (
        <div key={it.id} className="flex items-center justify-between rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-2.5">
          <div>
            <p className="text-sm text-ink-primary">{it.left}</p>
            <p className="text-xs text-ink-muted">{formatDate(it.date, lang)}</p>
          </div>
          <div className="flex items-center gap-2">
            {it.deducted && deductedLabel && <Badge tone="success">{deductedLabel}</Badge>}
            <span className={cn('text-sm font-semibold', it.positive ? 'text-emerald-600' : it.negative ? 'text-rose-600' : 'text-amber-600')}>
              {it.positive ? '+' : it.negative ? '−' : ''}{formatDA(it.amount)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
