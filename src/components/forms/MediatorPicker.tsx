import { useMemo, useState } from 'react';
import { Search, UserPlus, Check, X, Handshake, HardHat } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { GradientButton } from '@/components/ui/GradientButton';
import { TextField } from '@/components/ui/Field';
import { cn, initials } from '@/lib/utils';
import type { Mediator, Worker } from '@/types';

/** Strip accents + lowercase so "Médiateur" matches "mediateur".
 *  The character class below is the Unicode combining-marks range. */
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** A worker counts as a mediator when their job title says so (fr or ar). */
export function isMediatorWorker(w: Worker): boolean {
  const role = norm(w.role ?? '');
  return w.active && (role.includes('mediateur') || role.includes('mediator') || (w.role ?? '').includes('وسيط'));
}

type Candidate =
  | { kind: 'mediator'; id: string; name: string; phone: string; sub: string }
  | { kind: 'worker'; id: string; name: string; phone: string; sub: string };

/**
 * Mediator selector used when creating / editing an apartment.
 *
 * The search list mixes the mediator directory with the workers whose role is
 * "Médiateur". Picking a worker links (or transparently creates) the matching
 * mediator record, so commissions keep working exactly as before.
 */
export function MediatorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (mediatorId: string) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const addMediator = useApp((s) => s.addMediator);

  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = data.mediators.find((m) => m.id === value);

  const workerMediators = useMemo(() => data.workers.filter(isMediatorWorker), [data.workers]);

  /** An already-linked mediator for this worker, matched on phone then name. */
  const linkedMediator = (w: Worker): Mediator | undefined =>
    data.mediators.find(
      (m) =>
        (!!w.phone && m.phone === w.phone) ||
        norm(`${m.firstName} ${m.lastName}`.trim()) === norm(w.name.trim()),
    );

  const candidates = useMemo<Candidate[]>(() => {
    const q = norm(query.trim());
    const fromMediators: Candidate[] = data.mediators.map((m) => ({
      kind: 'mediator' as const,
      id: m.id,
      name: `${m.firstName} ${m.lastName}`.trim(),
      phone: m.phone,
      sub: t('apt.mediator'),
    }));
    // Only surface workers that do not already have a mediator record, so the
    // same person never shows up twice in the list.
    const fromWorkers: Candidate[] = workerMediators
      .filter((w) => !linkedMediator(w))
      .map((w) => ({
        kind: 'worker' as const,
        id: w.id,
        name: w.name,
        phone: w.phone,
        sub: `${t('nav.workers')} · ${w.role}`,
      }));
    const all = [...fromMediators, ...fromWorkers];
    if (!q) return all.slice(0, 8);
    return all.filter((c) => norm(c.name).includes(q) || c.phone.includes(query.trim())).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, data.mediators, workerMediators, t]);

  const pick = async (c: Candidate) => {
    if (c.kind === 'mediator') return onChange(c.id);
    const worker = data.workers.find((w) => w.id === c.id);
    if (!worker) return;
    const existing = linkedMediator(worker);
    if (existing) return onChange(existing.id);
    // First time this worker is used as a mediator → create their record.
    setBusy(true);
    try {
      const parts = worker.name.trim().split(/\s+/);
      const firstName = parts.shift() ?? worker.name;
      const m = await addMediator({
        firstName,
        lastName: parts.join(' '),
        phone: worker.phone,
        phone2: '',
        email: '',
        address: '',
        city: '',
        cin: worker.cin ?? '',
        notes: t('apt.mediatorFromWorker'),
      });
      onChange(m.id);
      toast.success(t('toast.created'));
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setBusy(false);
    }
  };

  const createNew = async () => {
    if (!newName.trim() || !newPhone.trim()) return toast.error(t('login.required'));
    setBusy(true);
    try {
      const parts = newName.trim().split(/\s+/);
      const firstName = parts.shift() ?? '';
      const m = await addMediator({
        firstName, lastName: parts.join(' '), phone: newPhone.trim(),
        phone2: '', email: '', address: '', city: '', cin: '', notes: '',
      });
      onChange(m.id);
      setCreating(false);
      setNewName('');
      setNewPhone('');
      toast.success(t('toast.created'));
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setBusy(false);
    }
  };

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-grad-teal text-white text-xs font-bold shrink-0">
          {initials(`${selected.firstName} ${selected.lastName}`)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-primary truncate">
            {selected.firstName} {selected.lastName}
          </p>
          <p className="text-xs text-ink-muted">{selected.phone}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-xs font-semibold text-ink-secondary hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-lg px-3 py-1.5 transition-all"
        >
          {t('common.change')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute inset-y-0 start-3.5 my-auto text-ink-muted pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('apt.mediatorSearchPlaceholder')}
            className="w-full h-11 rounded-xl bg-slate-100/70 border border-slate-200 ps-11 pe-4 text-sm text-ink-primary placeholder:text-ink-muted outline-none transition-all focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        {!creating && (
          <GradientButton variant="glass" icon={<UserPlus size={16} />} onClick={() => setCreating(true)}>
            {t('apt.newMediator')}
          </GradientButton>
        )}
      </div>

      {creating && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField label={t('apt.ownerName')} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('apt.mediatorNamePlaceholder')} autoFocus />
            <TextField label={t('common.phone')} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="06 00 00 00 00" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setCreating(false); setNewName(''); setNewPhone(''); }} className="grid h-9 w-9 place-items-center rounded-lg glass text-ink-secondary">
              <X size={16} />
            </button>
            <GradientButton size="sm" icon={<Check size={16} />} onClick={createNew} disabled={busy}>
              {t('common.create')}
            </GradientButton>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
        {candidates.map((c) => (
          <button
            key={`${c.kind}-${c.id}`}
            type="button"
            disabled={busy}
            onClick={() => pick(c)}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-start hover:border-brand-400 hover:bg-brand-50 transition-all disabled:opacity-50"
          >
            <span
              className={cn(
                'grid h-9 w-9 place-items-center rounded-xl text-white shrink-0',
                c.kind === 'worker' ? 'bg-grad-gold' : 'bg-grad-teal',
              )}
            >
              {c.kind === 'worker' ? <HardHat size={15} /> : <Handshake size={15} />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink-primary truncate">{c.name}</span>
              <span className="block text-xs text-ink-muted truncate">{c.phone} · {c.sub}</span>
            </span>
          </button>
        ))}
        {candidates.length === 0 && (
          <p className="col-span-full text-center text-sm text-ink-muted py-6">{t('common.noResults')}</p>
        )}
      </div>
    </div>
  );
}
