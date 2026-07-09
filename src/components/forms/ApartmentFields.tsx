import { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { TextField, SelectField, TextArea } from '@/components/ui/Field';
import type { Floor } from '@/types';

/** Controlled draft for the shared apartment identity fields
 *  (nom, wilaya, commune, secteur, étage, nb chambres, description). */
export interface AptDraft {
  name: string;
  wilaya: string;
  commune: string;
  secteur: string;
  floorId: string;
  capacity: string;
  description: string;
}

export const emptyAptDraft: AptDraft = {
  name: '',
  wilaya: '',
  commune: '',
  secteur: '',
  floorId: '',
  capacity: '2',
  description: '',
};

export function ApartmentFields({
  draft,
  onChange,
  floors,
  onAddFloor,
}: {
  draft: AptDraft;
  onChange: (d: AptDraft) => void;
  floors: Floor[];
  onAddFloor: (name: string) => Promise<void> | void;
}) {
  const { t } = useI18n();
  const [newFloor, setNewFloor] = useState('');
  const [showFloorInput, setShowFloorInput] = useState(false);

  const set = <K extends keyof AptDraft>(key: K, value: AptDraft[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TextField label={t('rooms.roomName')} required value={draft.name} onChange={(e) => set('name', e.target.value)} />
      <TextField label={t('apt.wilaya')} value={draft.wilaya} onChange={(e) => set('wilaya', e.target.value)} />
      <TextField label={t('apt.commune')} value={draft.commune} onChange={(e) => set('commune', e.target.value)} />
      <TextField label={t('apt.secteur')} value={draft.secteur} onChange={(e) => set('secteur', e.target.value)} />

      <div>
        <SelectField label={t('apt.etage')} value={draft.floorId} onChange={(e) => set('floorId', e.target.value)}>
          <option value="">—</option>
          {floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </SelectField>
        {!showFloorInput ? (
          <button type="button" onClick={() => setShowFloorInput(true)} className="mt-1.5 text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
            <Plus size={13} /> {t('rooms.newFloor')}
          </button>
        ) : (
          <div className="mt-2 flex gap-2">
            <input
              value={newFloor}
              onChange={(e) => setNewFloor(e.target.value)}
              placeholder={t('rooms.newFloor')}
              className="flex-1 h-9 rounded-lg bg-slate-100/70 border border-slate-200 px-3 text-sm text-ink-primary outline-none focus:border-brand-400/60"
            />
            <button
              type="button"
              onClick={async () => {
                if (newFloor.trim()) {
                  await onAddFloor(newFloor.trim());
                  setNewFloor('');
                  setShowFloorInput(false);
                }
              }}
              className="grid h-9 w-9 place-items-center rounded-lg bg-grad-primary text-white"
            >
              <Check size={16} />
            </button>
            <button type="button" onClick={() => { setShowFloorInput(false); setNewFloor(''); }} className="grid h-9 w-9 place-items-center rounded-lg glass text-ink-secondary">
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      <TextField label={t('apt.roomsNumber')} type="number" value={draft.capacity} onChange={(e) => set('capacity', e.target.value)} />
      <TextArea wrapClassName="sm:col-span-2" label={t('apt.description')} value={draft.description} onChange={(e) => set('description', e.target.value)} />
    </div>
  );
}
