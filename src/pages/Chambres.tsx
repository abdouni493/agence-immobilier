import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BedDouble, Plus, Pencil, Trash2, Wrench, Eye, Layers, Tag, Users, Check, X,
  MapPin, Home, Tags, Handshake, Sofa, CalendarDays, CalendarRange,
  ImagePlus, Loader2, RotateCcw, Archive, ImageIcon, ChevronLeft, ChevronRight,
  Phone, Mail, IdCard, Briefcase, KeyRound, Maximize2, Building2,
} from 'lucide-react';
import { useApp, useCurrentPermissions, can, canSeeAptField } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, EmptyState, Stat } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientCard } from '@/components/ui/GradientCard';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PrintPrompt } from '@/components/ui/PrintPrompt';
import { printDoc, buildKeyHandoverHTML } from '@/lib/print';
import { TextField, SelectField, SegmentedControl, TextArea } from '@/components/ui/Field';
import { MediatorPicker } from '@/components/forms/MediatorPicker';
import { effectiveRoomStatus, reservationPaid } from '@/store/selectors';
import { staggerContainer, listItem } from '@/animations';
import { formatDA, formatDate, todayISO, addDaysISO, cn } from '@/lib/utils';
import { categoryName, floorName, clientName, mediatorName, rentalPeriodOf, rentalUnits, activeRooms, deletedRooms } from '@/lib/lookups';
import { uploadApartmentPhoto, deleteApartmentPhoto, formatBytes } from '@/lib/storage';
import type { Room, RoomStatus, PropertyType, RentalPeriod, DocumentType, AptField } from '@/types';

type StatusFilter = 'all' | RoomStatus | 'rental' | 'sale';
/** Availability view: only free apartments (default), only busy ones, or all. */
type AvailabilityFilter = 'available' | 'unavailable' | 'all';
type PeriodFilter = 'all' | RentalPeriod;
type FurnishFilter = 'all' | 'furnished' | 'unfurnished';

export default function Chambres() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const perms = useCurrentPermissions();
  /** Apartment information this account may see (the admin sees all). */
  const see = (f: AptField) => canSeeAptField(perms, f);
  // A mediator account is assigned automatically to the apartments it creates.
  const user = useApp((s) => s.user);
  const myMediatorId = user?.role === 'mediator'
    ? (user.mediatorId ?? data.mediators.find((m) => m.authUserId === user.id)?.id)
    : undefined;
  const { rooms, floors, categories } = data;

  const addRoom = useApp((s) => s.addRoom);
  const updateRoom = useApp((s) => s.updateRoom);
  const deleteRoom = useApp((s) => s.deleteRoom);
  const restoreRoom = useApp((s) => s.restoreRoom);
  const purgeRoom = useApp((s) => s.purgeRoom);
  const setRoomMaintenance = useApp((s) => s.setRoomMaintenance);
  const endRoomMaintenance = useApp((s) => s.endRoomMaintenance);
  const addFloor = useApp((s) => s.addFloor);
  const deleteFloor = useApp((s) => s.deleteFloor);
  const addCategory = useApp((s) => s.addCategory);
  const deleteCategory = useApp((s) => s.deleteCategory);
  const storeInfo = useApp((s) => s.storeInfo);

  const today = todayISO();
  const [availability, setAvailability] = useState<AvailabilityFilter>('available');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [furnishFilter, setFurnishFilter] = useState<FurnishFilter>('all');
  const [formRoom, setFormRoom] = useState<Room | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [manageFloors, setManageFloors] = useState(false);
  const [manageCats, setManageCats] = useState(false);
  const [toDelete, setToDelete] = useState<Room | null>(null);
  const [maintRoom, setMaintRoom] = useState<Room | null>(null);
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  /** Apartment just created with an owner: offer to print the key handover. */
  const [keyAsk, setKeyAsk] = useState<Room | null>(null);

  const hasOwner = (r: Room) => !!(r.ownerName || r.ownerClientId);
  /** Asks FR / AR, then prints the key handover contract (عقد إستلام مفتاح الشقة). */
  const printKeyHandover = (r: Room) => {
    // Always print from the freshest copy of the apartment.
    const fresh = data.rooms.find((x) => x.id === r.id) ?? r;
    if (!hasOwner(fresh)) return toast.error(t('apt.keyNoOwner'));
    printDoc(`${fresh.name}-cles`, () => buildKeyHandoverHTML(data, fresh, storeInfo));
  };

  // Soft-deleted apartments live in the corbeille, never in the main grid.
  const liveRooms = useMemo(() => activeRooms(rooms), [rooms]);
  const trashedRooms = useMemo(() => deletedRooms(rooms), [rooms]);

  const withStatus = useMemo(
    () => liveRooms.map((r) => ({ room: r, status: effectiveRoomStatus(r, data.reservations, today) })),
    [liveRooms, data.reservations, today],
  );
  const availableCount = useMemo(() => withStatus.filter((x) => x.status === 'available').length, [withStatus]);
  const filtered = useMemo(() => {
    let list = withStatus;
    if (availability === 'available') list = list.filter((x) => x.status === 'available');
    else if (availability === 'unavailable') list = list.filter((x) => x.status !== 'available');
    if (filter === 'rental' || filter === 'sale') {
      list = list.filter((x) => (x.room.propertyType ?? 'rental') === filter);
    } else if (filter !== 'all') {
      list = list.filter((x) => x.status === filter);
    }
    if (periodFilter !== 'all') {
      // Only rentals have a billing period — sale properties are filtered out.
      list = list.filter(
        (x) => (x.room.propertyType ?? 'rental') === 'rental' && rentalPeriodOf(x.room) === periodFilter,
      );
    }
    if (furnishFilter !== 'all') {
      list = list.filter((x) => !!x.room.furnished === (furnishFilter === 'furnished'));
    }
    return list;
  }, [withStatus, availability, filter, periodFilter, furnishFilter]);

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
              <GradientButton variant="glass" icon={<Archive size={17} />} onClick={() => setTrashOpen(true)}>
                {t('rooms.trash')}{trashedRooms.length > 0 ? ` (${trashedRooms.length})` : ''}
              </GradientButton>
              <GradientButton icon={<Plus size={18} />} onClick={() => { setFormRoom(null); setFormOpen(true); }}>
                {t('rooms.new')}
              </GradientButton>
            </>
          )
        }
      />

      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-3">
          <SegmentedControl<AvailabilityFilter>
            value={availability}
            onChange={(v) => {
              setAvailability(v);
              // Occupied / maintenance only make sense outside the "disponibles" view.
              if (v === 'available' && (filter === 'occupied' || filter === 'maintenance')) setFilter('all');
            }}
            options={[
              { value: 'available', label: `${t('rooms.showAvailable')} (${availableCount})` },
              { value: 'unavailable', label: `${t('rooms.showUnavailable')} (${withStatus.length - availableCount})` },
              { value: 'all', label: `${t('rooms.showAll')} (${withStatus.length})` },
            ]}
          />
          <SegmentedControl<StatusFilter>
            value={filter}
            onChange={setFilter}
            size="sm"
            options={[
              { value: 'all', label: t('common.all') },
              ...(availability === 'available'
                ? []
                : [
                    { value: 'occupied' as StatusFilter, label: t('rooms.occupied') },
                    { value: 'maintenance' as StatusFilter, label: t('rooms.maintenance') },
                  ]),
              { value: 'rental', label: t('apt.typeRental') },
              { value: 'sale', label: t('apt.typeSale') },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{t('apt.rentalPeriod')}</span>
            <SegmentedControl<PeriodFilter>
              value={periodFilter}
              onChange={setPeriodFilter}
              size="sm"
              options={[
                { value: 'all', label: t('common.all') },
                { value: 'day', label: t('apt.periodDay') },
                { value: 'month', label: t('apt.periodMonth') },
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{t('apt.furnishing')}</span>
            <SegmentedControl<FurnishFilter>
              value={furnishFilter}
              onChange={setFurnishFilter}
              size="sm"
              options={[
                { value: 'all', label: t('common.all') },
                { value: 'furnished', label: t('apt.furnished') },
                { value: 'unfurnished', label: t('apt.unfurnished') },
              ]}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<BedDouble size={36} />} title={t('common.noResults')} hint={t('common.emptyHint')} />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map(({ room, status }) => (
              <motion.div key={room.id} variants={listItem} layout exit="exit">
                <div className="apt-card group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 shadow-[0_18px_40px_-22px_rgba(0,0,0,0.9)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/50 hover:shadow-[0_24px_50px_-20px_rgba(56,189,248,0.35)]"
                  style={{ background: 'linear-gradient(180deg, #1d222b 0%, #171b22 100%)' }}>
                  {/* ── Cover ── */}
                  <div className="relative h-48 overflow-hidden">
                    {see('photos') && room.photos?.[0] ? (
                      <img src={room.photos[0]} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="relative h-full w-full" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 55%, #4338ca 100%)' }}>
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '18px 18px' }} />
                        <Building2 size={72} className="absolute end-6 top-6 text-white/30" strokeWidth={1.3} />
                      </div>
                    )}
                    {/* Dark fade so the title is always readable, whatever the photo */}
                    <div className="absolute inset-x-0 bottom-0 h-28" style={{ background: 'linear-gradient(to top, rgba(10,12,16,0.95) 0%, rgba(10,12,16,0.6) 55%, transparent 100%)' }} />

                    <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg"
                        style={{ background: (room.propertyType ?? 'rental') === 'sale' ? '#d97706' : '#0284c7' }}
                      >
                        {(room.propertyType ?? 'rental') === 'sale' ? <Tags size={13} /> : <BedDouble size={13} />}
                        {(room.propertyType ?? 'rental') === 'sale' ? t('apt.typeSale') : t('apt.typeRental')}
                      </span>
                      {see('status') && (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg"
                          style={{ background: status === 'available' ? '#059669' : status === 'occupied' ? '#e11d48' : '#d97706' }}
                        >
                          <span className="h-2 w-2 rounded-full bg-white" />
                          {roomStatusLabel(status, t)}
                        </span>
                      )}
                    </div>

                    <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-extrabold leading-tight text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>{room.name}</h3>
                        {see('location') && room.commune && (
                          <p className="mt-1 flex items-center gap-1.5 truncate text-sm font-medium text-white/90">
                            <MapPin size={14} className="shrink-0 text-sky-300" /> {room.commune}
                          </p>
                        )}
                      </div>
                      {see('photos') && (room.photos?.length ?? 0) > 1 && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
                          <ImageIcon size={13} /> {room.photos!.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Body ── */}
                  <div className="flex flex-1 flex-col gap-3.5 p-4">
                    {/* Price, big and clear */}
                    {see('price') && ((room.propertyType ?? 'rental') === 'sale' ? !!room.salePrice : true) && (
                      <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(56,189,248,0.10)', border: '1px solid rgba(56,189,248,0.28)' }}>
                        <span className="text-sm font-semibold text-sky-300">
                          {(room.propertyType ?? 'rental') === 'sale'
                            ? t('apt.salePrice').replace(/\s*\(.*\)\s*$/, '')
                            : rentalPeriodOf(room) === 'month' ? t('rooms.pricePerMonth') : t('rooms.pricePerNight')}
                        </span>
                        <span className="text-xl font-extrabold tracking-tight text-white">
                          {formatDA((room.propertyType ?? 'rental') === 'sale' ? room.salePrice ?? 0 : room.pricePerNight)}
                        </span>
                      </div>
                    )}

                    {/* Key facts as labelled tiles */}
                    {(() => {
                      const tiles: { icon: React.ReactNode; label: string; value: string; color: string }[] = [];
                      if (see('rooms')) tiles.push({ icon: <Home size={16} />, label: t('apt.roomsNumber'), value: String(room.capacity), color: '#38bdf8' });
                      if (see('floorCategory') && floorName(data, room.floorId) !== '—') tiles.push({ icon: <Layers size={16} />, label: t('apt.etage'), value: floorName(data, room.floorId), color: '#a78bfa' });
                      if (see('floorCategory') && categoryName(data, room.categoryId) !== '—') tiles.push({ icon: <Tag size={16} />, label: t('common.category'), value: categoryName(data, room.categoryId), color: '#f472b6' });
                      if (see('furniture')) tiles.push({ icon: <Sofa size={16} />, label: t('apt.furnishing'), value: room.furnished ? t('apt.furnished') : t('apt.unfurnished'), color: '#34d399' });
                      if ((room.propertyType ?? 'rental') === 'rental' && see('price')) tiles.push({ icon: rentalPeriodOf(room) === 'month' ? <CalendarRange size={16} /> : <CalendarDays size={16} />, label: t('apt.rentalPeriod'), value: rentalPeriodOf(room) === 'month' ? t('apt.periodMonth') : t('apt.periodDay'), color: '#fbbf24' });
                      if (tiles.length === 0) return null;
                      return (
                        <div className="grid grid-cols-2 gap-2">
                          {tiles.map((tile) => (
                            <div key={tile.label} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${tile.color}22`, color: tile.color }}>{tile.icon}</span>
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-medium text-ink-secondary">{tile.label}</span>
                                <span className="block truncate text-sm font-bold text-white">{tile.value}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Owner & mediator */}
                    {see('owner') && (room.ownerName || room.ownerClientId) && (
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}><Users size={16} /></span>
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-ink-secondary">{t('apt.owner')}</span>
                          <span className="block truncate text-sm font-bold text-white">
                            {room.ownerName || clientName(data, room.ownerClientId!)}
                            {room.ownerPhone && <span className="font-medium text-ink-secondary"> · <bdi dir="ltr">{room.ownerPhone}</bdi></span>}
                          </span>
                        </span>
                      </div>
                    )}
                    {see('mediator') && room.mediatorId && (
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}><Handshake size={16} /></span>
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-ink-secondary">{t('apt.mediator')}</span>
                          <span className="block truncate text-sm font-bold text-white">{mediatorName(data, room.mediatorId)}</span>
                        </span>
                      </div>
                    )}

                    {see('status') && status === 'maintenance' && room.maintenanceNote && (
                      <p className="flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-medium text-amber-300" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)' }}>
                        <Wrench size={15} className="mt-0.5 shrink-0" /> {room.maintenanceNote}
                      </p>
                    )}
                  </div>

                  {/* ── Actions ── */}
                  <div className="mt-auto flex items-center gap-1.5 px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)' }}>
                    <button
                      onClick={() => setDetailRoom(room)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95"
                      style={{ background: 'linear-gradient(90deg, #0ea5e9, #2563eb)' }}
                    >
                      <Eye size={16} /> {t('common.details')}
                    </button>
                    <div className="flex-1" />
                    {hasOwner(room) && see('owner') && (
                      <button onClick={() => printKeyHandover(room)} title={t('apt.keyDoc')} className="btn-card-action btn-action-print">
                        <KeyRound size={15} />
                      </button>
                    )}
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
                </div>
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
          onAddFloor={addFloor}
          onAddCategory={addCategory}
          defaultMediatorId={formRoom ? undefined : myMediatorId}
          showOwner={!formRoom || see('owner')}
          onClose={() => setFormOpen(false)}
          onSave={async (payload) => {
            if (formRoom) { await updateRoom(formRoom.id, payload); toast.success(t('toast.updated')); }
            else {
              const created = await addRoom(myMediatorId ? { ...payload, mediatorId: myMediatorId } : payload);
              toast.success(t('toast.created'));
              if (created && hasOwner(created)) setKeyAsk(created);
            }
            setFormOpen(false);
          }}
        />
      )}

      <PrintPrompt
        open={!!keyAsk}
        onClose={() => setKeyAsk(null)}
        onConfirm={() => { if (keyAsk) printKeyHandover(keyAsk); }}
        title={t('apt.keyPrintTitle')}
        message={t('apt.keyPrintMsg')}
      />

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

      <RoomDetailsModal room={detailRoom} onClose={() => setDetailRoom(null)} data={data} lang={lang} see={see} />

      <TrashModal
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        rooms={trashedRooms}
        lang={lang}
        onRestore={async (id) => { await restoreRoom(id); toast.success(t('rooms.restored')); }}
        onPurge={async (id) => {
          try {
            await purgeRoom(id);
            toast.success(t('toast.deleted'));
          } catch {
            toast.error(t('rooms.purgeBlocked'));
          }
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) { await deleteRoom(toDelete.id); toast.success(t('rooms.softDeleted')); } }}
        message={toDelete ? `${t('rooms.softDeleteMsg')} (${t('nav.chambres')} ${toDelete.name})` : ''}
      />
    </div>
  );
}

// ---------------- CORBEILLE (soft-deleted apartments) ----------------
function TrashModal({
  open, onClose, rooms, lang, onRestore, onPurge,
}: {
  open: boolean;
  onClose: () => void;
  rooms: Room[];
  lang: 'fr' | 'ar';
  onRestore: (id: string) => Promise<void>;
  onPurge: (id: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [confirmPurge, setConfirmPurge] = useState<Room | null>(null);

  return (
    <>
      <Modal open={open} onClose={onClose} title={t('rooms.trashTitle')} subtitle={t('rooms.trashHint')} size="lg">
        {rooms.length === 0 ? (
          <div className="py-10 text-center">
            <Archive size={34} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-ink-muted">{t('rooms.emptyTrash')}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {rooms.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  {r.photos?.[0] ? (
                    <img src={r.photos[0]} alt="" className="h-12 w-16 rounded-lg object-cover border border-slate-200 shrink-0" />
                  ) : (
                    <span className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-slate-200 text-slate-400">
                      <BedDouble size={18} />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-primary truncate">{r.name}</p>
                    <p className="text-xs text-ink-muted truncate">
                      {[r.commune, (r.propertyType ?? 'rental') === 'sale' ? t('apt.typeSale') : t('apt.typeRental')].filter(Boolean).join(' · ')}
                    </p>
                    {r.deletedAt && (
                      <p className="text-[11px] text-ink-muted">{t('rooms.deletedOn')} {formatDate(r.deletedAt.slice(0, 10), lang)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <GradientButton size="sm" variant="glass" icon={<RotateCcw size={14} />} onClick={() => onRestore(r.id)}>
                    {t('rooms.restore')}
                  </GradientButton>
                  <button onClick={() => setConfirmPurge(r)} className="btn-card-action btn-action-delete" title={t('rooms.deleteForever')}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmPurge}
        onClose={() => setConfirmPurge(null)}
        onConfirm={async () => { if (confirmPurge) await onPurge(confirmPurge.id); setConfirmPurge(null); }}
        message={confirmPurge ? `${t('rooms.deleteForeverMsg')} (${confirmPurge.name})` : ''}
      />
    </>
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

function roomStatusLabel(status: RoomStatus, t: (k: string) => string): string {
  return status === 'available' ? t('rooms.available') : status === 'occupied' ? t('rooms.occupied') : t('rooms.maintenance');
}

function RentalPeriodBadge({ period }: { period: RentalPeriod }) {
  const { t } = useI18n();
  const monthly = period === 'month';
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border',
      monthly
        ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    )}>
      {monthly ? <CalendarRange size={10} /> : <CalendarDays size={10} />}
      {monthly ? t('apt.periodMonth') : t('apt.periodDay')}
    </span>
  );
}

function FurnishedBadge({ furnished }: { furnished: boolean }) {
  const { t } = useI18n();
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border',
      furnished
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        : 'bg-white/10 text-ink-secondary border-white/15',
    )}>
      <Sofa size={10} />
      {furnished ? t('apt.furnished') : t('apt.unfurnished')}
    </span>
  );
}

function PropertyTypeBadge({ type }: { type: PropertyType }) {
  const { t } = useI18n();
  if (type === 'sale') {
    return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-200 border border-amber-500/30"><Tags size={10} /> {t('apt.typeSale')}</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-sky-500/20 text-sky-200 border border-sky-500/30"><BedDouble size={10} /> {t('apt.typeRental')}</span>;
}

function RoomFormModal({
  room, floors, categories, onAddFloor, onAddCategory, onClose, onSave, defaultMediatorId, showOwner = true,
}: {
  /** False when the account may not see the owner: the section is hidden
   *  (the saved owner is kept unchanged). */
  showOwner?: boolean;
  room: Room | null;
  /** Pre-selected mediator (the logged-in mediator creating the apartment). */
  defaultMediatorId?: string;
  floors: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  onAddFloor: (name: string) => void;
  onAddCategory: (name: string) => void;
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
  const [rentalPeriod, setRentalPeriod] = useState<RentalPeriod>(rentalPeriodOf(room ?? undefined));
  const [furnished, setFurnished] = useState(!!room?.furnished);
  const [furnitureDescription, setFurnitureDescription] = useState(room?.furnitureDescription ?? '');
  const [commune, setCommune] = useState(room?.commune ?? '');
  const [description, setDescription] = useState(room?.description ?? '');
  const [ownerName, setOwnerName] = useState(room?.ownerName ?? '');
  const [ownerPhone, setOwnerPhone] = useState(room?.ownerPhone ?? '');
  const [ownerPhone2, setOwnerPhone2] = useState(room?.ownerPhone2 ?? '');
  const [ownerEmail, setOwnerEmail] = useState(room?.ownerEmail ?? '');
  const [ownerAddress, setOwnerAddress] = useState(room?.ownerAddress ?? '');
  const [ownerCity, setOwnerCity] = useState(room?.ownerCity ?? '');
  const [ownerProfession, setOwnerProfession] = useState(room?.ownerProfession ?? '');
  const [ownerDocumentType, setOwnerDocumentType] = useState<DocumentType>(room?.ownerDocumentType ?? 'cin');
  const [ownerDocumentNumber, setOwnerDocumentNumber] = useState(room?.ownerDocumentNumber ?? '');
  const [mediatorId, setMediatorId] = useState(room?.mediatorId ?? defaultMediatorId ?? '');
  const [photos, setPhotos] = useState<string[]>(room?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [lastSaving, setLastSaving] = useState<string | null>(null);
  const [newFloor, setNewFloor] = useState('');
  const [newCat, setNewCat] = useState('');
  const [showFloorInput, setShowFloorInput] = useState(false);
  const [showCatInput, setShowCatInput] = useState(false);

  /** Upload progress: files done / total, and the bytes saved so far. */
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  /** Photos uploaded in this form session — deleted again if it is cancelled. */
  const [sessionUploads, setSessionUploads] = useState<string[]>([]);

  /**
   * Optimises (WebP/JPEG, ~60 KB, max 1280 px) then uploads every picked file
   * to the `apartment-photos` bucket. One failing file does not stop the rest.
   */
  const handlePhotos = async (files: FileList | File[] | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setUploading(true);
    setProgress({ done: 0, total: list.length });
    let before = 0;
    let after = 0;
    let failed = 0;
    for (const file of list) {
      try {
        const res = await uploadApartmentPhoto(file, room?.id ?? 'new');
        setPhotos((prev) => [...prev, res.url]);
        setSessionUploads((prev) => [...prev, res.url]);
        before += res.originalBytes;
        after += res.optimizedBytes;
      } catch (e) {
        console.error('apartment photo upload failed:', e);
        failed++;
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    if (after > 0) {
      const pct = before > 0 ? Math.max(0, Math.round((1 - after / before) * 100)) : 0;
      setLastSaving(`${t('apt.photoOptimized', { from: formatBytes(before), to: formatBytes(after) })} (−${pct}%)`);
    }
    if (failed > 0) toast.error(`${t('apt.photoError')} (${failed})`);
    setUploading(false);
    setProgress(null);
  };

  const removePhoto = async (url: string) => {
    setPhotos((prev) => prev.filter((u) => u !== url));
    // Only delete from the bucket right away a photo that was never saved on
    // the apartment; a saved one is removed only if the form is saved.
    if (sessionUploads.includes(url) || !room?.photos?.includes(url)) {
      try { await deleteApartmentPhoto(url); } catch { /* already gone */ }
    }
  };

  /** Cancelling the form removes the photos uploaded during it (no orphans). */
  const cancel = () => {
    for (const url of sessionUploads) deleteApartmentPhoto(url).catch(() => {});
    onClose();
  };

  const save = () => {
    if (!name.trim()) return toast.error(t('login.required'));
    if (propertyType === 'rental' && !price) return toast.error(t('login.required'));
    if (furnished && !furnitureDescription.trim()) return toast.error(t('apt.furnitureRequired'));
    // Saved photos the user removed in this form leave the bucket now.
    for (const url of room?.photos ?? []) {
      if (!photos.includes(url)) deleteApartmentPhoto(url).catch(() => {});
    }
    onSave({
      name: name.trim(),
      capacity: Number(capacity) || 1,
      floorId,
      categoryId,
      pricePerNight: price ? Number(price) : 0,
      maintenanceNote: room?.maintenanceNote,
      commune: commune.trim() || undefined,
      description: description.trim() || undefined,
      rentalPeriod,
      furnished,
      furnitureDescription: furnished ? furnitureDescription.trim() || undefined : undefined,
      propertyType,
      ownerClientId: room?.ownerClientId || undefined,
      ownerName: ownerName.trim() || undefined,
      ownerPhone: ownerPhone.trim() || undefined,
      ownerPhone2: ownerPhone2.trim() || undefined,
      ownerEmail: ownerEmail.trim() || undefined,
      ownerAddress: ownerAddress.trim() || undefined,
      ownerCity: ownerCity.trim() || undefined,
      ownerProfession: ownerProfession.trim() || undefined,
      ownerDocumentType: ownerDocumentNumber.trim() ? ownerDocumentType : undefined,
      ownerDocumentNumber: ownerDocumentNumber.trim() || undefined,
      mediatorId: mediatorId || undefined,
      salePrice: salePrice ? Number(salePrice) : undefined,
      photos,
      deleted: room?.deleted ?? false,
      deletedAt: room?.deletedAt,
    });
  };

  return (
    <Modal
      open
      onClose={cancel}
      title={room ? `${t('common.edit')} · ${room.name}` : t('rooms.new')}
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <GradientButton variant="glass" onClick={cancel}>{t('common.cancel')}</GradientButton>
          <GradientButton onClick={save} disabled={uploading}>{t('common.save')}</GradientButton>
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

        {/* Rental billing period — drives the meaning of the price below */}
        {propertyType === 'rental' && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-ink-secondary mb-1">{t('apt.rentalPeriod')}</p>
            <p className="text-[11px] text-ink-muted mb-2.5">{t('apt.rentalPeriodHint')}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRentalPeriod('day')}
                className={cn(
                  'flex-1 h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 border',
                  rentalPeriod === 'day'
                    ? 'bg-brand-600 border-brand-600 text-white shadow-glow'
                    : 'border-slate-200 bg-white text-ink-secondary hover:border-brand-300',
                )}
              >
                <CalendarDays size={15} /> {t('apt.periodDay')}
              </button>
              <button
                type="button"
                onClick={() => setRentalPeriod('month')}
                className={cn(
                  'flex-1 h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 border',
                  rentalPeriod === 'month'
                    ? 'bg-brand-600 border-brand-600 text-white shadow-glow'
                    : 'border-slate-200 bg-white text-ink-secondary hover:border-brand-300',
                )}
              >
                <CalendarRange size={15} /> {t('apt.periodMonth')}
              </button>
            </div>
          </div>
        )}

        {/* Identity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={t('rooms.roomName')} required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <TextField label={t('apt.roomsNumber')} type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          <TextField label={t('apt.commune')} value={commune} onChange={(e) => setCommune(e.target.value)} />

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
              <TextField
                label={`${rentalPeriod === 'month' ? t('rooms.pricePerMonth') : t('rooms.pricePerNight')} (DA)`}
                required
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </>
          ) : (
            <TextField label={t('apt.salePrice')} type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          )}

          <TextArea wrapClassName="sm:col-span-2" label={t('apt.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {/* Furnishing — a furnished apartment must list its furniture */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-ink-secondary mb-2.5 flex items-center gap-1.5">
            <Sofa size={14} className="text-brand-400" /> {t('apt.furnishing')}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFurnished(true)}
              className={cn(
                'flex-1 h-10 rounded-lg text-sm font-semibold transition-all border',
                furnished
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-slate-200 bg-white text-ink-secondary hover:border-emerald-300',
              )}
            >
              {t('apt.furnished')}
            </button>
            <button
              type="button"
              onClick={() => setFurnished(false)}
              className={cn(
                'flex-1 h-10 rounded-lg text-sm font-semibold transition-all border',
                !furnished
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'border-slate-200 bg-white text-ink-secondary hover:border-brand-300',
              )}
            >
              {t('apt.unfurnished')}
            </button>
          </div>
          {furnished && (
            <TextArea
              wrapClassName="mt-3"
              label={t('apt.furnitureDescription')}
              required
              value={furnitureDescription}
              onChange={(e) => setFurnitureDescription(e.target.value)}
              placeholder={t('apt.furniturePlaceholder')}
            />
          )}
        </div>

        {/* Photos — optimised (WebP/JPEG ~60 KB) then stored in the apartment-photos bucket */}
        <div
          className={cn('rounded-xl border p-4 transition-colors', dragOver ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-slate-50')}
          onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!uploading) handlePhotos(e.dataTransfer.files); }}
        >
          <p className="text-xs font-semibold text-ink-secondary mb-1 flex items-center gap-1.5">
            <ImageIcon size={14} className="text-brand-400" /> {t('apt.photos')}
          </p>
          <p className="text-[11px] text-ink-muted mb-3">{t('apt.photosHint')}</p>

          <div className="flex flex-wrap gap-2.5">
            {photos.map((url) => (
              <div key={url} className="relative group">
                <img src={url} alt="" className="h-24 w-32 rounded-xl object-cover border-2 border-slate-200" />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute -top-2 -end-2 grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-white shadow hover:bg-rose-600"
                  title={t('common.delete')}
                >
                  <X size={13} />
                </button>
              </div>
            ))}

            <label className={cn(
              'grid h-24 w-32 cursor-pointer place-items-center rounded-xl border-2 border-dashed text-center transition-all',
              uploading ? 'border-brand-300 bg-brand-50 cursor-wait' : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50',
            )}>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={(e) => { handlePhotos(e.target.files); e.target.value = ''; }}
              />
              <span className="flex flex-col items-center gap-1 text-[11px] font-semibold text-ink-secondary px-2">
                {uploading ? <Loader2 size={18} className="animate-spin text-brand-500" /> : <ImagePlus size={18} className="text-brand-500" />}
                {uploading && progress ? `${t('apt.uploading')} ${progress.done}/${progress.total}` : t('apt.addPhotos')}
              </span>
            </label>
          </div>

          {uploading && progress && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all"
                style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
              />
            </div>
          )}
          <p className="mt-2 text-[11px] text-ink-muted">{t('apt.photosDrop')}</p>

          {lastSaving && !uploading && (
            <p className="mt-2 text-[11px] font-semibold text-emerald-600">{lastSaving}</p>
          )}
        </div>

        {/* Owner (free text — optional, same fields as a client) */}
        {showOwner && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-ink-secondary mb-1 flex items-center gap-1.5">
            <Users size={14} className="text-brand-400" /> {t('apt.owner')}
          </p>
          <p className="text-[11px] text-ink-muted mb-3">{t('apt.ownerHint')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField label={t('apt.ownerName')} icon={<Users size={16} />} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder={t('apt.ownerNamePlaceholder')} />
            <TextField label={t('apt.ownerProfession')} icon={<Briefcase size={16} />} value={ownerProfession} onChange={(e) => setOwnerProfession(e.target.value)} />
            <TextField label={t('apt.ownerPhone')} icon={<Phone size={16} />} value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="06 00 00 00 00" />
            <TextField label={t('apt.ownerPhone2')} icon={<Phone size={16} />} value={ownerPhone2} onChange={(e) => setOwnerPhone2(e.target.value)} placeholder="06 00 00 00 00" />
            <TextField label={t('apt.ownerEmail')} type="email" icon={<Mail size={16} />} value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
            <TextField label={t('apt.ownerCity')} icon={<MapPin size={16} />} value={ownerCity} onChange={(e) => setOwnerCity(e.target.value)} />
            <TextField wrapClassName="sm:col-span-2" label={t('apt.ownerAddress')} value={ownerAddress} onChange={(e) => setOwnerAddress(e.target.value)} />
            <SelectField label={t('apt.ownerDocType')} value={ownerDocumentType} onChange={(e) => setOwnerDocumentType(e.target.value as DocumentType)}>
              <option value="permis">{t('clients.docPermis')}</option>
              <option value="cin">{t('clients.docCin')}</option>
              <option value="passeport">{t('clients.docPassport')}</option>
            </SelectField>
            <TextField label={t('apt.ownerDocNumber')} icon={<IdCard size={16} />} value={ownerDocumentNumber} onChange={(e) => setOwnerDocumentNumber(e.target.value)} />
          </div>
        </div>}

        {/* Mediator — searches the mediator directory *and* the workers whose
            job title is "Médiateur" (see MediatorPicker). */}
        <div>
          <p className="text-xs font-semibold text-ink-secondary mb-1.5">{t('apt.mediator')}</p>
          <p className="text-[11px] text-ink-muted mb-2">{t('apt.mediatorHint')}</p>
          <MediatorPicker value={mediatorId} onChange={setMediatorId} />
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
  room, onClose, data, lang, see,
}: {
  room: Room | null;
  onClose: () => void;
  data: ReturnType<typeof useAppData>;
  lang: 'fr' | 'ar';
  /** Whether a piece of information is visible to the current account. */
  see: (f: AptField) => boolean;
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
      return s + (rr ? rr.pricePerNight * rentalUnits(room ?? undefined, r.checkIn, r.checkOut) : 0);
    }, 0),
    [reservations, room],
  );
  const expenses = maintenances.reduce((s, m) => s + m.cost, 0);

  return (
    <Modal open={!!room} onClose={onClose} title={room ? `${t('nav.chambres')} ${room.name}` : ''} subtitle={room && see('floorCategory') ? categoryName(data, room.categoryId) : ''} size="lg">
      {room && (
        <div className="space-y-5">
          {/* Photo gallery */}
          {see('photos') && <PhotoGallery photos={room.photos ?? []} />}

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
              {see('floorCategory') && <Info label={t('common.category')} value={categoryName(data, room.categoryId)} />}
              {see('floorCategory') && <Info label={t('apt.etage')} value={floorName(data, room.floorId)} />}
              {see('rooms') && <Info label={t('apt.roomsNumber')} value={String(room.capacity)} />}
              {see('location') && <Info label={t('apt.commune')} value={room.commune} />}
              {see('furniture') && <Info label={t('apt.furnishing')} value={room.furnished ? t('apt.furnished') : t('apt.unfurnished')} />}
              {see('status') && <Info label={t('common.status')} value={roomStatusLabel(effectiveRoomStatus(room, data.reservations, todayISO()), t)} />}
              {!see('price') ? null : (room.propertyType ?? 'rental') === 'sale' ? (
                <>
                  <Info label={t('apt.salePrice')} value={room.salePrice != null ? formatDA(room.salePrice) : undefined} />
                  <Info label={t('purchases.purchasePrice')} value={room.purchasePrice != null ? formatDA(room.purchasePrice) : undefined} />
                </>
              ) : (
                <>
                  <Info
                    label={t('apt.rentalPeriod')}
                    value={rentalPeriodOf(room) === 'month' ? t('apt.periodMonth') : t('apt.periodDay')}
                  />
                  <Info
                    label={rentalPeriodOf(room) === 'month' ? t('rooms.pricePerMonth') : t('rooms.pricePerNight')}
                    value={formatDA(room.pricePerNight)}
                  />
                </>
              )}
              {see('owner') && (() => {
                // A linked client owner fills the gaps of the free-text fields.
                const oc = room.ownerClientId ? data.clients.find((c) => c.id === room.ownerClientId) : undefined;
                return (
                  <>
                    <Info label={t('apt.ownerName')} value={room.ownerName || (oc ? `${oc.firstName} ${oc.lastName}` : undefined)} />
                    <Info label={t('apt.ownerPhone')} value={room.ownerPhone || oc?.phone} />
                    <Info label={t('apt.ownerPhone2')} value={room.ownerPhone2 || oc?.phone2} />
                    <Info label={t('apt.ownerProfession')} value={room.ownerProfession || oc?.profession} />
                    <Info label={t('apt.ownerEmail')} value={room.ownerEmail || oc?.email} />
                    <Info label={t('apt.ownerCity')} value={room.ownerCity || oc?.city} />
                    <Info label={t('apt.ownerAddress')} value={room.ownerAddress || oc?.address} />
                    <Info label={t('apt.ownerDocNumber')} value={room.ownerDocumentNumber || oc?.documentNumber} />
                  </>
                );
              })()}
              {see('mediator') && <Info label={t('apt.mediator')} value={room.mediatorId ? mediatorName(data, room.mediatorId) : undefined} />}
            </div>
            {see('furniture') && room.furnished && room.furnitureDescription && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Sofa size={12} /> {t('apt.furnitureDescription')}
                </p>
                <p className="text-sm text-ink-secondary whitespace-pre-wrap">{room.furnitureDescription}</p>
              </div>
            )}
            {see('description') && room.description && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide mb-1">{t('apt.description')}</p>
                <p className="text-sm text-ink-secondary whitespace-pre-wrap">{room.description}</p>
              </div>
            )}
          </div>

          {see('history') && (<>
          <div className="flex flex-wrap gap-3 items-end">
            <TextField label={t('common.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} wrapClassName="flex-1 min-w-[140px]" />
            <TextField label={t('common.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} wrapClassName="flex-1 min-w-[140px]" />
          </div>

          {see('price') && <div className="grid grid-cols-3 gap-3">
            <Stat label={t('rooms.gains')} value={formatDA(gains)} tone="success" />
            <Stat label={t('expenses.tabMaintenance')} value={formatDA(expenses)} tone="danger" />
            <Stat label={t('rooms.netBalance')} value={formatDA(gains - expenses)} tone={gains - expenses >= 0 ? 'success' : 'danger'} />
          </div>}

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
          </>)}
        </div>
      )}
    </Modal>
  );
}

// ---------------- PHOTO GALLERY (apartment details) ----------------
function PhotoGallery({ photos }: { photos: string[] }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);

  // Esc closes the full-screen photo, arrows browse.
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setZoom(false); }
      else if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % Math.max(1, photos.length));
      else if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % Math.max(1, photos.length));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [zoom, photos.length]);

  if (photos.length === 0) {
    return (
      <div className="grid h-40 place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-ink-muted">
        <div className="text-center">
          <ImageIcon size={26} className="mx-auto mb-1.5 text-slate-300" />
          <p className="text-sm">{t('apt.noPhotos')}</p>
        </div>
      </div>
    );
  }

  const current = photos[Math.min(index, photos.length - 1)];
  const go = (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length);

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-sm font-bold text-ink-primary flex items-center gap-1.5">
            <ImageIcon size={15} className="text-brand-500" /> {t('apt.photoGallery')}
          </h4>
          <span className="text-[11px] font-semibold text-ink-muted">{t('apt.photoCount', { n: photos.length })}</span>
        </div>

        {/* Main viewer */}
        <div className="relative overflow-hidden rounded-xl bg-slate-900">
          <img
            src={current}
            alt=""
            className="mx-auto max-h-[320px] w-full cursor-zoom-in object-contain"
            onClick={() => setZoom(true)}
          />
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="absolute bottom-2 end-2 flex items-center gap-1.5 rounded-full bg-black/60 px-3 h-8 text-xs font-semibold text-white hover:bg-black/80"
            title={t('apt.fullScreen')}
          >
            <Maximize2 size={14} /> {t('apt.fullScreen')}
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                className="absolute start-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="absolute end-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {photos.length > 1 && (
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
            {photos.map((url, i) => (
              <button
                key={url + i}
                type="button"
                onClick={() => setIndex(i)}
                onDoubleClick={() => { setIndex(i); setZoom(true); }}
                className={cn(
                  'h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                  i === index ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200 opacity-70 hover:opacity-100',
                )}
              >
                <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Full-screen viewer — rendered in <body> so the details modal (which
          is transformed / clipped) cannot trap it. */}
      {createPortal(
        <AnimatePresence>
          {zoom && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] grid place-items-center bg-black/95 p-4 sm:p-10"
              onClick={() => setZoom(false)}
              role="dialog"
              aria-modal="true"
            >
              <img
                src={current}
                alt=""
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl select-none"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setZoom(false); }}
                className="absolute end-4 top-4 flex items-center gap-2 rounded-full bg-white/15 px-4 h-11 text-sm font-semibold text-white hover:bg-white/30 backdrop-blur"
                title={t('common.close')}
              >
                <X size={20} /> {t('common.close')}
              </button>
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); go(-1); }}
                    className="absolute start-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/30"
                  >
                    <ChevronLeft size={24} className="rtl:rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); go(1); }}
                    className="absolute end-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/30"
                  >
                    <ChevronRight size={24} className="rtl:rotate-180" />
                  </button>
                  <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    {Math.min(index, photos.length - 1) + 1} / {photos.length}
                  </span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
