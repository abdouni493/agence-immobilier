import { useState } from 'react';
import { Shield, Eye, EyeOff, Building2, LayoutDashboard } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { GradientButton } from '@/components/ui/GradientButton';
import { Toggle, Checkbox } from '@/components/ui/Field';
import { MODULE_ACTIONS, MODULE_ORDER, APT_FIELDS, DASH_CARDS, fullPermissions } from '@/data/constants';
import { cn } from '@/lib/utils';
import type { Permissions, ModuleKey, ActionKey, AptField, DashCard } from '@/types';

export function actionLabel(a: ActionKey, t: (k: string) => string): string {
  const map: Record<ActionKey, string> = {
    view: t('common.view'), create: t('common.create'), edit: t('common.edit'),
    delete: t('common.delete'), print: t('common.print'), pay: t('common.pay'),
  };
  return map[a];
}

/**
 * Permissions editor shared by worker and mediator accounts: one toggle per
 * module with its actions, and — for the apartments module — the pieces of
 * information the account may see on the apartment cards and details.
 */
export function PermissionsModal({
  name, initial, onSave, onClose,
}: {
  name: string;
  initial: Permissions;
  onSave: (perms: Permissions) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [perms, setPerms] = useState<Permissions>({ ...initial });

  const moduleEnabled = (m: ModuleKey) => !!perms[m] && perms[m]!.length > 0;
  const toggleModule = (m: ModuleKey) => {
    setPerms((p) => {
      const next = { ...p };
      if (moduleEnabled(m)) {
        delete next[m];
        if (m === 'chambres') delete next.aptFields;
        if (m === 'dashboard') delete next.dashCards;
      } else {
        next[m] = ['view'];
        // Opening the apartments shows every piece of information by default;
        // the admin then unticks what this account must not see.
        if (m === 'chambres' && !next.aptFields) next.aptFields = [...APT_FIELDS];
        if (m === 'dashboard' && !next.dashCards) next.dashCards = [...DASH_CARDS];
      }
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
  const fields = perms.aptFields ?? APT_FIELDS;
  const toggleField = (f: AptField) => {
    setPerms((p) => {
      const cur = new Set(p.aptFields ?? APT_FIELDS);
      if (cur.has(f)) cur.delete(f);
      else cur.add(f);
      return { ...p, aptFields: APT_FIELDS.filter((x) => cur.has(x)) };
    });
  };
  const allFieldsOn = APT_FIELDS.every((f) => fields.includes(f));
  const toggleAllFields = () => setPerms((p) => ({ ...p, aptFields: allFieldsOn ? [] : [...APT_FIELDS] }));

  const cards = perms.dashCards ?? DASH_CARDS;
  const toggleCard = (c: DashCard) => {
    setPerms((p) => {
      const cur = new Set(p.dashCards ?? DASH_CARDS);
      if (cur.has(c)) cur.delete(c);
      else cur.add(c);
      return { ...p, dashCards: DASH_CARDS.filter((x) => cur.has(x)) };
    });
  };
  const allCardsOn = DASH_CARDS.every((c) => cards.includes(c));
  const toggleAllCards = () => setPerms((p) => ({ ...p, dashCards: allCardsOn ? [] : [...DASH_CARDS] }));

  const allOn = MODULE_ORDER.every((m) => moduleEnabled(m));
  const toggleAll = () => setPerms(allOn ? {} : fullPermissions());

  const save = async () => {
    try {
      // Always store an explicit list once the apartments are granted, so
      // what the admin sees in this screen is exactly what the account gets.
      const out: Permissions = { ...perms };
      if (moduleEnabled('chambres') && !out.aptFields) out.aptFields = [...APT_FIELDS];
      if (moduleEnabled('dashboard') && !out.dashCards) out.dashCards = [...DASH_CARDS];
      await onSave(out);
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
      subtitle={name}
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
            {m === 'dashboard' && moduleEnabled(m) && (
              <div className="mt-3 rounded-xl border border-sky-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-ink-primary">
                    <LayoutDashboard size={15} className="text-sky-600" /> {t('perm.dashCards')}
                  </p>
                  <button type="button" onClick={toggleAllCards} className="text-xs font-semibold text-brand-600 hover:underline">
                    {allCardsOn ? t('perm.hideAll') : t('perm.showAll')}
                  </button>
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5 mb-2.5">{t('perm.dashCardsHint')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DASH_CARDS.map((c) => {
                    const on = cards.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCard(c)}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-start text-sm transition-all',
                          on ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-ink-muted',
                        )}
                      >
                        <span className="font-medium">{t(c === 'topService' ? 'dash.topService' : `dash.${c}`)}</span>
                        <span className="flex items-center gap-1 text-[11px] font-bold shrink-0">
                          {on ? <Eye size={14} /> : <EyeOff size={14} />}
                          {on ? t('perm.visible') : t('perm.zero')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {m === 'chambres' && moduleEnabled(m) && (
              <div className="mt-3 rounded-xl border border-sky-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-ink-primary">
                    <Building2 size={15} className="text-sky-600" /> {t('perm.aptFields')}
                  </p>
                  <button type="button" onClick={toggleAllFields} className="text-xs font-semibold text-brand-600 hover:underline">
                    {allFieldsOn ? t('perm.hideAll') : t('perm.showAll')}
                  </button>
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5 mb-2.5">{t('perm.aptFieldsHint')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {APT_FIELDS.map((f) => {
                    const on = fields.includes(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggleField(f)}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-start text-sm transition-all',
                          on ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-ink-muted',
                        )}
                      >
                        <span className="font-medium">{t(`perm.f.${f}`)}</span>
                        <span className="flex items-center gap-1 text-[11px] font-bold shrink-0">
                          {on ? <Eye size={14} /> : <EyeOff size={14} />}
                          {on ? t('perm.visible') : t('perm.hidden')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
