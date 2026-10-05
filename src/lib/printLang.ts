/** Language a printed document is produced in. */
export type PrintLang = 'fr' | 'ar';

type Request = (resolve: (lang: PrintLang | null) => void) => void;

let host: Request | null = null;

/** Called by <PrintLangHost/> so print actions can ask for a language. */
export function registerPrintLangHost(h: Request): () => void {
  host = h;
  return () => { if (host === h) host = null; };
}

/** Opens the "Français / العربية" picker; resolves null when dismissed. */
export function askPrintLang(): Promise<PrintLang | null> {
  if (!host) return Promise.resolve('fr');
  return new Promise((resolve) => host!(resolve));
}
