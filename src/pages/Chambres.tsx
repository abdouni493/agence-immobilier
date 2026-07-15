import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BedDouble, Plus, Pencil, Trash2, Wrench, Eye, Layers, Tag, Users, Check, X, Wallet,
  MapPin, UserPlus, Home, Tags, Handshake,
} from 'lucide-react';
import { useApp, useCurrentPermissions, can } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, EmptyState, Stat } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientCard } from '@/components/ui/GradientCard';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextField, SelectField, SegmentedControl, TextArea } from '@/components/ui/Field';
import type { MediatorFormData } from '@/components/forms/MediatorForm';
import { effectiveRoomStatus, reservationPaid } from '@/store/selectors';
import { staggerContainer, listItem } from '@/animations';
import { formatDA, formatDate, todayISO, addDaysISO, nightsBetween, cn } from '@/lib/utils';
import { categoryName, floorName, clientName, mediatorName } from '@/lib/lookups';
import type { Room, RoomStatus, PropertyType, Mediator } from '@/types';

type Filter = 'all' | RoomStatus | 'rental' | 'sale';

export default function Chambres() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const perms = useCurrentPermissions();
  const { rooms, floors, categories } = data;

  const addRoom = useApp((s) => s.addRoom);
  const updateRoom = useApp((s) => s.updateRoom);
  const deleteRoom = useApp((s) => s.deleteRoom);
  const setRoomMaintenance = useApp((s) => s.setRoomMaintenance);
  const endRoomMaintenance = useApp((s) => s.endRoomMaintenance);
  const addFloor = useApp((s) => s.addFloor);
  const deleteFloor = useApp((s) => s.deleteFloor);
  const addCategory = useApp((s) => s.addCategory);
  const deleteCategory = useApp((s) => s.deleteCategory);
  const addMediator = useApp((s) => s.addMediator);

  const today = todayISO();
  const [filter, setFilter] = useState<Filter>('all');
  const [formRoom, setFormRoom] = useState<Room | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [manageFloors, setManageFloors] = useState(false);
  const [manageCats, setManageCats] = useState(false);
  const [toDelete, setToDelete] = useState<Room | null>(null);
  const [maintRoom, setMaintRoom] = useState<Room | null>(null);
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);

  const withStatus = useMemo(
    () => rooms.map((r) => ({ room: r, status: effectiveRoomStatus(r, data.reservations, today) })),
    [rooms, data.reservations, today],
  );
  const filtered = useMemo(() => {
    if (filter === 'all') return withStatus;
    if (filter === 'rental' || filter === 'sale') {
      return withStatus.filter((x) => (x.room.propertyType ?? 'rental') === filter);
    }
    return withStatus.filter((x) => x.status === filter);
  }, [withStatus, filter]);

  return (
    <div>
      <PageHeader
        icon={<BedDouble size={24} />}
        title={t('rooms.title')}
        subtitle={t('rooms.subtitle')}
        actions={
          can(perms, 'chambres', 'create') && (
            <>
              <GradientButton variant="glass" icon={<Layers size={17} />} onClick={() => setManageFloors(true)}>
                {t('rooms.manageFloors')}
              </GradientButton>
              <GradientButton variant="glass" icon={<Tag size={17} />} onClick={() => setManageCats(true)}>
                {t('rooms.manageCategories')}
              </GradientButton>
              <GradientButton icon={<Plus size={18} />} onClick={() => { setFormRoom(null); setFormOpen(true); }}>
                {t('rooms.new')}
              </GradientButton>
            </>
          )
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <SegmentedControl<Filter>
          value={filter}
          onChange={setFilter}
          size="sm"
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'available', label: t('rooms.available') },
            { value: 'occupied', label: t('rooms.occupied') },
            { value: 'maintenance', label: t('rooms.maintenance') },
            { value: 'rental', label: t('apt.typeRental') },
            { value: 'sale', label: t('apt.typeSale') },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<BedDouble size={36} />} title={t('common.noResults')} hint={t('common.emptyHint')} />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map(({ room, status }) => (
              <motion.div key={room.id} variants={listItem} layout exit="exit">
                <GradientCard
                  className="p-5 h-full flex flex-col border border-white/10 shadow-xl"
                  style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 text-white shadow-lg shrink-0">
                        <BedDouble size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{room.name}</h3>
                        <p className="text-xs text-sky-200/80">
                          {[categoryName(data, room.categoryId), floorName(data, room.floorId)].filter((v) => v && v !== '—').join(' · ') || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <RoomStatusBadge status={status} />
                      <PropertyTypeBadge type={room.propertyType ?? 'rental'} />
                    </div>
                  </div>

                  {(room.wilaya || room.commune || room.secteur) && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-300">
                      <MapPin size={13} className="text-sky-300 shrink-0" />
                      {[room.wilaya, room.commune, room.secteur].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {(room.ownerName || room.ownerClientId) && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-300">
                      <Users size={13} className="text-sky-300 shrink-0" />
                      {room.ownerName || clientName(data, room.ownerClientId!)}
                      {room.ownerPhone ? ` · ${room.ownerPhone}` : ''}
                    </p>
                  )}
                  {room.mediatorId && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-300">
                      <Handshake size={13} className="text-amber-300 shrink-0" /> {mediatorName(data, room.mediatorId)}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <Home size={15} className="text-sky-300" /> {room.capacity} {t('apt.roomsNumber').toLowerCase()}
                    </span>
                    {(room.propertyType ?? 'rental') === 'sale' ? (
                      room.salePrice ? <span className="text-lg font-extrabold text-white">{formatDA(room.salePrice)}</span> : null
                    ) : (
                      <span className="text-lg font-extrabold text-white">{formatDA(room.pricePerNight)}<span className="text-xs text-sky-200/70 font-medium"> / {t('common.night')}</span></span>
                    )}
                  </div>

                  {status === 'maintenance' && room.maintenanceNote && (
                    <p className="mt-2 text-xs text-amber-300 bg-amber-500/20 border border-amber-500/30 rounded-lg px-2.5 py-1.5">{room.maintenanceNote}</p>
                  )}

                  <div className="mt-4 flex items-center gap-1.5 border-t border-white/10 pt-3">
                    <GradientButton size="sm" variant="glass" className="bg-white/10 border-white/10 text-white hover:bg-white/20" icon={<Eye size={15} />} onClick={() => setDetailRoom(room)}>
                      {t('common.details')}
                    </GradientButton>
                    <div className="flex-1" />
                    {can(perms, 'chambres', 'edit') && status !== 'maintenance' && (
                      <button onClick={() => setMaintRoom(room)} title={t('rooms.setMaintenance')} className="btn-card-action btn-action-maint">
                        <Wrench size={15} />
                      </button>
                    )}
                    {can(perms, 'chambres', 'edit') && status === 'maintenance' && (
                      <button onClick={async () => { await endRoomMaintenance(room.id); toast.success(t('toast.updated')); }} title={t('rooms.endMaintenance')} className="btn-card-action btn-action-pay">
                        <Check size={15} />
                      </button>
                    )}
                    {can(perms, 'chambres', 'edit') && (
                      <button onClick={() => { setFormRoom(room); setFormOpen(true); }} className="btn-card-action btn-action-edit" title={t('common.edit')}>
                        <Pencil size={15} />
                      </button>
                    )}
                    {can(perms, 'chambres', 'delete') && (
                      <button onClick={() => setToDelete(room)} className="btn-card-action btn-action-delete" title={t('common.delete')}>
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

      {formOpen && (
        <RoomFormModal
          room={formRoom}
          floors={floors}
          categories={categories}
          mediators={data.mediators}
          onAddFloor={addFloor}
          onAddCategory={addCategory}
          onAddMediator={addMediator}
          onClose={() => setFormOpen(false)}
          onSave={async (payload) => {
            if (formRoom) { await updateRoom(formRoom.id, payload); toast.success(t('toast.updated')); }
            else { await addRoom(payload); toast.success(t('toast.created')); }
            setFormOpen(false);
          }}
        />
      )}

      <ManageListModal
        open={manageFloors}
        onClose={() => setManageFloors(false)}
        title={t('rooms.manageFloors')}
        items={floors}
        onAdd={async (name) => { await addFloor(name); toast.success(t('toast.created')); }}
        onDelete={async (id) => { await deleteFloor(id); toast.success(t('toast.deleted')); }}
        placeholder={t('rooms.newFloor')}
      />
      <ManageListModal
        open={manageCats}
        onClose={() => setManageCats(false)}
        title={t('rooms.manageCategories')}
        items={categories}
        onAdd={async (name) => { await addCategory(name); toast.success(t('toast.created')); }}
        onDelete={async (id) => { await deleteCategory(id); toast.success(t('toast.deleted')); }}
        placeholder={t('rooms.newCategory')}
      />

      <MaintenanceModal
        room={maintRoom}
        onClose={() => setMaintRoom(null)}
        onConfirm={async (note) => {
          if (maintRoom) { await setRoomMaintenance(maintRoom.id, note); toast.success(t('toast.updated')); }
          setMaintRoom(null);
        }}
      />

      <RoomDetailsModal room={detailRoom} onClose={() => setDetailRoom(null)} data={data} lang={lang} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) { await deleteRoom(toDelete.id); toast.success(t('toast.deleted')); } }}
        message={toDelete ? `${t('common.deleteMsg')} (${t('nav.chambres')} ${toDelete.name})` : ''}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-ink-primary truncate">{value && value !== '—' ? value : '—'}</p>
    </div>
  );
}

function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const { t } = useI18n();
  if (status === 'available') return <Badge tone="success" dot className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">{t('rooms.available')}</Badge>;
  if (status === 'occupied') return <Badge tone="danger" dot className="bg-rose-500/20 text-rose-300 border-rose-500/30">{t('rooms.occupied')}</Badge>;
  return <Badge tone="warning" dot className="bg-amber-500/20 text-amber-300 border-amber-500/30">{t('rooms.maintenance')}</Badge>;
}

function PropertyTypeBadge({ type }: { type: PropertyType }) {
  const { t } = useI18n();
  if (type === 'sale') {
    return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-200 border border-amber-500/30"><Tags size={10} /> {t('apt.typeSale')}</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-sky-500/20 text-sky-200 border border-sky-500/30"><BedDouble size={10} /> {t('apt.typeRental')}</span>;
}

function RoomFormModal({
  room, floors, categories, mediators, onAddFloor, onAddCategory, onAddMediator, onClose, onSave,
}: {
  room: Room | null;
  floors: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  mediators: Mediator[];
  onAddFloor: (name: string) => void;
  onAddCategory: (name: string) => void;
  onAddMediator: (m: MediatorFormData) => Promise<Mediator>;
  onClose: () => void;
  onSave: (payload: Omit<Room, 'id' | 'status'>) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [name, setName] = useState(room?.name ?? '');
  const [capacity, setCapacity] = useState(String(room?.capacity ?? 1));
  const [floorId, setFloorId] = useState(room?.floorId ?? '');
  const [categoryId, setCategoryId] = useState(room?.categoryId ?? '');
  const [price, setPrice] = useState(String(room?.pricePerNight ?? ''));
  const [salePrice, setSalePrice] = useState(room?.salePrice != null ? String(room.salePrice) : '');
  const [propertyType, setPropertyType] = useState<PropertyType>(room?.propertyType ?? 'rental');
  const [wilaya, setWilaya] = useState(room?.wilaya ?? '');
  const [commune, setCommune] = useState(room?.commune ?? '');
  const [secteur, setSecteur] = useState(room?.secteur ?? '');
  const [description, setDescription] = useState(room?.description ?? '');
  const [ownerName, setOwnerName] = useState(room?.ownerName ?? '');
  const [ownerPhone, setOwnerPhone] = useState(room?.ownerPhone ?? '');
  const [mediatorId, setMediatorId] = useState(room?.mediatorId ?? '');
  const [showMediatorInput, setShowMediatorInput] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedPhone, setNewMedPhone] = useState('');
  const [newFloor, setNewFloor] = useState('');
  const [newCat, setNewCat] = useState('');
  const [showFloorInput, setShowFloorInput] = useState(false);
  const [showCatInput, setShowCatInput] = useState(false);

  const createMediator = async () => {
    if (!newMedName.trim() || !newMedPhone.trim()) return toast.error(t('login.required'));
    const parts = newMedName.trim().split(/\s+/);
    const firstName = parts.shift() ?? '';
    const lastName = parts.join(' ');
    const m = await onAddMediator({
      firstName, lastName, phone: newMedPhone.trim(),
      phone2: '', email: '', address: '', city: '', cin: '', notes: '',
    });
    setMediatorId(m.id);
    setShowMediatorInput(false);
    setNewMedName(''); setNewMedPhone('');
    toast.success(t('toast.created'));
  };

  const save = () => {
    if (!name.trim()) return toast.error(t('login.required'));
    if (propertyType === 'rental' && !price) return toast.error(t('login.required'));
    onSave({
      name: name.trim(),
      capacity: Number(capacity) || 1,
      floorId,
      categoryId,
      pricePerNight: price ? Number(price) : 0,
      maintenanceNote: room?.maintenanceNote,
      wilaya: wilaya.trim() || undefined,
      commune: commune.trim() || undefined,
      secteur: secteur.trim() || undefined,
      description: description.trim() || undefined,
      propertyType,
      ownerClientId: room?.ownerClientId || undefined,
      ownerName: ownerName.trim() || undefined,
      ownerPhone: ownerPhone.trim() || undefined,
      mediatorId: mediatorId || undefined,
      salePrice: salePrice ? Number(salePrice) : undefined,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={room ? `${t('common.edit')} · ${room.name}` : t('rooms.new')}
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <GradientButton variant="glass" onClick={onClose}>{t('common.cancel')}</GradientButton>
          <GradientButton onClick={save}>{t('common.save')}</GradientButton>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Type selector */}
        <div>
          <p className="text-xs font-semibold text-ink-secondary mb-1.5">{t('apt.type')}</p>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
            <button onClick={() => setPropertyType('rental')} className={cn('flex-1 h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5', propertyType === 'rental' ? 'bg-white shadow text-brand-700' : 'text-ink-secondary')}>
              <BedDouble size={15} /> {t('apt.typeRental')}
            </button>
            <button onClick={() => setPropertyType('sale')} className={cn('flex-1 h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5', propertyType === 'sale' ? 'bg-white shadow text-brand-700' : 'text-ink-secondary')}>
              <Tags size={15} /> {t('apt.typeSale')}
            </button>
          </div>
        </div>

        {/* Identity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={t('rooms.roomName')} required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <TextField label={t('apt.roomsNumber')} type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          <TextField label={t('apt.wilaya')} value={wilaya} onChange={(e) => setWilaya(e.target.value)} />
          <TextField label={t('apt.commune')} value={commune} onChange={(e) => setCommune(e.target.value)} />
          <TextField label={t('apt.secteur')} value={secteur} onChange={(e) => setSecteur(e.target.value)} />

          <div>
            <SelectField label={t('apt.etage')} value={floorId} onChange={(e) => setFloorId(e.target.value)}>
              <option value="">—</option>
              {floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </SelectField>
            {!showFloorInput ? (
              <button type="button" onClick={() => setShowFloorInput(true)} className="mt-1.5 text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
                <Plus size={13} /> {t('rooms.newFloor')}
              </button>
            ) : (
              <div className="mt-2 flex gap-2">
                <input value={newFloor} onChange={(e) => setNewFloor(e.target.value)} placeholder={t('rooms.newFloor')} className="flex-1 h-9 rounded-lg bg-slate-100/70 border border-slate-200 px-3 text-sm text-ink-primary outline-none focus:border-brand-400/60" />
                <button type="button" onClick={() => { if (newFloor.trim()) { onAddFloor(newFloor.trim()); setNewFloor(''); setShowFloorInput(false); } }} className="grid h-9 w-9 place-items-center rounded-lg bg-grad-primary text-white"><Check size={16} /></button>
                <button type="button" onClick={() => { setShowFloorInput(false); setNewFloor(''); }} className="grid h-9 w-9 place-items-center rounded-lg glass text-ink-secondary"><X size={16} /></button>
              </div>
            )}
          </div>

          {propertyType === 'rental' ? (
            <>
              <div>
                <SelectField label={t('common.category')} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">—</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectField>
                {!showCatInput ? (
                  <button type="button" onClick={() => setShowCatInput(true)} className="mt-1.5 text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    <Plus size={13} /> {t('rooms.newCategory')}
                  </button>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder={t('rooms.newCategory')} className="flex-1 h-9 rounded-lg bg-slate-100/70 border border-slate-200 px-3 text-sm text-ink-primary outline-none focus:border-brand-400/60" />
                    <button type="button" onClick={() => { if (newCat.trim()) { onAddCategory(newCat.trim()); setNewCat(''); setShowCatInput(false); } }} className="grid h-9 w-9 place-items-center rounded-lg bg-grad-primary text-white"><Check size={16} /></button>
                    <button type="button" onClick={() => { setShowCatInput(false); setNewCat(''); }} className="grid h-9 w-9 place-items-center rounded-lg glass text-ink-secondary"><X size={16} /></button>
                  </div>
                )}
              </div>
              <TextField label={`${t('rooms.pricePerNight')} (DA)`} required type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </>
          ) : (
            <TextField label={t('apt.salePrice')} type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          )}

          <TextArea wrapClassName="sm:col-span-2" label={t('apt.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {/* Owner (free text — optional) */}
        <div>
          <p className="text-xs font-semibold text-ink-secondary mb-1.5">{t('apt.owner')}</p>
          <p className="text-[11px] text-ink-muted mb-2">{t('apt.ownerHint')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField label={t('apt.ownerName')} icon={<Users size={16} />} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder={t('apt.ownerNamePlaceholder')} />
            <TextField label={t('apt.ownerPhone')} value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="06 00 00 00 00" />
          </div>
        </div>

        {/* Mediator (choose existing or create new — name + phone only) */}
        <div>
          <p className="text-xs font-semibold text-ink-secondary mb-1.5">{t('apt.mediator')}</p>
          <p className="text-[11px] text-ink-muted mb-2">{t('apt.mediatorHint')}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <SelectField wrapClassName="flex-1" value={mediatorId} onChange={(e) => setMediatorId(e.target.value)}>
              <option value="">{t('apt.noMediator')}</option>
              {mediators.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName} · {m.phone}</option>)}
            </SelectField>
            {!showMediatorInput && (
              <GradientButton variant="glass" icon={<UserPlus size={16} />} onClick={() => setShowMediatorInput(true)}>{t('apt.newMediator')}</GradientButton>
            )}
          </div>
          {showMediatorInput && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField label={t('apt.ownerName')} value={newMedName} onChange={(e) => setNewMedName(e.target.value)} placeholder={t('apt.mediatorNamePlaceholder')} autoFocus />
                <TextField label={t('common.phone')} value={newMedPhone} onChange={(e) => setNewMedPhone(e.target.value)} placeholder="06 00 00 00 00" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setShowMediatorInput(false); setNewMedName(''); setNewMedPhone(''); }} className="grid h-9 w-9 place-items-center rounded-lg glass text-ink-secondary"><X size={16} /></button>
                <GradientButton size="sm" icon={<Check size={16} />} onClick={createMediator}>{t('common.create')}</GradientButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ManageListModal({
  open, onClose, title, items, onAdd, onDelete, placeholder,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: { id: string; name: string }[];
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
  placeholder: string;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder}
            className="flex-1 h-11 rounded-xl bg-slate-100/70 border border-slate-200 px-3.5 text-sm text-ink-primary outline-none focus:border-brand-400/60"
            onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) { onAdd(value.trim()); setValue(''); } }} />
          <GradientButton icon={<Plus size={17} />} onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue(''); } }}>
            {t('common.add')}
          </GradientButton>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-2.5">
              <span className="text-sm text-ink-primary">{it.name}</span>
              <button onClick={() => onDelete(it.id)} className="btn-card-action btn-action-delete h-8 w-8 rounded-lg" title={t('common.delete')}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-ink-muted text-center py-4">{t('common.noData')}</p>}
        </div>
      </div>
    </Modal>
  );
}

function MaintenanceModal({
  room, onClose, onConfirm,
}: {
  room: Room | null;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const { t } = useI18n();
  const [note, setNote] = useState('');
  return (
    <Modal
      open={!!room}
      onClose={onClose}
      title={t('rooms.setMaintenance')}
      subtitle={room ? `${t('nav.chambres')} ${room.name}` : ''}
      size="sm"
      footer={
        <div className="flex gap-3 justify-end">
          <GradientButton variant="glass" onClick={onClose}>{t('common.cancel')}</GradientButton>
          <GradientButton variant="danger" icon={<Wrench size={16} />} onClick={() => { onConfirm(note); setNote(''); }}>
            {t('common.confirm')}
          </GradientButton>
        </div>
      }
    >
      <TextArea label={t('common.note')} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Réparation plomberie…" />
    </Modal>
  );
}

function RoomDetailsModal({
  room, onClose, data, lang,
}: {
  room: Room | null;
  onClose: () => void;
  data: ReturnType<typeof useAppData>;
  lang: 'fr' | 'ar';
}) {
  const { t } = useI18n();
  const [from, setFrom] = useState(addDaysISO(todayISO(), -60));
  const [to, setTo] = useState(todayISO());

  const reservations = useMemo(() => {
    if (!room) return [];
    return data.reservations.filter(
      (r) => r.status !== 'cancelled' && r.rooms.some((rr) => rr.roomId === room.id) && r.checkIn >= from && r.checkIn <= to,
    );
  }, [room, data.reservations, from, to]);

  const maintenances = useMemo(() => {
    if (!room) return [];
    return data.maintenances.filter((m) => m.roomId === room.id && m.date >= from && m.date <= to);
  }, [room, data.maintenances, from, to]);

  const gains = useMemo(
    () => reservations.reduce((s, r) => {
      const rr = r.rooms.find((x) => x.roomId === room?.id);
      return s + (rr ? rr.pricePerNight * nightsBetween(r.checkIn, r.checkOut) : 0);
    }, 0),
    [reservations, room],
  );
  const expenses = maintenances.reduce((s, m) => s + m.cost, 0);

  return (
    <Modal open={!!room} onClose={onClose} title={room ? `${t('nav.chambres')} ${room.name}` : ''} subtitle={room ? categoryName(data, room.categoryId) : ''} size="lg">
      {room && (
        <div className="space-y-5">
          {/* Full apartment information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-ink-primary flex items-center gap-1.5">
                <Home size={15} className="text-brand-500" /> {t('apt.infoTitle')}
              </h4>
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                (room.propertyType ?? 'rental') === 'sale' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700',
              )}>
                {(room.propertyType ?? 'rental') === 'sale' ? <Tags size={11} /> : <BedDouble size={11} />}
                {(room.propertyType ?? 'rental') === 'sale' ? t('apt.typeSale') : t('apt.typeRental')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              <Info label={t('rooms.roomName')} value={room.name} />
              <Info label={t('common.category')} value={categoryName(data, room.categoryId)} />
              <Info label={t('apt.etage')} value={floorName(data, room.floorId)} />
              <Info label={t('apt.roomsNumber')} value={String(room.capacity)} />
              <Info label={t('apt.wilaya')} value={room.wilaya} />
              <Info label={t('apt.commune')} value={room.commune} />
              <Info label={t('apt.secteur')} value={room.secteur} />
              {(room.propertyType ?? 'rental') === 'sale' ? (
                <>
                  <Info label={t('apt.salePrice')} value={room.salePrice != null ? formatDA(room.salePrice) : undefined} />
                  <Info label={t('purchases.purchasePrice')} value={room.purchasePrice != null ? formatDA(room.purchasePrice) : undefined} />
                </>
              ) : (
                <Info label={t('rooms.pricePerNight')} value={formatDA(room.pricePerNight)} />
              )}
              <Info label={t('apt.ownerName')} value={room.ownerName || (room.ownerClientId ? clientName(data, room.ownerClientId) : undefined)} />
              <Info label={t('apt.ownerPhone')} value={room.ownerPhone} />
              <Info label={t('apt.mediator')} value={room.mediatorId ? mediatorName(data, room.mediatorId) : undefined} />
            </div>
            {room.description && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide mb-1">{t('apt.description')}</p>
                <p className="text-sm text-ink-secondary whitespace-pre-wrap">{room.description}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <TextField label={t('common.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} wrapClassName="flex-1 min-w-[140px]" />
            <TextField label={t('common.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} wrapClassName="flex-1 min-w-[140px]" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat label={t('rooms.gains')} value={formatDA(gains)} tone="success" />
            <Stat label={t('expenses.tabMaintenance')} value={formatDA(expenses)} tone="danger" />
            <Stat label={t('rooms.netBalance')} value={formatDA(gains - expenses)} tone={gains - expenses >= 0 ? 'success' : 'danger'} />
          </div>

          <div>
            <h4 className="text-sm font-bold text-ink-primary mb-2">{t('rooms.reservationsPeriod')}</h4>
            <div className="space-y-2">
              {reservations.length === 0 ? <p className="text-sm text-ink-muted text-center py-3">{t('common.noData')}</p> :
                reservations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-ink-primary">{r.code} · {clientName(data, r.clientId)}</p>
                      <p className="text-xs text-ink-muted">{formatDate(r.checkIn, lang)} → {formatDate(r.checkOut, lang)}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">{formatDA(reservationPaid(r))}</span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-ink-primary mb-2">{t('rooms.maintenancesPeriod')}</h4>
            <div className="space-y-2">
              {maintenances.length === 0 ? <p className="text-sm text-ink-muted text-center py-3">{t('common.noData')}</p> :
                maintenances.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-ink-primary">{m.name}</p>
                      <p className="text-xs text-ink-muted">{formatDate(m.date, lang)}</p>
                    </div>
                    <span className="text-sm font-semibold text-rose-600">−{formatDA(m.cost)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
