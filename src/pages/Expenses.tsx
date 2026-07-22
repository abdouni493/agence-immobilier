import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown, Plus, Pencil, Trash2, Wrench, Tag, FolderCog, ShoppingCart, Check, BedDouble, Printer,
} from 'lucide-react';
import { useApp, useCurrentPermissions, can } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, EmptyState, Tabs, Stat } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientCard } from '@/components/ui/GradientCard';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextField, TextArea, SelectField } from '@/components/ui/Field';
import { staggerContainer, listItem } from '@/animations';
import { formatDA, formatDate, todayISO, addDaysISO } from '@/lib/utils';
import { expenseCategoryName, roomName } from '@/lib/lookups';
import { printHTML, buildExpensesReportHTML } from '@/lib/print';
import type { Expense, Maintenance } from '@/types';

export default function Expenses() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const perms = useCurrentPermissions();

  const deleteExpense = useApp((s) => s.deleteExpense);
  const deleteMaintenance = useApp((s) => s.deleteMaintenance);

  const storeInfo = useApp((s) => s.storeInfo);

  const [tab, setTab] = useState<'general' | 'maintenance'>('general');
  const [catFilter, setCatFilter] = useState('all');
  // Date range drives both the on-screen list and the printed report.
  const [from, setFrom] = useState(addDaysISO(todayISO(), -30));
  const [to, setTo] = useState(todayISO());
  const [printOpen, setPrintOpen] = useState(false);
  const [expForm, setExpForm] = useState<Expense | null>(null);
  const [expFormOpen, setExpFormOpen] = useState(false);
  const [maintFormOpen, setMaintFormOpen] = useState(false);
  const [manageCats, setManageCats] = useState(false);
  const [delExp, setDelExp] = useState<Expense | null>(null);
  const [delMaint, setDelMaint] = useState<Maintenance | null>(null);

  const inRangeExpenses = useMemo(
    () => data.expenses.filter((e) => e.date >= from && e.date <= to),
    [data.expenses, from, to],
  );

  const filteredExpenses = useMemo(
    () => (catFilter === 'all' ? inRangeExpenses : inRangeExpenses.filter((e) => e.categoryId === catFilter)),
    [inRangeExpenses, catFilter],
  );

  const inRangeMaintenances = useMemo(
    () => data.maintenances.filter((m) => m.date >= from && m.date <= to),
    [data.maintenances, from, to],
  );

  const maintByRoom = useMemo(() => {
    const map = new Map<string, Maintenance[]>();
    for (const m of inRangeMaintenances) {
      const arr = map.get(m.roomId) ?? [];
      arr.push(m);
      map.set(m.roomId, arr);
    }
    return [...map.entries()];
  }, [inRangeMaintenances]);

  const catSummary = useMemo(() => {
    const total = inRangeExpenses.reduce((s, e) => s + e.amount, 0);
    return data.expenseCategories
      .map((cat) => ({
        name: cat.name,
        value: inRangeExpenses.filter((e) => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0),
        total,
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [inRangeExpenses, data.expenseCategories]);

  const print = () => {
    printHTML(
      t('expenses.printTitle'),
      buildExpensesReportHTML(data, storeInfo, from, to, catFilter === 'all' ? undefined : catFilter),
    );
    setPrintOpen(false);
  };

  return (
    <div>
      <PageHeader
        icon={<TrendingDown size={24} />}
        title={t('expenses.title')}
        subtitle={t('expenses.subtitle')}
        actions={
          <>
            <GradientButton variant="glass" icon={<Printer size={17} />} onClick={() => setPrintOpen(true)}>
              {t('common.print')}
            </GradientButton>
            {can(perms, 'expenses', 'create') && tab === 'general' && (
              <>
                <GradientButton variant="glass" icon={<FolderCog size={17} />} onClick={() => setManageCats(true)}>{t('common.category')}</GradientButton>
                <GradientButton icon={<Plus size={18} />} onClick={() => { setExpForm(null); setExpFormOpen(true); }}>{t('expenses.new')}</GradientButton>
              </>
            )}
            {can(perms, 'expenses', 'create') && tab === 'maintenance' && (
              <GradientButton variant="danger" icon={<Wrench size={18} />} onClick={() => setMaintFormOpen(true)}>{t('expenses.newMaintenance')}</GradientButton>
            )}
          </>
        }
      />

      {/* Period filter — shared by the list and the printed report */}
      <GradientCard className="p-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <TextField label={t('common.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} wrapClassName="flex-1 w-full" />
          <TextField label={t('common.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} wrapClassName="flex-1 w-full" />
          <div className="flex items-center gap-3 shrink-0">
            <Stat
              label={t('expenses.periodTotal')}
              value={formatDA(
                inRangeExpenses.reduce((s, e) => s + e.amount, 0) +
                inRangeMaintenances.reduce((s, m) => s + m.cost, 0),
              )}
              tone="danger"
            />
          </div>
        </div>
      </GradientCard>

      {/* Category mini summary */}
      {catSummary.length > 0 && tab === 'general' && (
        <div className="mb-5 p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">{t('common.category')} — {t('common.total')} {formatDA(catSummary[0]?.total ?? 0)}</p>
          {catSummary.map((c, i) => (
            <div key={c.name} className="flex items-center gap-3">
              <span className="text-xs text-ink-secondary w-28 truncate shrink-0">{c.name}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${c.total > 0 ? (c.value / c.total) * 100 : 0}%` }}
                  transition={{ delay: i * 0.06, duration: 0.5 }}
                  className="h-full rounded-full bg-rose-500"
                  style={{ opacity: 0.65 + (1 - i / catSummary.length) * 0.35 }}
                />
              </div>
              <span className="text-xs font-semibold text-rose-600 w-20 text-right shrink-0">−{formatDA(c.value)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs<'general' | 'maintenance'>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'general', label: t('expenses.tabGeneral'), icon: <ShoppingCart size={15} /> },
            { value: 'maintenance', label: t('expenses.tabMaintenance'), icon: <Wrench size={15} /> },
          ]}
        />
        {tab === 'general' && (
          <SelectField value={catFilter} onChange={(e) => setCatFilter(e.target.value)} wrapClassName="w-48">
            <option value="all">{t('common.all')}</option>
            {data.expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
        )}
      </div>

      {tab === 'general' ? (
        filteredExpenses.length === 0 ? (
          <EmptyState icon={<TrendingDown size={36} />} title={t('common.noResults')} hint={t('common.emptyHint')} />
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredExpenses.map((e) => (
                <motion.div key={e.id} variants={listItem} layout exit="exit">
                  <GradientCard
                    className="p-5 h-full flex flex-col border border-white/10 shadow-xl"
                    style={{ background: 'linear-gradient(145deg, #1b1f25 0%, #22272f 55%, #2a3039 100%)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-white shrink-0"><ShoppingCart size={18} /></div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white truncate">{e.name}</h3>
                        <p className="text-xs text-sky-200/80 flex items-center gap-1 mt-0.5"><Tag size={11} /> {expenseCategoryName(data, e.categoryId)}</p>
                      </div>
                    </div>
                    {e.description && <p className="text-sm text-ink-secondary mt-3 line-clamp-2">{e.description}</p>}
                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                      <div>
                        <p className="text-lg font-extrabold text-rose-350 text-rose-300">−{formatDA(e.amount)}</p>
                        <p className="text-xs text-slate-350">{formatDate(e.date, lang)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {can(perms, 'expenses', 'edit') && (
                          <button onClick={() => { setExpForm(e); setExpFormOpen(true); }} className="btn-card-action btn-action-edit" title={t('common.edit')}><Pencil size={15} /></button>
                        )}
                        {can(perms, 'expenses', 'delete') && (
                          <button onClick={() => setDelExp(e)} className="btn-card-action btn-action-delete" title={t('common.delete')}><Trash2 size={15} /></button>
                        )}
                      </div>
                    </div>
                  </GradientCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )
      ) : maintByRoom.length === 0 ? (
        <EmptyState icon={<Wrench size={36} />} title={t('common.noData')} hint={t('common.emptyHint')} />
      ) : (
        <div className="space-y-4">
          {maintByRoom.map(([roomId, list]) => {
            const total = list.reduce((s, m) => s + m.cost, 0);
            return (
              <GradientCard
                key={roomId}
                className="p-5 border border-white/10 shadow-xl"
                style={{ background: 'linear-gradient(145deg, #1b1f25 0%, #22272f 55%, #2a3039 100%)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="flex items-center gap-2 font-bold text-white"><BedDouble size={18} className="text-sky-305 text-sky-300" /> {roomName(data, roomId)}</h3>
                  <Stat label={t('common.total')} value={formatDA(total)} tone="danger" dark />
                </div>
                <div className="space-y-2">
                  {list.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-xl bg-white/10 border border-white/10 px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-white">{m.name}</p>
                        <p className="text-xs text-sky-200/80">{m.description} · {formatDate(m.date, lang)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-rose-355 text-rose-300">−{formatDA(m.cost)}</span>
                        {can(perms, 'expenses', 'delete') && (
                          <button onClick={() => setDelMaint(m)} className="btn-card-action btn-action-delete" title={t('common.delete')}><Trash2 size={15} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </GradientCard>
            );
          })}
        </div>
      )}

      <Modal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        title={t('expenses.printTitle')}
        subtitle={t('expenses.printHint')}
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <GradientButton variant="glass" onClick={() => setPrintOpen(false)}>{t('common.cancel')}</GradientButton>
            <GradientButton icon={<Printer size={17} />} onClick={print}>{t('common.print')}</GradientButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField label={t('common.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <TextField label={t('common.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <SelectField label={t('common.category')} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="all">{t('common.all')}</option>
            {data.expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t('expenses.tabGeneral')} value={formatDA(filteredExpenses.reduce((s, e) => s + e.amount, 0))} tone="danger" />
            <Stat label={t('expenses.tabMaintenance')} value={formatDA(inRangeMaintenances.reduce((s, m) => s + m.cost, 0))} tone="danger" />
          </div>
        </div>
      </Modal>

      {expFormOpen && <ExpenseForm expense={expForm} onClose={() => { setExpFormOpen(false); setExpForm(null); }} />}
      {maintFormOpen && <MaintenanceForm onClose={() => setMaintFormOpen(false)} />}
      <ManageCategoriesModal open={manageCats} onClose={() => setManageCats(false)} />

      <ConfirmDialog open={!!delExp} onClose={() => setDelExp(null)} onConfirm={async () => { if (delExp) { await deleteExpense(delExp.id); toast.success(t('toast.deleted')); } }} message={delExp ? `${t('common.deleteMsg')} (${delExp.name})` : ''} />
      <ConfirmDialog open={!!delMaint} onClose={() => setDelMaint(null)} onConfirm={async () => { if (delMaint) { await deleteMaintenance(delMaint.id); toast.success(t('toast.deleted')); } }} message={delMaint ? `${t('common.deleteMsg')} (${delMaint.name})` : ''} />
    </div>
  );
}

function ExpenseForm({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const categories = useApp((s) => s.expenseCategories);
  const addExpense = useApp((s) => s.addExpense);
  const updateExpense = useApp((s) => s.updateExpense);
  const addCategory = useApp((s) => s.addExpenseCategory);

  const [name, setName] = useState(expense?.name ?? '');
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? categories[0]?.id ?? '');
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(String(expense?.amount ?? ''));
  const [date, setDate] = useState(expense?.date ?? todayISO());
  const [newCat, setNewCat] = useState('');
  const [showCat, setShowCat] = useState(false);

  const save = async () => {
    if (!name.trim() || !amount || !categoryId) return toast.error(t('login.required'));
    const payload = { name: name.trim(), categoryId, description, amount: Number(amount), date };
    if (expense) { await updateExpense(expense.id, payload); toast.success(t('toast.updated')); }
    else { await addExpense(payload); toast.success(t('toast.created')); }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={expense ? t('common.edit') : t('expenses.new')} size="sm"
      footer={<div className="flex gap-3 justify-end"><GradientButton variant="glass" onClick={onClose}>{t('common.cancel')}</GradientButton><GradientButton onClick={save}>{t('common.save')}</GradientButton></div>}>
      <div className="space-y-4">
        <TextField label={t('common.name')} required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div>
          <SelectField label={t('common.category')} required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
          {!showCat ? (
            <button type="button" onClick={() => setShowCat(true)} className="mt-1.5 text-xs text-brand-600 flex items-center gap-1"><Plus size={13} /> {t('expenses.newCategory')}</button>
          ) : (
            <div className="mt-2 flex gap-2">
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder={t('expenses.newCategory')} className="flex-1 h-9 rounded-lg bg-slate-100/70 border border-slate-200 px-3 text-sm text-ink-primary outline-none focus:border-brand-400/60" />
              <button type="button" onClick={() => { if (newCat.trim()) { addCategory(newCat.trim()); setNewCat(''); setShowCat(false); } }} className="grid h-9 w-9 place-items-center rounded-lg bg-grad-primary text-white"><Check size={16} /></button>
            </div>
          )}
        </div>
        <TextArea label={t('common.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label={`${t('common.amount')} (DA)`} required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <TextField label={t('common.date')} required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

function MaintenanceForm({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const addMaintenance = useApp((s) => s.addMaintenance);

  const [roomId, setRoomId] = useState(data.rooms[0]?.id ?? '');
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');

  const save = async () => {
    if (!roomId || !name.trim() || !cost) return toast.error(t('login.required'));
    await addMaintenance({ roomId, name: name.trim(), cost: Number(cost), date, description });
    toast.success(t('toast.created'));
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={t('expenses.newMaintenance')} size="sm"
      footer={<div className="flex gap-3 justify-end"><GradientButton variant="glass" onClick={onClose}>{t('common.cancel')}</GradientButton><GradientButton variant="danger" onClick={save}>{t('common.save')}</GradientButton></div>}>
      <div className="space-y-4">
        <SelectField label={t('expenses.selectRoom')} required value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          {data.rooms.map((r) => <option key={r.id} value={r.id}>{t('nav.chambres')} {r.name}</option>)}
        </SelectField>
        <TextField label={t('expenses.maintenanceName')} required value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label={`${t('workers.cost')} (DA)`} required type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
          <TextField label={t('common.date')} required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <TextArea label={t('common.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
    </Modal>
  );
}

function ManageCategoriesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const categories = useApp((s) => s.expenseCategories);
  const addCategory = useApp((s) => s.addExpenseCategory);
  const deleteCategory = useApp((s) => s.deleteExpenseCategory);
  const [value, setValue] = useState('');

  return (
    <Modal open={open} onClose={onClose} title={t('common.category')} size="sm">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={t('expenses.newCategory')} className="flex-1 h-11 rounded-xl bg-slate-100/70 border border-slate-200 px-3.5 text-sm text-ink-primary outline-none focus:border-brand-400/60" />
          <GradientButton icon={<Plus size={17} />} onClick={async () => { if (value.trim()) { await addCategory(value.trim()); setValue(''); toast.success(t('toast.created')); } }}>{t('common.add')}</GradientButton>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-2.5">
              <span className="text-sm text-ink-primary">{c.name}</span>
              <button onClick={async () => { await deleteCategory(c.id); toast.success(t('toast.deleted')); }} className="btn-card-action btn-action-delete h-8 w-8 rounded-lg" title={t('common.delete')}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
