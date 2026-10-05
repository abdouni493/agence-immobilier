import { useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { Modal } from './Modal';
import { registerPrintLangHost, type PrintLang } from '@/lib/printLang';

const OPTIONS: { lang: PrintLang; flag: string; title: string; desc: string }[] = [
  { lang: 'fr', flag: 'FR', title: 'Français', desc: 'Imprimer le document en français' },
  { lang: 'ar', flag: 'ع', title: 'العربية', desc: 'طباعة الوثيقة باللغة العربية' },
];

/** Global language picker shown before any document is printed. */
export function PrintLangHost() {
  const [open, setOpen] = useState(false);
  const resolver = useRef<((l: PrintLang | null) => void) | null>(null);

  useEffect(() => registerPrintLangHost((resolve) => {
    resolver.current?.(null);
    resolver.current = resolve;
    setOpen(true);
  }), []);

  const finish = (l: PrintLang | null) => {
    const r = resolver.current;
    resolver.current = null;
    setOpen(false);
    r?.(l);
  };

  return (
    <Modal open={open} onClose={() => finish(null)} title="Langue d'impression · لغة الطباعة" size="sm">
      <div className="space-y-3">
        {OPTIONS.map((o) => (
          <button
            key={o.lang}
            onClick={() => finish(o.lang)}
            className="group flex w-full items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-4 text-start transition-all hover:border-sky-400 hover:bg-sky-50 hover:shadow-sm active:scale-[0.99]"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-lg font-extrabold text-white shadow-md">
              {o.flag}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink-primary">{o.title}</span>
              <span className="block text-xs text-ink-muted mt-0.5" dir={o.lang === 'ar' ? 'rtl' : 'ltr'}>{o.desc}</span>
            </span>
            <Printer size={18} className="shrink-0 text-ink-muted" />
          </button>
        ))}
      </div>
    </Modal>
  );
}
