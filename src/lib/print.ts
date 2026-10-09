import type { AppData } from '@/data/seed';
import type { Reservation, Sale, Purchase, Mediator, Payment, Client, StoreInfo } from '@/types';
import {
  reservationPaid, reservationRemaining, salePaid, saleRemaining,
  purchasePaid, purchaseRemaining, mediatorStats,
} from '@/store/selectors';
import { formatDA, formatDate as fmtDate } from './utils';
import { askPrintLang, type PrintLang } from './printLang';
import { clientById, serviceName, mediatorName, reservationPeriod } from './lookups';
import {
  formatDZD, ZAKAT_RATE, NISAB_GOLD_GRAMS, type ZakatInputs, type ZakatResult,
} from './zakat';

// ─── Print language ─────────────────────────────────────────────────────────

/** Language the document being built is written in (set by printDoc). */
let LANG: PrintLang = 'fr';

/** Picks the French or the Arabic wording for the current document. */
export function tr(fr: string, ar: string): string {
  return LANG === 'ar' ? ar : fr;
}

/** Dates follow the document language. */
const formatDate = (iso: string) => fmtDate(iso, LANG);

/** Builds a document in the given language (restoring the previous one). */
export function withPrintLang<T>(lang: PrintLang, build: () => T): T {
  const prev = LANG;
  LANG = lang;
  try { return build(); } finally { LANG = prev; }
}

/**
 * Asks the user for French or Arabic, then builds and prints the document in
 * that language. Does nothing when the picker is dismissed.
 */
export async function printDoc(title: string, build: () => string): Promise<void> {
  const lang = await askPrintLang();
  if (!lang) return;
  printHTML(title, withPrintLang(lang, build), lang);
}

/** Duration wording of a reservation: "3 nuit(s)" or "6 mois". */
function durationLabel(data: AppData, r: Reservation): string {
  const units = r.nights;
  return reservationPeriod(data, r) === 'month'
    ? tr(`${units} mois`, `${units} شهر`)
    : tr(`${units} nuit(s)`, `${units} ليلة`);
}

/** Header of the price column: "Prix/nuit" or "Prix/mois". */
function unitPriceHeader(data: AppData, r: Reservation): string {
  return reservationPeriod(data, r) === 'month' ? tr('Prix/mois', 'السعر/شهر') : tr('Prix/nuit', 'السعر/ليلة');
}

export const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 18px; background: #fff; font-size: 12.5px; }

  /* ── Page frame: every document is printed inside a double border ── */
  .doc {
    max-width: 820px;
    margin: 0 auto;
    border: 3px double #0284c7;
    border-radius: 14px;
    padding: 20px 22px 16px;
    position: relative;
  }
  .doc::after {
    content: '';
    position: absolute;
    inset: 5px;
    border: 1px solid #bae6fd;
    border-radius: 10px;
    pointer-events: none;
  }
  .doc > * { position: relative; z-index: 1; }

  /* ── Header: agency info left & right (bold), logo + name centred on top ── */
  .head { border-bottom: 3px solid #0284c7; padding-bottom: 10px; margin-bottom: 12px; }
  .head-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 14px; }
  .head-center { text-align: center; }
  .logo-center { display: flex; justify-content: center; margin-bottom: 5px; }
  .logo-center img { max-width: 96px; max-height: 62px; object-fit: contain; }
  .logo-placeholder { width: 62px; height: 54px; background: linear-gradient(135deg,#0ea5e9,#0284c7); border-radius: 12px; display: grid; place-items: center; font-size: 26px; font-weight: 800; color: #fff; }
  .brand-name { font-size: 19px; color: #0369a1; font-weight: 800; letter-spacing: .3px; line-height: 1.1; }
  .brand-desc { font-size: 10.5px; color: #475569; font-style: italic; margin-top: 2px; }

  /* Left / right agency identity blocks — every value is bold, labels lighter. */
  .head-side { font-size: 10.5px; line-height: 1.55; color: #0f172a; }
  .head-side p { margin: 1.5px 0; font-weight: 700; }
  .head-side .lbl { color: #0284c7; font-weight: 700; }
  .head-side.left { text-align: left; }
  .head-side.right { text-align: right; }

  /* Phone numbers are always emphasised. */
  .tel, .phone { font-weight: 800; color: #0f172a; }
  .tel-label { font-weight: 400; color: #64748b; }

  /* ── Document band (kind + number + date) under the header ── */
  .doc-band { margin-top: 10px; display: flex; justify-content: center; align-items: center; gap: 10px; flex-wrap: wrap; }
  .doc-band .kind { background: #0284c7; color: #fff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 14px; border-radius: 999px; }
  .doc-band .code { font-size: 16px; font-weight: 900; color: #0369a1; }
  .doc-band .date { font-size: 11px; color: #64748b; }
  .res-meta { text-align: center; }
  .res-meta .code { font-size: 18px; font-weight: 900; color: #0369a1; }
  .res-meta .date { font-size: 11px; color: #64748b; margin-top: 2px; }

  /* ── Section boxes ── */
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .section { border: 2px solid; border-radius: 10px; padding: 11px 13px; }
  .section.blue { border-color: #bae6fd; }
  .section.green { border-color: #bbf7d0; }
  .section.violet { border-color: #ddd6fe; }
  .section.orange { border-color: #fed7aa; }
  .section h3 { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 6px; font-weight: 700; }
  .section.blue h3 { color: #0284c7; }
  .section.green h3 { color: #059669; }
  .section.violet h3 { color: #7c3aed; }
  .section.orange h3 { color: #d97706; }
  .section p { margin: 2px 0; line-height: 1.5; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; border: 1px solid #e2e8f0; }
  th { background: #f0f9ff; text-align: left; padding: 7px 9px; font-size: 10.5px; text-transform: uppercase; color: #0369a1; letter-spacing: .4px; border-bottom: 1px solid #bae6fd; }
  td { padding: 7px 9px; border-bottom: 1px solid #e2e8f0; }
  .right { text-align: right; }
  .tbl-head { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin: 10px 0 5px; color: #475569; }

  /* ── Totals ── */
  .totals-wrap { margin-left: auto; width: 320px; border: 2px solid #bae6fd; border-radius: 10px; padding: 11px 15px; }
  .totals-wrap .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals-wrap .grand { border-top: 2px solid #0284c7; margin-top: 6px; padding-top: 8px; font-size: 15px; font-weight: 800; color: #0369a1; }
  .badge-paid { color: #059669; font-weight: 700; }
  .badge-debt { color: #dc2626; font-weight: 700; }
  .badge-fee { color: #b45309; font-weight: 700; }

  /* ── Agency fee highlight ── */
  .fee-box { border: 2px solid #fed7aa; background: #fffbeb; border-radius: 10px; padding: 11px 14px; margin-bottom: 14px; }
  .fee-box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: #d97706; font-weight: 800; margin-bottom: 6px; }
  .fee-box .fee-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; font-size: 12.5px; }
  .fee-box .fee-amount { font-size: 17px; font-weight: 900; color: #b45309; }
  .fee-box .fee-sub { font-size: 10.5px; color: #92400e; margin-top: 4px; border-top: 1px dashed #fcd34d; padding-top: 5px; }

  /* ── Signatures & electronic stamp ── */
  .stamp { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid #e2e8f0; }
  /* Round rubber-stamp: a double ring with the agency name curved on top and
     its phone number curved along the bottom (SVG textPath). */
  .cachet-circle { width: 138px; height: 138px; transform: rotate(-7deg); flex-shrink: 0; }
  .cachet-circle svg { width: 100%; height: 100%; display: block; }
  .cachet-circle .cc-ring { fill: none; stroke: #0369a1; }
  .cachet-circle .cc-ring-out { stroke-width: 4; }
  .cachet-circle .cc-ring-in { stroke-width: 1.6; }
  .cachet-circle .cc-arc { fill: #0369a1; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; }
  .cachet-circle .cc-star { fill: #0369a1; font-size: 13px; }
  .cachet-circle .cc-center { fill: #0369a1; font-weight: 900; letter-spacing: 1.2px; }
  .cachet-circle .cc-center-sub { fill: #0284c7; font-size: 6.4px; letter-spacing: 1px; font-weight: 700; text-transform: uppercase; }
  .cachet-circle .cc-divider { stroke: #7dd3fc; stroke-width: 1; }
  .foot { margin-top: 16px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }

  /* ── Contract-specific ── */
  .doc-title-band { text-align: center; margin: 4px 0 14px; }
  .doc-title-band h2 { font-size: 19px; font-weight: 900; color: #0369a1; letter-spacing: .5px; text-transform: uppercase; }
  .doc-title-band .sub { font-size: 11px; color: #64748b; margin-top: 3px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .party { border: 2px solid #e2e8f0; border-radius: 10px; padding: 11px 13px; }
  .party h3 { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 6px; font-weight: 800; color: #0369a1; }
  .party p { margin: 2px 0; line-height: 1.5; }
  .party .role { font-size: 9.5px; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }
  .clauses { margin: 4px 0 8px; }
  .clauses h4 { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #475569; margin: 12px 0 7px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .clauses ol { padding-left: 18px; }
  .clauses li { font-size: 11px; color: #334155; line-height: 1.55; margin-bottom: 4px; }
  .amount-hero { text-align: center; border: 2px solid #bbf7d0; background: #f0fdf4; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
  .amount-hero .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .8px; color: #059669; font-weight: 800; }
  .amount-hero .val { font-size: 29px; font-weight: 900; color: #059669; margin-top: 4px; }
  .amount-hero .words { font-size: 11px; color: #475569; margin-top: 4px; font-style: italic; }
  .sign-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 26px; align-items: end; }
  .sign-box { text-align: center; }
  .sign-box .who { font-size: 10.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .5px; }
  .sign-box .line { margin-top: 40px; border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 10px; color: #94a3b8; }
  .sign-box.stamp-cell { display: flex; flex-direction: column; align-items: center; gap: 6px; }

  /* ── Compact one-page mode (contrat + bon de versement) ─────────────────────
     Tightens every vertical rhythm so the whole document fits on a single A4
     sheet, and frames each part with a soft card border. */
  .doc.compact { padding: 14px 16px 12px; font-size: 11px; }
  .doc.compact .head { padding-bottom: 8px; margin-bottom: 9px; }
  .doc.compact .logo-center img { max-width: 84px; max-height: 54px; }
  .doc.compact .brand-name { font-size: 17px; }
  .doc.compact .doc-band { margin-top: 7px; }
  .doc.compact .parties { gap: 8px; margin-bottom: 9px; }
  .doc.compact .party { padding: 8px 10px; }
  .doc.compact .party p { margin: 1px 0; line-height: 1.38; font-size: 10px; }
  .doc.compact .grid2 { gap: 8px; margin-bottom: 9px; }
  .doc.compact .section { padding: 8px 10px; }
  .doc.compact .section p { line-height: 1.4; font-size: 10.5px; }
  .doc.compact table { margin-bottom: 8px; font-size: 10.5px; }
  .doc.compact th { padding: 5px 8px; }
  .doc.compact td { padding: 5px 8px; }
  .doc.compact .tbl-head { margin: 7px 0 4px; }
  .doc.compact .amount-hero { padding: 9px; margin-bottom: 9px; }
  .doc.compact .amount-hero .val { font-size: 23px; margin-top: 2px; }
  .doc.compact .fee-box { padding: 8px 11px; margin-bottom: 9px; }
  .doc.compact .totals-wrap { padding: 8px 12px; }
  .doc.compact .totals-wrap .row { padding: 2.5px 0; font-size: 11.5px; }
  .doc.compact .clauses h4 { margin: 8px 0 4px; }
  .doc.compact .clauses li { font-size: 9.5px; line-height: 1.4; margin-bottom: 2px; }
  .doc.compact .sign-grid { margin-top: 12px; gap: 14px; }
  .doc.compact .sign-box .line { margin-top: 26px; }
  .doc.compact .cachet-circle { width: 118px; height: 118px; }
  .doc.compact .foot { margin-top: 10px; padding-top: 6px; }

  /* Keep framed parts from being split across two pages. */
  .section, .party, .fee-box, .totals-wrap, .amount-hero, .sign-grid, table { page-break-inside: avoid; }

  @page { size: A4; margin: 10mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* ── Arabic (right-to-left) documents ── */
  html[dir="rtl"] body { font-family: 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif; }
  html[dir="rtl"] * { letter-spacing: 0 !important; }
  html[dir="rtl"] th { text-align: right; }
  html[dir="rtl"] .right { text-align: left; }
  html[dir="rtl"] .totals-wrap { margin-left: 0; margin-right: auto; }
  html[dir="rtl"] .head-side.left { text-align: right; }
  html[dir="rtl"] .head-side.right { text-align: left; }
  html[dir="rtl"] .clauses ol { padding-left: 0; padding-right: 18px; }

  /* ── Termination letter (same charter as the rental contract) ── */
  .tm-decl { margin: 0 0 9px; padding: 8px 12px; border: 2px solid #bae6fd; background: #f0f9ff; border-radius: 10px; font-weight: 700; color: #0369a1; }
  .tm-row { display: flex; align-items: flex-end; gap: 8px; margin: 3px 0; }
  .tm-row .k { white-space: nowrap; font-weight: 700; color: #475569; }
  .tm-fill { flex: 1; min-height: 17px; border-bottom: 1.3px dotted #7dd3fc; padding: 0 5px 1px; font-weight: 700; color: #0f172a; }
  .tm-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 18px; }
  .tm-check { display: flex; align-items: center; gap: 26px; margin: 4px 0; }
  .tm-check .k { font-weight: 700; color: #475569; }
  .tm-box { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; }
  .tm-box i { display: inline-grid; place-items: center; width: 15px; height: 15px; border: 1.6px solid #0284c7; border-radius: 3px; font-style: normal; font-size: 11px; line-height: 1; font-weight: 900; color: #0369a1; }
  .tm-line { min-height: 19px; border-bottom: 1.3px dotted #7dd3fc; padding: 0 5px 1px; font-weight: 600; margin: 2px 0; }
  .tm-closing { margin: 8px 0 4px; font-weight: 700; color: #334155; }
  .tm-made { width: 46%; margin-inline-start: auto; }
  /* No outer frame: the letter spreads over the whole A4 sheet, its blocks
     evenly spaced from top to bottom so no empty band is left at the end. */
  .doc.tm-doc { border: none; border-radius: 0; padding: 0; max-width: 100%; min-height: 1030px;
    display: flex; flex-direction: column; justify-content: space-between; font-size: 12.5px; }
  .doc.tm-doc::after { display: none; }
  .doc.tm-doc > * { margin-top: 0 !important; margin-bottom: 0 !important; }
  .doc.tm-doc .party p, .doc.tm-doc .section p { font-size: 12px; }
  .doc.tm-doc .tm-row { margin: 6px 0; }
  .doc.tm-doc .tm-line { min-height: 24px; margin: 5px 0; }
  .doc.tm-doc .section, .doc.tm-doc .party { padding: 10px 13px; }
  .doc.tm-doc .sign-box .line { margin-top: 48px; }

  @media print {
    body { padding: 0; font-size: 12px; }
    .no-print { display: none !important; }
    .doc { border-color: #0284c7; max-width: 100%; margin: 0; }
    /* Compact documents fill the sheet and drop the outer radius for print. */
    .doc.compact { width: 100%; max-width: 100%; border-radius: 8px; }
  }
`;

/** Printable area of an A4 sheet with 10mm margins, in CSS pixels. */
const PAGE_W = 718;
const PAGE_H = 1040;
/** Below this scale a document is left to flow over several pages. */
const MIN_FIT_SCALE = 0.55;

export function printHTML(title: string, bodyHtml: string, lang: PrintLang = LANG) {
  const iframe = document.createElement('iframe');
  // Laid out off-screen at A4 width so the document can be measured.
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_W + 40}px;height:${PAGE_H}px;border:0;visibility:hidden`;
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) return;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  doc.open();
  doc.write(`<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_STYLES}</style></head><body style="padding:0;width:${PAGE_W}px">${bodyHtml}</body></html>`);
  doc.close();

  const images = Array.from(doc.images).map((img) =>
    img.complete ? Promise.resolve() : new Promise<void>((res) => { img.onload = img.onerror = () => res(); }));

  Promise.all(images).then(() => {
    // Shrink the document so it fits on a single A4 page: widen the body by
    // 1/scale and zoom it back down, so it keeps the full page width.
    const h = doc.body.scrollHeight;
    if (h > PAGE_H) {
      let scale = PAGE_H / h;
      for (let i = 0; i < 3 && scale >= MIN_FIT_SCALE; i++) {
        doc.body.style.width = `${PAGE_W / scale}px`;
        const next = doc.body.scrollHeight * scale;
        if (next <= PAGE_H) break;
        scale *= PAGE_H / next;
      }
      if (scale >= MIN_FIT_SCALE) {
        doc.body.style.width = `${PAGE_W / scale}px`;
        (doc.body.style as CSSStyleDeclaration & { zoom: string }).zoom = String(scale);
      } else {
        doc.body.style.width = `${PAGE_W}px`;
      }
    }
    win.focus();
    setTimeout(() => {
      win.print();
      setTimeout(() => document.body.removeChild(iframe), 500);
    }, 150);
  });
}

export function buildInvoiceHTML(data: AppData, r: Reservation, store: StoreInfo): string {
  const client = clientById(data, r.clientId);
  const nights = r.nights;
  const paid = reservationPaid(r);
  const remaining = reservationRemaining(r);
  const fee = r.agencyFee ?? 0;
  const rentTotal = Math.max(0, r.total - fee);
  const mainRoomId = r.rooms[0]?.roomId;

  const roomRows = r.rooms.map((rr) => {
    const room = data.rooms.find((x) => x.id === rr.roomId);
    const floor = room ? (data.floors.find((f) => f.id === room.floorId)?.name ?? '—') : '—';
    const cat = room ? (data.categories.find((c) => c.id === room.categoryId)?.name ?? '—') : '—';
    return `<tr>
      <td>${room?.name ?? '—'}</td>
      <td>${floor}</td>
      <td>${cat}</td>
      <td class="right">${formatDA(rr.pricePerNight)}</td>
      <td class="right">${nights}</td>
      <td class="right">${formatDA(rr.pricePerNight * nights)}</td>
    </tr>`;
  }).join('');

  const serviceSection = r.services.length > 0 ? `
    <p class="tbl-head">✨ ${tr('Services additionnels', 'خدمات إضافية')}</p>
    <table>
      <thead><tr><th>${tr('Service', 'الخدمة')}</th><th class="right">${tr('Qté', 'الكمية')}</th><th class="right">${tr('P.U.', 'سعر الوحدة')}</th><th class="right">${tr('Total', 'المجموع')}</th></tr></thead>
      <tbody>${r.services.map((sv) => `<tr>
        <td>${serviceName(data, sv.serviceId)}</td>
        <td class="right">${sv.quantity}</td>
        <td class="right">${formatDA(sv.unitPrice)}</td>
        <td class="right">${formatDA(sv.unitPrice * sv.quantity)}</td>
      </tr>`).join('')}</tbody>
    </table>` : '';

  return `
  <div class="doc compact">
    ${docHeader(store, r.code, `${tr('Créé le', 'أنشئ في')} ${formatDate(r.createdAt)}`, tr('Bon de Location', 'وصل الكراء'))}

    <!-- Owner of the apartment + client -->
    <div class="grid2">
      ${ownerSection(data, mainRoomId)}
      ${clientSection(client)}
    </div>

    <div class="section green" style="margin-bottom:14px">
      <h3>📅 ${tr('Location', 'الكراء')}</h3>
      <p><strong>${tr('Arrivée :', 'الدخول :')}</strong> ${formatDate(r.checkIn)} ${tr('à', 'على')} ${r.checkInTime}</p>
      <p><strong>${tr('Départ :', 'الخروج :')}</strong> ${formatDate(r.checkOut)} ${tr('à', 'على')} ${r.checkOutTime}</p>
      <p><strong>${tr('Durée :', 'المدة :')}</strong> ${durationLabel(data, r)}</p>
    </div>

    <!-- Apartments -->
    <p class="tbl-head">🏠 ${tr('Appartement(s)', 'الشقق')}</p>
    <table>
      <thead><tr><th>${tr('Nom', 'الاسم')}</th><th>${tr('Étage', 'الطابق')}</th><th>${tr('Catégorie', 'الفئة')}</th><th class="right">${unitPriceHeader(data, r)}</th><th class="right">${tr('Durée', 'المدة')}</th><th class="right">${tr('Sous-total', 'المجموع الجزئي')}</th></tr></thead>
      <tbody>${roomRows}</tbody>
    </table>

    ${serviceSection}
    ${agencyFeeBox(data, r)}
    ${paymentsTable(r.payments)}

    <!-- Totals -->
    <div class="totals-wrap">
      <div class="row"><span>${tr('Loyer', 'الإيجار')}</span><span>${formatDA(rentTotal)}</span></div>
      ${fee > 0 ? `<div class="row"><span>${tr("Frais d'agence", 'أتعاب الوكالة')}</span><span class="badge-fee">${formatDA(fee)}</span></div>` : ''}
      <div class="row"><span>${tr('Total location', 'مجموع الكراء')}</span><strong>${formatDA(r.total)}</strong></div>
      <div class="row"><span>${tr('Total payé', 'المبلغ المدفوع')}</span><span class="badge-paid">${formatDA(paid)}</span></div>
      <div class="row grand"><span>${tr('Reste dû', 'الباقي')}</span><span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></div>
    </div>

    <!-- Stamp -->
    <div class="stamp">
      <div style="font-size:11px;color:#64748b">
        <p>${tr('Le client reconnaît avoir pris connaissance des conditions de séjour.', 'يقر الزبون بأنه اطلع على شروط الإقامة.')}</p>
        <p style="margin-top:28px">${tr('Signature client', 'توقيع الزبون')} : ____________________</p>
      </div>
      ${eStamp(store)}
    </div>

    <div class="foot">${tr('Document généré par', 'وثيقة صادرة عن')} ${store.name}${store.phone ? ` — <span class="tel">${store.phone}</span>` : ''} — ${tr('Merci de votre confiance.', 'شكرا على ثقتكم.')}</div>
  </div>`;
}

// ─── Shared building blocks for the new documents ───────────────────────────

/** Bold phone number, with an optional light label in front of it. */
function tel(number?: string, label = tr('Tél :', 'الهاتف :')): string {
  if (!number) return '';
  return `<p><span class="tel-label">${label}</span> <span class="tel">${number}</span></p>`;
}

/**
 * Header shared by every printed document: the logo sits centred at the very
 * top with the agency name right under it, the agency contact details on the
 * left and its legal identifiers on the right (all in bold), then a band
 * carrying the document kind, its number and its date.
 */
function docHeader(store: StoreInfo, code: string, dateLabel: string, docTitle: string): string {
  const logoHtml = store.logo
    ? `<img src="${store.logo}" alt="logo" />`
    : `<div class="logo-placeholder">${store.name.charAt(0)}</div>`;
  // Left column: how to reach the agency. Right column: its legal identity.
  const contactLines = [
    store.address && `<p><span class="lbl">${tr('Adresse :', 'العنوان :')}</span> ${store.address}</p>`,
    store.phone && `<p><span class="lbl">${tr('Tél :', 'الهاتف :')}</span> ${store.phone}</p>`,
    store.email && `<p><span class="lbl">${tr('Email :', 'البريد :')}</span> ${store.email}</p>`,
  ].filter(Boolean).join('');
  const legalLines = [
    store.rc && `<p><span class="lbl">RC :</span> ${store.rc}</p>`,
    store.nif && `<p><span class="lbl">NIF :</span> ${store.nif}</p>`,
    store.nis && `<p><span class="lbl">NIS :</span> ${store.nis}</p>`,
    store.article && `<p><span class="lbl">Art :</span> ${store.article}</p>`,
  ].filter(Boolean).join('');
  return `
    <div class="head">
      <div class="head-row">
        <div class="head-side left">${contactLines}</div>
        <div class="head-center">
          <div class="logo-center">${logoHtml}</div>
          <h1 class="brand-name">${store.name}</h1>
          ${store.description ? `<p class="brand-desc">${store.description}</p>` : ''}
        </div>
        <div class="head-side right">${legalLines}</div>
      </div>
      <div class="doc-band">
        <span class="kind">${docTitle}</span>
        <span class="code">${tr('N°', 'رقم')} <bdi dir="ltr">${code}</bdi></span>
        <span class="date">${dateLabel}</span>
      </div>
    </div>`;
}

/**
 * Round rubber-stamp (cachet): a double ring with the agency name curved along
 * the top and its phone number curved along the bottom, and "CACHET" in the
 * centre. The ring texts are typeset smaller when they are long so they always
 * stay on the arc.
 */
function eStamp(store: StoreInfo): string {
  const name = (store.name ?? '').toUpperCase();
  const phone = (store.phone ?? '').trim();
  const bottom = phone ? `${tr('TÉL', 'الهاتف')} : ${phone}` : tr('CACHET OFFICIEL', 'الختم الرسمي');
  const nameSize = name.length > 34 ? 8 : name.length > 26 ? 9.5 : name.length > 18 ? 11.5 : 13.5;
  const bottomSize = bottom.length > 24 ? 8.5 : 10.5;
  return `
    <div class="cachet-circle">
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>
          <path id="cachetTop" d="M 22 100 A 78 78 0 0 1 178 100" />
          <path id="cachetBottom" d="M 26 100 A 74 74 0 0 0 174 100" />
        </defs>
        <circle cx="100" cy="100" r="95" class="cc-ring cc-ring-out" />
        <circle cx="100" cy="100" r="77" class="cc-ring cc-ring-in" />
        <text class="cc-arc" font-size="${nameSize}">
          <textPath href="#cachetTop" xlink:href="#cachetTop" startOffset="50%" text-anchor="middle">${name}</textPath>
        </text>
        <text class="cc-arc" font-size="${bottomSize}">
          <textPath href="#cachetBottom" xlink:href="#cachetBottom" startOffset="50%" text-anchor="middle">${bottom}</textPath>
        </text>
        <text x="16" y="105" class="cc-star">✦</text>
        <text x="184" y="105" class="cc-star" text-anchor="end">✦</text>
        <text x="100" y="97" text-anchor="middle" class="cc-center" font-size="20">${tr('CACHET', 'ختم')}</text>
        <line x1="64" y1="109" x2="136" y2="109" class="cc-divider" />
        <text x="100" y="123" text-anchor="middle" class="cc-center-sub">${tr('Signature électronique', 'توقيع إلكتروني')}</text>
      </svg>
    </div>`;
}

/** Human label for an identity-document type. */
function docTypeLabel(t?: Client['documentType']): string {
  return t === 'permis' ? tr('Permis', 'رخصة السياقة') : t === 'passeport' ? tr('Passeport', 'جواز السفر') : tr('CIN', 'بطاقة التعريف');
}

/**
 * Resolves the owner of an apartment from either the free-text owner fields set
 * on the apartment itself or a linked client record. Every field is optional.
 */
function ownerData(data: AppData, roomId: string | undefined) {
  const room = roomId ? data.rooms.find((r) => r.id === roomId) : undefined;
  const linked = room?.ownerClientId ? clientById(data, room.ownerClientId) : undefined;
  return {
    room,
    name: room?.ownerName || (linked ? `${linked.firstName} ${linked.lastName}` : ''),
    phone: room?.ownerPhone || linked?.phone || '',
    phone2: room?.ownerPhone2 || linked?.phone2 || '',
    email: room?.ownerEmail || linked?.email || '',
    address: room?.ownerAddress || linked?.address || '',
    city: room?.ownerCity || linked?.city || '',
    profession: room?.ownerProfession || linked?.profession || '',
    docType: room?.ownerDocumentType || linked?.documentType,
    docNumber: room?.ownerDocumentNumber || linked?.documentNumber || '',
  };
}

/** Owner block of an apartment (propriétaire du bien) — full information. */
function ownerSection(data: AppData, roomId: string | undefined, title = tr('🔑 Propriétaire du bien', '🔑 مالك العقار')): string {
  const o = ownerData(data, roomId);
  if (!o.name && !o.phone) {
    return `<div class="section orange"><h3>${title}</h3><p>—</p></div>`;
  }
  const loc = [o.address, o.city].filter(Boolean).join(', ');
  const phones = [o.phone, o.phone2].filter(Boolean).join(' / ');
  return `
    <div class="section orange">
      <h3>${title}</h3>
      <p><strong>${o.name || '—'}</strong>${o.profession ? ` <span class="tel-label">· ${o.profession}</span>` : ''}</p>
      ${tel(phones)}
      ${o.email ? `<p>${o.email}</p>` : ''}
      ${loc ? `<p>${loc}</p>` : ''}
      ${o.docNumber ? `<p><span class="tel-label">${tr('Pièce :', 'الوثيقة :')}</span> ${o.docNumber} (${docTypeLabel(o.docType)})</p>` : ''}
      ${o.room ? `<p><span class="tel-label">${tr('Bien :', 'العقار :')}</span> ${o.room.name}${o.room.commune ? ` — ${o.room.commune}` : ''}</p>` : ''}
    </div>`;
}

/** Owner party card used on the contract / versement (same data, party look). */
function ownerParty(data: AppData, roomId: string | undefined): string {
  const o = ownerData(data, roomId);
  const loc = [o.address, o.city].filter(Boolean).join(', ');
  const phones = [o.phone, o.phone2].filter(Boolean).join(' / ');
  return `
    <div class="party">
      <h3>${tr('Le Propriétaire', 'المالك')}</h3>
      <p class="role">${tr('Propriétaire du bien', 'مالك العقار')}</p>
      <p><strong>${o.name || '—'}</strong></p>
      ${o.profession ? `<p>${o.profession}</p>` : ''}
      ${tel(phones)}
      ${o.email ? `<p>${o.email}</p>` : ''}
      ${loc ? `<p>${loc}</p>` : ''}
      ${o.docNumber ? `<p>${tr('Pièce :', 'الوثيقة :')} ${o.docNumber} (${docTypeLabel(o.docType)})</p>` : ''}
      ${o.room ? `<p><span class="tel-label">${tr('Bien :', 'العقار :')}</span> ${o.room.name}${o.room.commune ? ` — ${o.room.commune}` : ''}</p>` : ''}
    </div>`;
}

/** Agency fee box (+ the employee share when one was set on the location). */
function agencyFeeBox(data: AppData, r: Reservation): string {
  const fee = r.agencyFee ?? 0;
  if (fee <= 0) return '';
  const commission = r.agencyFeeCommission ?? 0;
  const worker = r.agencyFeeWorkerId
    ? data.workers.find((w) => w.id === r.agencyFeeWorkerId)
    : undefined;
  const sub = commission > 0 && worker
    ? `<div class="fee-sub"><strong>${tr('Commission employé :', 'عمولة الموظف :')}</strong> ${worker.name} — ${r.agencyFeePercent ?? 0}% ${tr('des frais, soit', 'من الأتعاب، أي')} ${formatDA(commission)}</div>`
    : '';
  return `
    <div class="fee-box">
      <h3>💼 ${tr("Frais d'agence", 'أتعاب الوكالة')}</h3>
      <div class="fee-row">
        <span>${tr("Montant des frais d'agence (inclus dans le total)", 'مبلغ أتعاب الوكالة (مدرج في المجموع)')}</span>
        <span class="fee-amount">${formatDA(fee)}</span>
      </div>
      ${sub}
    </div>`;
}

function clientSection(client: Client | undefined, title = tr('👤 Client', '👤 الزبون')): string {
  return `
    <div class="section blue">
      <h3>${title}</h3>
      <p><strong>${client ? `${client.firstName} ${client.lastName}` : '—'}</strong></p>
      ${client?.sexe ? `<p>${client.sexe === 'M' ? tr('Masculin', 'ذكر') : tr('Féminin', 'أنثى')}${client.profession ? ` · ${client.profession}` : ''}</p>` : ''}
      ${tel(client?.phone ? `${client.phone}${client.phone2 ? ` / ${client.phone2}` : ''}` : '')}
      ${client?.email ? `<p>${client.email}</p>` : ''}
      ${client?.city || client?.address ? `<p>${[client?.address, client?.city].filter(Boolean).join(', ')}</p>` : ''}
      ${client?.documentType ? `<p>${tr('Pièce :', 'الوثيقة :')} ${client.documentNumber ?? '—'} (${docTypeLabel(client.documentType)})</p>` : ''}
    </div>`;
}

function apartmentSection(data: AppData, roomId: string, title = tr('🏠 Appartement', '🏠 الشقة')): string {
  const room = data.rooms.find((r) => r.id === roomId);
  if (!room) return `<div class="section violet"><h3>${title}</h3><p>—</p></div>`;
  const floor = data.floors.find((f) => f.id === room.floorId)?.name;
  const lines = [
    `<p><strong>${room.name}</strong></p>`,
    room.commune && `<p><strong>${tr('Commune :', 'البلدية :')}</strong> ${room.commune}</p>`,
    `<p><strong>${tr('Ameublement :', 'التأثيث :')}</strong> ${room.furnished ? tr('Meublé', 'مفروشة') : tr('Non meublé', 'غير مفروشة')}</p>`,
    room.furnished && room.furnitureDescription && `<p><strong>${tr('Meubles :', 'الأثاث :')}</strong> ${room.furnitureDescription}</p>`,
    floor && `<p><strong>${tr('Étage :', 'الطابق :')}</strong> ${floor}</p>`,
    `<p><strong>${tr('Chambres :', 'الغرف :')}</strong> ${room.capacity}</p>`,
    room.description && `<p><strong>${tr('Description :', 'الوصف :')}</strong> ${room.description}</p>`,
  ].filter(Boolean).join('');
  return `<div class="section violet"><h3>${title}</h3>${lines}</div>`;
}

function paymentsTable(payments: Payment[]): string {
  if (payments.length === 0) return '';
  return `
    <p class="tbl-head">💳 ${tr('Historique des paiements', 'سجل الدفعات')}</p>
    <table>
      <thead><tr><th>${tr('Date', 'التاريخ')}</th><th>${tr('Note', 'ملاحظة')}</th><th class="right">${tr('Montant', 'المبلغ')}</th></tr></thead>
      <tbody>${payments.map((p) => `<tr>
        <td>${formatDate(p.date)}</td>
        <td>${p.note ?? '—'}</td>
        <td class="right badge-paid">${formatDA(p.amount)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
}

function stampSection(store: StoreInfo, signerLabel: string): string {
  return `
    <div class="stamp">
      <div style="font-size:11px;color:#64748b">
        <p>${tr('Document établi en deux exemplaires.', 'حررت هذه الوثيقة في نسختين.')}</p>
        <p style="margin-top:28px">${tr('Signature', 'توقيع')} ${signerLabel} : ____________________</p>
      </div>
      ${eStamp(store)}
    </div>
    <div class="foot">${tr('Document généré par', 'وثيقة صادرة عن')} ${store.name}${store.phone ? ` — <span class="tel">${store.phone}</span>` : ''} — ${tr('Merci de votre confiance.', 'شكرا على ثقتكم.')}</div>`;
}

// ─── Facture de vente ────────────────────────────────────────────────────────

export function buildSaleInvoiceHTML(data: AppData, sale: Sale, store: StoreInfo): string {
  const client = clientById(data, sale.clientId);
  const paid = salePaid(sale);
  const remaining = saleRemaining(sale);
  const mediator = sale.mediatorId ? data.mediators.find((m) => m.id === sale.mediatorId) : undefined;

  const saleDetails = `
    <div class="section green">
      <h3>📅 ${tr('Détails de la vente', 'تفاصيل البيع')}</h3>
      <p><strong>${tr('Date :', 'التاريخ :')}</strong> ${formatDate(sale.date)} ${tr('à', 'على')} ${sale.time}</p>
      <p><strong>${tr('Statut :', 'الحالة :')}</strong> ${sale.status === 'paid' ? `<span class="badge-paid">${tr('Payée', 'مدفوعة')}</span>` : `<span class="badge-debt">${tr('Dette', 'دين')}</span>`}</p>
      ${sale.notes ? `<p><strong>${tr('Remarque :', 'ملاحظة :')}</strong> ${sale.notes}</p>` : ''}
    </div>`;

  const mediatorSection = mediator ? `
    <div class="section orange">
      <h3>🤝 ${tr('Médiateur', 'الوسيط')}</h3>
      <p><strong>${mediator.firstName} ${mediator.lastName}</strong></p>
      ${tel(mediator.phone)}
      <p><strong>${tr('Commission :', 'العمولة :')}</strong> ${formatDA(sale.mediatorCommission)}${sale.commissionType === 'percent' && sale.commissionPercent ? ` (${sale.commissionPercent}% ${tr('du prix de vente', 'من سعر البيع')})` : ''}</p>
    </div>` : '';

  return `
  <div class="doc compact">
    ${docHeader(store, sale.code, `${tr('Vente du', 'بيع بتاريخ')} ${formatDate(sale.date)} ${tr('à', 'على')} ${sale.time}`, tr('Facture de Vente', 'فاتورة بيع'))}
    <div class="grid2">
      ${clientSection(client, tr('👤 Acheteur', '👤 المشتري'))}
      ${apartmentSection(data, sale.roomId, tr('🏠 Appartement vendu', '🏠 الشقة المباعة'))}
    </div>
    ${mediatorSection
      ? `<div class="grid2">${mediatorSection}${saleDetails}</div>`
      : `<div style="margin-bottom:16px">${saleDetails}</div>`}
    ${paymentsTable(sale.payments)}
    <div class="totals-wrap">
      <div class="row"><span>${tr('Prix de vente', 'سعر البيع')}</span><strong>${formatDA(sale.price)}</strong></div>
      <div class="row"><span>${tr('Total payé', 'المبلغ المدفوع')}</span><span class="badge-paid">${formatDA(paid)}</span></div>
      <div class="row"><span>${tr('Reste dû', 'الباقي')}</span><span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></div>
      <div class="row grand"><span>${tr('Net à payer', 'الصافي للدفع')}</span><span>${formatDA(sale.price)}</span></div>
    </div>
    ${stampSection(store, tr('acheteur', 'المشتري'))}
  </div>`;
}

// ─── Bon d'achat ─────────────────────────────────────────────────────────────

export function buildPurchaseInvoiceHTML(data: AppData, purchase: Purchase, store: StoreInfo): string {
  const client = clientById(data, purchase.clientId);
  const paid = purchasePaid(purchase);
  const remaining = purchaseRemaining(purchase);

  return `
  <div class="doc compact">
    ${docHeader(store, purchase.code, `${tr('Achat du', 'شراء بتاريخ')} ${formatDate(purchase.date)} ${tr('à', 'على')} ${purchase.time}`, tr("Bon d'Achat", 'وصل شراء'))}
    <div class="grid2">
      ${clientSection(client, tr('👤 Vendeur', '👤 البائع'))}
      ${apartmentSection(data, purchase.roomId, tr('🏠 Appartement acquis', '🏠 الشقة المقتناة'))}
    </div>
    <div class="section green" style="margin-bottom:16px">
      <h3>📅 ${tr("Détails de l'achat", 'تفاصيل الشراء')}</h3>
      <p><strong>${tr('Date :', 'التاريخ :')}</strong> ${formatDate(purchase.date)} ${tr('à', 'على')} ${purchase.time}</p>
      <p><strong>${tr("Prix d'achat :", 'سعر الشراء :')}</strong> ${formatDA(purchase.purchasePrice)}</p>
      <p><strong>${tr('Prix de revente prévu :', 'سعر إعادة البيع المتوقع :')}</strong> ${formatDA(purchase.salePrice)}</p>
      <p><strong>${tr('Statut :', 'الحالة :')}</strong> ${purchase.status === 'paid' ? `<span class="badge-paid">${tr('Payé', 'مدفوع')}</span>` : `<span class="badge-debt">${tr('Dette', 'دين')}</span>`}</p>
      ${purchase.notes ? `<p><strong>${tr('Remarque :', 'ملاحظة :')}</strong> ${purchase.notes}</p>` : ''}
    </div>
    ${paymentsTable(purchase.payments)}
    <div class="totals-wrap">
      <div class="row"><span>${tr("Prix d'achat", 'سعر الشراء')}</span><strong>${formatDA(purchase.purchasePrice)}</strong></div>
      <div class="row"><span>${tr("Payé par l'agence", 'المدفوع من الوكالة')}</span><span class="badge-paid">${formatDA(paid)}</span></div>
      <div class="row"><span>${tr('Reste à payer', 'الباقي للدفع')}</span><span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></div>
      <div class="row grand"><span>${tr('Total achat', 'مجموع الشراء')}</span><span>${formatDA(purchase.purchasePrice)}</span></div>
    </div>
    ${stampSection(store, tr('vendeur', 'البائع'))}
  </div>`;
}

// ─── Reçus de paiement (vente / achat / réservation / médiateur) ────────────

function receiptShell(
  store: StoreInfo,
  code: string,
  title: string,
  payment: Payment,
  infoSections: string,
  totals: { label: string; value: string; cls?: string }[],
): string {
  return `
  <div class="doc compact">
    ${docHeader(store, code, `${tr('Paiement du', 'دفعة بتاريخ')} ${formatDate(payment.date)}`, title)}
    <div class="section green" style="margin-bottom:16px;text-align:center;padding:18px">
      <h3>💰 ${tr('Montant du paiement', 'مبلغ الدفعة')}</h3>
      <p style="font-size:26px;font-weight:900;color:#059669;margin-top:4px">${formatDA(payment.amount)}</p>
      ${payment.note ? `<p style="margin-top:6px;color:#475569">${payment.note}</p>` : ''}
    </div>
    ${infoSections}
    <div class="totals-wrap">
      ${totals.map((t) => `<div class="row"><span>${t.label}</span><span class="${t.cls ?? ''}">${t.value}</span></div>`).join('')}
    </div>
    ${stampSection(store, tr('client', 'الزبون'))}
  </div>`;
}

export function buildSalePaymentReceiptHTML(
  data: AppData, sale: Sale, payment: Payment, store: StoreInfo,
): string {
  const client = clientById(data, sale.clientId);
  const infos = `
    <div class="grid2">
      ${clientSection(client, tr('👤 Acheteur', '👤 المشتري'))}
      ${apartmentSection(data, sale.roomId, tr('🏠 Appartement vendu', '🏠 الشقة المباعة'))}
    </div>
    <div class="section orange" style="margin-bottom:16px">
      <h3>📋 ${tr('Vente', 'بيع')} ${sale.code}</h3>
      <p><strong>${tr('Date de vente :', 'تاريخ البيع :')}</strong> ${formatDate(sale.date)} ${tr('à', 'على')} ${sale.time}</p>
      <p><strong>${tr('Prix de vente :', 'سعر البيع :')}</strong> ${formatDA(sale.price)}</p>
      ${sale.mediatorId ? `<p><strong>${tr('Médiateur :', 'الوسيط :')}</strong> ${mediatorName(data, sale.mediatorId)}</p>` : ''}
    </div>
    ${paymentsTable(sale.payments)}`;
  return receiptShell(store, sale.code, tr('Reçu de Paiement — Vente', 'وصل دفع — بيع'), payment, infos, [
    { label: tr('Prix de vente', 'سعر البيع'), value: formatDA(sale.price) },
    { label: tr('Total payé', 'المبلغ المدفوع'), value: formatDA(salePaid(sale)), cls: 'badge-paid' },
    { label: tr('Reste dû', 'الباقي'), value: formatDA(saleRemaining(sale)), cls: saleRemaining(sale) > 0 ? 'badge-debt' : 'badge-paid' },
  ]);
}

export function buildPurchasePaymentReceiptHTML(
  data: AppData, purchase: Purchase, payment: Payment, store: StoreInfo,
): string {
  const client = clientById(data, purchase.clientId);
  const infos = `
    <div class="grid2">
      ${clientSection(client, tr('👤 Vendeur', '👤 البائع'))}
      ${apartmentSection(data, purchase.roomId, tr('🏠 Appartement acquis', '🏠 الشقة المقتناة'))}
    </div>
    <div class="section orange" style="margin-bottom:16px">
      <h3>📋 ${tr('Achat', 'شراء')} ${purchase.code}</h3>
      <p><strong>${tr("Date d'achat :", 'تاريخ الشراء :')}</strong> ${formatDate(purchase.date)} ${tr('à', 'على')} ${purchase.time}</p>
      <p><strong>${tr("Prix d'achat :", 'سعر الشراء :')}</strong> ${formatDA(purchase.purchasePrice)}</p>
      <p><strong>${tr('Prix de revente prévu :', 'سعر إعادة البيع المتوقع :')}</strong> ${formatDA(purchase.salePrice)}</p>
    </div>
    ${paymentsTable(purchase.payments)}`;
  return receiptShell(store, purchase.code, tr('Reçu de Paiement — Achat', 'وصل دفع — شراء'), payment, infos, [
    { label: tr("Prix d'achat", 'سعر الشراء'), value: formatDA(purchase.purchasePrice) },
    { label: tr("Payé par l'agence", 'المدفوع من الوكالة'), value: formatDA(purchasePaid(purchase)), cls: 'badge-paid' },
    { label: tr('Reste à payer', 'الباقي للدفع'), value: formatDA(purchaseRemaining(purchase)), cls: purchaseRemaining(purchase) > 0 ? 'badge-debt' : 'badge-paid' },
  ]);
}

export function buildReservationPaymentReceiptHTML(
  data: AppData, r: Reservation, payment: Payment, store: StoreInfo,
): string {
  const client = clientById(data, r.clientId);
  const roomsList = r.rooms
    .map((rr) => data.rooms.find((x) => x.id === rr.roomId)?.name)
    .filter(Boolean)
    .join(', ');
  const fee = r.agencyFee ?? 0;
  const infos = `
    <div class="grid2">
      ${ownerSection(data, r.rooms[0]?.roomId)}
      ${clientSection(client)}
    </div>
    <div class="section violet" style="margin-bottom:14px">
      <h3>📋 ${tr('Location', 'كراء')} ${r.code}</h3>
      <p><strong>${tr('Appartement(s) :', 'الشقق :')}</strong> ${roomsList || '—'}</p>
      <p><strong>${tr('Arrivée :', 'الدخول :')}</strong> ${formatDate(r.checkIn)} ${tr('à', 'على')} ${r.checkInTime}</p>
      <p><strong>${tr('Départ :', 'الخروج :')}</strong> ${formatDate(r.checkOut)} ${tr('à', 'على')} ${r.checkOutTime}</p>
      <p><strong>${tr('Durée :', 'المدة :')}</strong> ${durationLabel(data, r)}</p>
    </div>
    ${agencyFeeBox(data, r)}
    ${paymentsTable(r.payments)}`;
  return receiptShell(store, r.code, tr('Reçu de Paiement — Location', 'وصل دفع — كراء'), payment, infos, [
    ...(fee > 0 ? [{ label: tr("Dont frais d'agence", 'منها أتعاب الوكالة'), value: formatDA(fee), cls: 'badge-fee' }] : []),
    { label: tr('Total location', 'مجموع الكراء'), value: formatDA(r.total) },
    { label: tr('Total payé', 'المبلغ المدفوع'), value: formatDA(reservationPaid(r)), cls: 'badge-paid' },
    { label: tr('Reste dû', 'الباقي'), value: formatDA(reservationRemaining(r)), cls: reservationRemaining(r) > 0 ? 'badge-debt' : 'badge-paid' },
  ]);
}

export function buildMediatorPaymentReceiptHTML(
  data: AppData, mediator: Mediator, payment: Payment, store: StoreInfo,
): string {
  const stats = mediatorStats(mediator, data.sales);
  const salesRows = data.sales
    .filter((s) => s.mediatorId === mediator.id)
    .map((s) => {
      const room = data.rooms.find((r) => r.id === s.roomId);
      return `<tr>
        <td>${s.code}</td>
        <td>${room?.name ?? '—'}</td>
        <td>${formatDate(s.date)}</td>
        <td class="right">${formatDA(s.price)}</td>
        <td class="right badge-paid">${formatDA(s.mediatorCommission)}</td>
      </tr>`;
    }).join('');
  const infos = `
    <div class="grid2">
      <div class="section blue">
        <h3>🤝 ${tr('Médiateur', 'الوسيط')}</h3>
        <p><strong>${mediator.firstName} ${mediator.lastName}</strong></p>
        ${tel(`${mediator.phone}${mediator.phone2 ? ` / ${mediator.phone2}` : ''}`)}
        ${mediator.email ? `<p>${mediator.email}</p>` : ''}
        ${mediator.city || mediator.address ? `<p>${[mediator.address, mediator.city].filter(Boolean).join(', ')}</p>` : ''}
        ${mediator.cin ? `<p>${tr('CIN :', 'بطاقة التعريف :')} ${mediator.cin}</p>` : ''}
      </div>
      <div class="section violet">
        <h3>📊 ${tr('Situation des commissions', 'وضعية العمولات')}</h3>
        <p><strong>${tr('Ventes réalisées :', 'المبيعات المنجزة :')}</strong> ${stats.salesCount}</p>
        <p><strong>${tr('Commissions gagnées :', 'العمولات المكتسبة :')}</strong> ${formatDA(stats.commissionEarned)}</p>
        <p><strong>${tr('Déjà payé :', 'المدفوع سابقا :')}</strong> ${formatDA(stats.paid)}</p>
        <p><strong>${tr('Reste dû :', 'الباقي :')}</strong> ${formatDA(stats.remaining)}</p>
      </div>
    </div>
    ${salesRows ? `
      <p class="tbl-head">🏠 ${tr('Ventes avec ce médiateur', 'المبيعات مع هذا الوسيط')}</p>
      <table>
        <thead><tr><th>${tr('Code', 'الرمز')}</th><th>${tr('Appartement', 'الشقة')}</th><th>${tr('Date', 'التاريخ')}</th><th class="right">${tr('Prix vente', 'سعر البيع')}</th><th class="right">${tr('Commission', 'العمولة')}</th></tr></thead>
        <tbody>${salesRows}</tbody>
      </table>` : ''}
    ${paymentsTable(mediator.payments)}`;
  return receiptShell(store, `MED-${mediator.id.slice(0, 6).toUpperCase()}`, tr('Reçu de Commission — Médiateur', 'وصل عمولة — وسيط'), payment, infos, [
    { label: tr('Commissions gagnées', 'العمولات المكتسبة'), value: formatDA(stats.commissionEarned) },
    { label: tr('Total payé', 'المبلغ المدفوع'), value: formatDA(stats.paid), cls: 'badge-paid' },
    { label: tr('Reste dû', 'الباقي'), value: formatDA(stats.remaining), cls: stats.remaining > 0 ? 'badge-debt' : 'badge-paid' },
  ]);
}

// ─── Rapport de Zakat ────────────────────────────────────────────────────────

/** Printable Zakat statement for one accounting year (1 Jan → 31 Dec). */
export function buildZakatReportHTML(
  store: StoreInfo,
  inputs: ZakatInputs,
  result: ZakatResult,
  year: number,
): string {
  const row = (label: string, value: string, cls = '') =>
    `<tr><td>${label}</td><td class="right ${cls}">${value}</td></tr>`;

  return `
  <div class="doc compact">
    ${docHeader(store, `ZAK-${year}`, tr(`Exercice du 01/01/${year} au 31/12/${year}`, `السنة المالية من 01/01/${year} إلى 31/12/${year}`), tr('Calcul de la Zakat', 'حساب الزكاة'))}

    <div class="doc-title-band">
      <h2>${tr('Zakat des Biens Commerciaux', 'زكاة عروض التجارة')}</h2>
      <div class="sub">${tr(`Exercice ${year} — 1 janvier au 31 décembre · Taux`, `السنة المالية ${year} — من 1 جانفي إلى 31 ديسمبر · النسبة`)} ${(ZAKAT_RATE * 100).toFixed(1)} %</div>
    </div>

    <p class="tbl-head">💰 ${tr('Actifs zakatables', 'الأصول الزكوية')}</p>
    <table>
      <thead><tr><th>${tr('Poste', 'البند')}</th><th class="right">${tr('Montant', 'المبلغ')}</th></tr></thead>
      <tbody>
        ${row(tr('Liquidités en banque', 'السيولة في البنك'), formatDZD(inputs.bankCash))}
        ${row(tr('Liquidités en caisse', 'السيولة في الصندوق'), formatDZD(inputs.cashOnHand))}
        ${row(tr('Commissions à encaisser', 'عمولات قيد التحصيل'), formatDZD(inputs.receivableCommissions))}
        ${row(tr('Biens immobiliers destinés à la revente', 'عقارات معدة لإعادة البيع'), formatDZD(inputs.propertiesForSale))}
        ${row(tr('Autres marchandises', 'بضائع أخرى'), formatDZD(inputs.tradeInventory))}
        ${row(tr('Autres actifs zakatables', 'أصول زكوية أخرى'), formatDZD(inputs.otherAssets))}
        <tr><td><strong>${tr('Total des actifs', 'مجموع الأصول')}</strong></td><td class="right"><strong>${formatDZD(result.totalAssets)}</strong></td></tr>
      </tbody>
    </table>

    <p class="tbl-head">📉 ${tr('Dettes exigibles', 'الديون المستحقة')}</p>
    <table>
      <thead><tr><th>${tr('Poste', 'البند')}</th><th class="right">${tr('Montant', 'المبلغ')}</th></tr></thead>
      <tbody>
        ${row(tr('Dettes à court terme', 'ديون قصيرة الأجل'), formatDZD(result.totalLiabilities), 'badge-debt')}
      </tbody>
    </table>

    <p class="tbl-head">🧮 ${tr('Étapes du calcul', 'مراحل الحساب')}</p>
    <table>
      <thead><tr><th>${tr('Étape', 'المرحلة')}</th><th class="right">${tr('Valeur', 'القيمة')}</th></tr></thead>
      <tbody>
        ${row(tr('Total des actifs', 'مجموع الأصول'), formatDZD(result.totalAssets))}
        ${row(tr('− Dettes exigibles', '− الديون المستحقة'), formatDZD(result.totalLiabilities))}
        ${row(tr('= Assiette zakatable nette', '= الوعاء الزكوي الصافي'), formatDZD(result.netWealth))}
        ${row(
          `${tr('Nisab', 'النصاب')} (${NISAB_GOLD_GRAMS} ${tr("g d'or", 'غ من الذهب')}${result.nisabFromGold ? ` × ${formatDZD(inputs.goldPricePerGram)}/g` : ''})`,
          formatDZD(result.nisab),
        )}
        ${row(tr('Nisab atteint ?', 'هل بلغ النصاب ؟'), result.isDue ? tr('Oui — Zakat obligatoire', 'نعم — الزكاة واجبة') : tr('Non — Zakat non due', 'لا — الزكاة غير واجبة'))}
        ${row(tr('Taux appliqué', 'النسبة المطبقة'), result.isDue ? `${(ZAKAT_RATE * 100).toFixed(1)} %` : '—')}
      </tbody>
    </table>

    <div class="amount-hero">
      <div class="lbl">${tr('Montant de la Zakat à verser', 'مبلغ الزكاة الواجب إخراجه')}</div>
      <div class="val">${formatDZD(result.zakat)}</div>
      <div class="words">${
        result.isDue
          ? `${tr('Soit', 'أي')} ${formatDZD(result.netWealth)} × 2,5 %.`
          : tr("L'assiette zakatable n'atteint pas le nisab : aucune Zakat n'est due.", 'الوعاء الزكوي لم يبلغ النصاب : لا زكاة واجبة.')
      }</div>
    </div>

    ${stampSection(store, tr('responsable', 'المسؤول'))}
  </div>`;
}

// ─── Rapport des dépenses (période + catégorie) ─────────────────────────────

/**
 * Printable expenses report for a date range.
 * `categoryId` narrows the general-expenses table to a single category;
 * maintenance costs are always reported for the whole period.
 */
export function buildExpensesReportHTML(
  data: AppData,
  store: StoreInfo,
  from: string,
  to: string,
  categoryId?: string,
): string {
  const expenses = data.expenses
    .filter((e) => e.date >= from && e.date <= to && (!categoryId || e.categoryId === categoryId))
    .sort((a, b) => a.date.localeCompare(b.date));
  const maintenances = data.maintenances
    .filter((m) => m.date >= from && m.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date));

  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const maintTotal = maintenances.reduce((s, m) => s + m.cost, 0);

  const byCategory = data.expenseCategories
    .map((c) => ({
      name: c.name,
      total: expenses.filter((e) => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const categoryName = categoryId
    ? data.expenseCategories.find((c) => c.id === categoryId)?.name ?? '—'
    : tr('Toutes les catégories', 'جميع الفئات');

  const expenseRows = expenses.length
    ? expenses.map((e) => `<tr>
        <td>${formatDate(e.date)}</td>
        <td>${e.name}</td>
        <td>${data.expenseCategories.find((c) => c.id === e.categoryId)?.name ?? '—'}</td>
        <td>${e.description ?? ''}</td>
        <td class="right badge-debt">${formatDA(e.amount)}</td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;color:#94a3b8">${tr('Aucune dépense sur la période', 'لا توجد مصاريف في هذه الفترة')}</td></tr>`;

  const maintRows = maintenances.length
    ? maintenances.map((m) => `<tr>
        <td>${formatDate(m.date)}</td>
        <td>${data.rooms.find((r) => r.id === m.roomId)?.name ?? '—'}</td>
        <td>${m.name}</td>
        <td>${m.description ?? ''}</td>
        <td class="right badge-debt">${formatDA(m.cost)}</td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;color:#94a3b8">${tr('Aucune maintenance sur la période', 'لا توجد صيانة في هذه الفترة')}</td></tr>`;

  const categoryRows = byCategory
    .map((c) => `<tr><td>${c.name}</td><td class="right">${formatDA(c.total)}</td></tr>`)
    .join('');

  return `
  <div class="doc compact">
    ${docHeader(store, `DEP-${from}_${to}`, `${tr('Période du', 'الفترة من')} ${formatDate(from)} ${tr('au', 'إلى')} ${formatDate(to)}`, tr('Rapport des Dépenses', 'تقرير المصاريف'))}

    <div class="doc-title-band">
      <h2>${tr('Rapport des Dépenses', 'تقرير المصاريف')}</h2>
      <div class="sub">${formatDate(from)} → ${formatDate(to)} · ${categoryName}</div>
    </div>

    <p class="tbl-head">🧾 ${tr('Dépenses générales', 'المصاريف العامة')}</p>
    <table>
      <thead><tr><th>${tr('Date', 'التاريخ')}</th><th>${tr('Libellé', 'البيان')}</th><th>${tr('Catégorie', 'الفئة')}</th><th>${tr('Description', 'الوصف')}</th><th class="right">${tr('Montant', 'المبلغ')}</th></tr></thead>
      <tbody>${expenseRows}</tbody>
    </table>

    ${categoryRows ? `
      <p class="tbl-head">📊 ${tr('Répartition par catégorie', 'التوزيع حسب الفئة')}</p>
      <table>
        <thead><tr><th>${tr('Catégorie', 'الفئة')}</th><th class="right">${tr('Total', 'المجموع')}</th></tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>` : ''}

    <p class="tbl-head">🔧 ${tr('Maintenances', 'الصيانة')}</p>
    <table>
      <thead><tr><th>${tr('Date', 'التاريخ')}</th><th>${tr('Appartement', 'الشقة')}</th><th>${tr('Intervention', 'التدخل')}</th><th>${tr('Description', 'الوصف')}</th><th class="right">${tr('Coût', 'التكلفة')}</th></tr></thead>
      <tbody>${maintRows}</tbody>
    </table>

    <div class="totals-wrap">
      <div class="row"><span>${tr('Dépenses générales', 'المصاريف العامة')}</span><span class="badge-debt">${formatDA(expensesTotal)}</span></div>
      <div class="row"><span>${tr('Maintenances', 'الصيانة')}</span><span class="badge-debt">${formatDA(maintTotal)}</span></div>
      <div class="row grand"><span>${tr('Total des charges', 'مجموع الأعباء')}</span><span>${formatDA(expensesTotal + maintTotal)}</span></div>
    </div>

    ${stampSection(store, tr('responsable', 'المسؤول'))}
  </div>`;
}

// ─── Contrat de location (rental contract) ──────────────────────────────────

export function buildRentalContractHTML(data: AppData, r: Reservation, store: StoreInfo): string {
  const client = clientById(data, r.clientId);
  const nights = r.nights;
  const paid = reservationPaid(r);
  const remaining = reservationRemaining(r);
  const fee = r.agencyFee ?? 0;
  const rentTotal = Math.max(0, r.total - fee);
  const mainRoomId = r.rooms[0]?.roomId;

  const roomRows = r.rooms.map((rr) => {
    const room = data.rooms.find((x) => x.id === rr.roomId);
    const floor = room ? (data.floors.find((f) => f.id === room.floorId)?.name ?? '—') : '—';
    const loc = room?.commune ?? '';
    return `<tr>
      <td>${room?.name ?? '—'}</td>
      <td>${loc || '—'}</td>
      <td>${floor}</td>
      <td class="right">${formatDA(rr.pricePerNight)}</td>
      <td class="right">${nights}</td>
      <td class="right">${formatDA(rr.pricePerNight * nights)}</td>
    </tr>`;
  }).join('');

  return `
  <div class="doc compact">
    ${docHeader(store, r.code, `${tr('Établi le', 'حرر في')} ${formatDate(r.createdAt)}`, tr('Contrat de Location', 'عقد كراء'))}

    <!-- Parties: the agency (mandataire), the owner of the apartment, the tenant -->
    <div class="parties" style="grid-template-columns:1fr 1fr 1fr">
      <div class="party">
        <h3>${tr('Le Bailleur / Mandataire', 'المؤجر / الوكيل')}</h3>
        <p class="role">${tr('Agence', 'الوكالة')}</p>
        <p><strong>${store.name}</strong></p>
        ${store.address ? `<p>${store.address}</p>` : ''}
        ${tel(store.phone)}
        ${store.email ? `<p>${store.email}</p>` : ''}
        ${store.rc ? `<p>RC : ${store.rc}${store.nif ? ` · NIF : ${store.nif}` : ''}</p>` : ''}
      </div>
      ${ownerParty(data, mainRoomId)}
      <div class="party">
        <h3>${tr('Le Locataire', 'المستأجر')}</h3>
        <p class="role">${tr('Client', 'الزبون')}</p>
        <p><strong>${client ? `${client.firstName} ${client.lastName}` : '—'}</strong></p>
        ${tel(client?.phone ? `${client.phone}${client.phone2 ? ` / ${client.phone2}` : ''}` : '')}
        ${client?.address || client?.city ? `<p>${[client?.address, client?.city].filter(Boolean).join(', ')}</p>` : ''}
        ${client?.documentType ? `<p>${tr('Pièce :', 'الوثيقة :')} ${client.documentNumber ?? '—'} (${docTypeLabel(client.documentType)})</p>` : ''}
      </div>
    </div>

    <p class="tbl-head">🏠 ${tr('Bien(s) loué(s)', 'العقارات المؤجرة')}</p>
    <table>
      <thead><tr><th>${tr('Appartement', 'الشقة')}</th><th>${tr('Localisation', 'الموقع')}</th><th>${tr('Étage', 'الطابق')}</th><th class="right">${unitPriceHeader(data, r)}</th><th class="right">${tr('Durée', 'المدة')}</th><th class="right">${tr('Sous-total', 'المجموع الجزئي')}</th></tr></thead>
      <tbody>${roomRows}</tbody>
    </table>

    <div class="grid2">
      <div class="section green">
        <h3>📅 ${tr('Durée de la location', 'مدة الكراء')}</h3>
        <p><strong>${tr('Arrivée :', 'الدخول :')}</strong> ${formatDate(r.checkIn)} ${tr('à', 'على')} ${r.checkInTime}</p>
        <p><strong>${tr('Départ :', 'الخروج :')}</strong> ${formatDate(r.checkOut)} ${tr('à', 'على')} ${r.checkOutTime}</p>
        <p><strong>${tr('Durée :', 'المدة :')}</strong> ${durationLabel(data, r)}</p>
      </div>
      <div class="section blue">
        <h3>💰 ${tr('Conditions financières', 'الشروط المالية')}</h3>
        <p><strong>${tr('Loyer :', 'الإيجار :')}</strong> ${formatDA(rentTotal)}</p>
        ${fee > 0 ? `<p><strong>${tr("Frais d'agence :", 'أتعاب الوكالة :')}</strong> <span class="badge-fee">${formatDA(fee)}</span></p>` : ''}
        <p><strong>${tr('Total à payer :', 'المبلغ الواجب دفعه :')}</strong> ${formatDA(r.total)}</p>
        <p><strong>${tr('Déjà versé :', 'المدفوع :')}</strong> ${formatDA(paid)}</p>
        <p><strong>${tr('Reste dû :', 'الباقي :')}</strong> <span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></p>
      </div>
    </div>

    ${agencyFeeBox(data, r)}

    <div class="clauses">
      <h4>${tr('Conditions générales', 'الشروط العامة')}</h4>
      <ol>
        <li>${tr(`La présente location est consentie pour la période du ${formatDate(r.checkIn)} au ${formatDate(r.checkOut)}, soit ${durationLabel(data, r)}.`, `يمنح هذا الكراء للفترة الممتدة من ${formatDate(r.checkIn)} إلى ${formatDate(r.checkOut)}، أي ${durationLabel(data, r)}.`)}</li>
        <li>${tr(`Le montant total de la location s'élève à ${formatDA(r.total)}${fee > 0 ? `, dont ${formatDA(fee)} de frais d'agence` : ''}, payable selon l'échéancier convenu entre les parties.`, `يبلغ المبلغ الإجمالي للكراء ${formatDA(r.total)}${fee > 0 ? `، منها ${formatDA(fee)} أتعاب الوكالة` : ''}، يدفع حسب الجدول المتفق عليه بين الطرفين.`)}</li>
        ${fee > 0 ? `<li>${tr(`Les frais d'agence de ${formatDA(fee)} rémunèrent l'intermédiation de l'agence et restent acquis à celle-ci.`, `أتعاب الوكالة البالغة ${formatDA(fee)} مقابل وساطة الوكالة وتبقى مكتسبة لها.`)}</li>` : ''}
        <li>${tr("Le locataire s'engage à occuper le bien loué paisiblement et à le restituer dans l'état où il l'a reçu.", 'يلتزم المستأجر بشغل العقار المؤجر بهدوء وإرجاعه بالحالة التي استلمه عليها.')}</li>
        <li>${tr('Toute prolongation au-delà de la date de départ pourra donner lieu à une facturation supplémentaire au tarif en vigueur.', 'كل تمديد بعد تاريخ الخروج قد يترتب عنه فوترة إضافية حسب التسعيرة المعمول بها.')}</li>
        <li>${tr('Le locataire demeure responsable de toute dégradation causée au bien pendant la durée de la location.', 'يبقى المستأجر مسؤولا عن أي ضرر يلحق بالعقار خلال مدة الكراء.')}</li>
        <li>${tr('Le présent contrat est établi en deux exemplaires originaux, un pour chaque partie.', 'حرر هذا العقد في نسختين أصليتين، نسخة لكل طرف.')}</li>
      </ol>
    </div>

    ${paymentsTable(r.payments)}

    <div class="sign-grid">
      <div class="sign-box"><p class="who">${tr('Le Locataire', 'المستأجر')}</p><div class="line">${client ? `${client.firstName} ${client.lastName}` : tr('Signature', 'التوقيع')}</div></div>
      <div class="sign-box stamp-cell">
        <p class="who">${tr("Cachet de l'agence", 'ختم الوكالة')}</p>
        ${eStamp(store)}
      </div>
      <div class="sign-box"><p class="who">${tr('Le Bailleur', 'المؤجر')}</p><div class="line">${store.name}</div></div>
    </div>

    <div class="foot">${tr('Document généré par', 'وثيقة صادرة عن')} ${store.name}${store.phone ? ` — <span class="tel">${store.phone}</span>` : ''} — ${tr('Merci de votre confiance.', 'شكرا على ثقتكم.')}</div>
  </div>`;
}

// ─── Bon de versement (payment voucher) ─────────────────────────────────────

export function buildVersementHTML(data: AppData, r: Reservation, store: StoreInfo): string {
  const client = clientById(data, r.clientId);
  const paid = reservationPaid(r);
  const remaining = reservationRemaining(r);
  const fee = r.agencyFee ?? 0;
  const rentTotal = Math.max(0, r.total - fee);
  const mainRoomId = r.rooms[0]?.roomId;
  const roomsList = r.rooms
    .map((rr) => data.rooms.find((x) => x.id === rr.roomId)?.name)
    .filter(Boolean)
    .join(', ');
  const issueDate = r.payments[r.payments.length - 1]?.date ?? r.createdAt;

  return `
  <div class="doc compact">
    ${docHeader(store, r.code, `${tr('Établi le', 'حرر في')} ${formatDate(issueDate)}`, tr('Bon de Versement', 'وصل دفع'))}

    <div class="amount-hero">
      <div class="lbl">${tr('Montant total versé', 'المبلغ الإجمالي المدفوع')}</div>
      <div class="val">${formatDA(paid)}</div>
      <div class="words">${tr('Reçu de', 'استلمنا من')} ${client ? `${client.firstName} ${client.lastName}` : tr('la part du client', 'الزبون')} ${tr('la somme ci-dessus.', 'المبلغ المذكور أعلاه.')}</div>
    </div>

    <!-- Owner of the apartment + client who paid -->
    <div class="grid2">
      ${ownerSection(data, mainRoomId)}
      ${clientSection(client, tr('👤 Versé par (Client)', '👤 دفع من طرف (الزبون)'))}
    </div>

    <div class="grid2">
      <div class="section violet">
        <h3>📋 ${tr('Location', 'كراء')} ${r.code}</h3>
        <p><strong>${tr('Appartement(s) :', 'الشقق :')}</strong> ${roomsList || '—'}</p>
        <p><strong>${tr('Séjour :', 'الإقامة :')}</strong> ${formatDate(r.checkIn)} → ${formatDate(r.checkOut)}</p>
        <p><strong>${tr('Durée :', 'المدة :')}</strong> ${durationLabel(data, r)}</p>
      </div>
      <div class="section green">
        <h3>💰 ${tr('Détail du montant', 'تفاصيل المبلغ')}</h3>
        <p><strong>${tr('Loyer :', 'الإيجار :')}</strong> ${formatDA(rentTotal)}</p>
        ${fee > 0 ? `<p><strong>${tr("Frais d'agence :", 'أتعاب الوكالة :')}</strong> <span class="badge-fee">${formatDA(fee)}</span></p>` : ''}
        <p><strong>${tr('Total location :', 'مجموع الكراء :')}</strong> ${formatDA(r.total)}</p>
      </div>
    </div>

    ${agencyFeeBox(data, r)}

    ${paymentsTable(r.payments)}

    <div class="totals-wrap">
      <div class="row"><span>${tr('Loyer', 'الإيجار')}</span><span>${formatDA(rentTotal)}</span></div>
      ${fee > 0 ? `<div class="row"><span>${tr("Frais d'agence", 'أتعاب الوكالة')}</span><span class="badge-fee">${formatDA(fee)}</span></div>` : ''}
      <div class="row"><span>${tr('Total location', 'مجموع الكراء')}</span><strong>${formatDA(r.total)}</strong></div>
      <div class="row"><span>${tr('Total versé', 'مجموع المدفوع')}</span><span class="badge-paid">${formatDA(paid)}</span></div>
      <div class="row grand"><span>${tr('Reste dû', 'الباقي')}</span><span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></div>
    </div>

    ${stampSection(store, tr('client', 'الزبون'))}
  </div>`;
}

// ─── Résiliation / فسخ عقد إيجار (termination of a rental contract) ─────────

export type TerminationLang = 'fr' | 'ar';

function escapeHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** dd/mm/yyyy — reads the same in the French and the Arabic letter. */
function numDate(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

const TERMINATION_TEXT = {
  fr: {
    title: 'Résiliation de Contrat de Location',
    agency: 'Agence Immobilière',
    services: 'Vente · Achat · Location · Échange · Gestion immobilière',
    address: 'Adresse', phone: 'Tél', email: 'Email',
    docNo: 'Réf. contrat', issued: 'Établi le',
    signerSec: 'Le / la soussigné(e)', fullName: 'Nom et prénom :', capacity: 'En qualité de :',
    tenant: 'Locataire', owner: 'Propriétaire', tel: 'Téléphone :', addr: 'Adresse :', idDoc: "Pièce d'identité :",
    declare: 'Déclare vouloir résilier le contrat de location portant sur le bien désigné ci-dessous :',
    propSec: 'Bien loué & contrat', property: 'Bien :', location: 'Adresse du bien :', details: 'Caractéristiques :',
    concludedWith: 'Conclu avec M./Mme :', startDate: 'Date du contrat :', endDate: 'Échéance prévue :',
    termDate: 'Date de résiliation :', rent: 'Loyer :', datesSec: 'Dates du contrat',
    reasonsSec: 'Motifs de la résiliation', closing: "En conséquence, je vous prie de bien vouloir procéder aux formalités de résiliation du contrat de location conformément à la réglementation en vigueur.",
    madeAt: 'Fait à :', date: 'Le :',
    signTenant: 'Signature du locataire', signOwner: 'Signature du propriétaire', signAgency: "Cachet de l'agence",
    furnished: 'Meublé', unfurnished: 'Non meublé', rooms: 'pièce(s)', floor: 'Étage',
    perMonth: '/ mois', perNight: '/ nuit',
  },
  ar: {
    title: 'فسخ عقد إيجار',
    agency: 'وكالة عقارية',
    services: 'بيع - شراء - كراء - مبادلة - تسيير عقارات',
    address: 'العنوان', phone: 'الهاتف', email: 'البريد',
    docNo: 'مرجع العقد', issued: 'حرر بتاريخ',
    signerSec: 'أنا الموقع(ة) أسفله', fullName: 'الاسم واللقب :', capacity: 'بصفتي :',
    tenant: 'المستأجر', owner: 'المالك', tel: 'رقم الهاتف :', addr: 'العنوان :', idDoc: 'وثيقة الهوية :',
    declare: 'أصرح بأنني أرغب في فسخ عقد الإيجار الخاص بالمنزل المذكور أدناه :',
    propSec: 'المنزل المؤجر والعقد', property: 'المنزل :', location: 'الكائن بـ :', details: 'المواصفات :',
    concludedWith: 'والمبرم مع السيد(ة) :', startDate: 'بتاريخ :', endDate: 'تاريخ الانتهاء المقرر :',
    termDate: 'تاريخ الفسخ :', rent: 'مبلغ الإيجار :', datesSec: 'تواريخ العقد',
    reasonsSec: 'وذلك للأسباب التالية', closing: 'وعليه أطلب من طرفكم إتمام إجراءات فسخ عقد الإيجار وفقا للقوانين المعمول بها.',
    madeAt: 'حرر في :', date: 'التاريخ :',
    signTenant: 'توقيع المستأجر', signOwner: 'توقيع المالك', signAgency: 'ختم الوكالة',
    furnished: 'مفروش', unfurnished: 'غير مفروش', rooms: 'غرف', floor: 'الطابق',
    perMonth: '/ شهر', perNight: '/ ليلة',
  },
} as const;

/**
 * Printable termination letter (résiliation / فسخ عقد إيجار) in French or
 * Arabic, on the same blue charter and frame as the rental contract: agency
 * header, the requester (tenant or owner), the rented property and contract,
 * the reasons, place & date, and the three signature boxes — on one A4 page.
 */
export function buildTerminationHTML(
  data: AppData,
  r: Reservation,
  store: StoreInfo,
  lang: TerminationLang = 'ar',
): string {
  return withPrintLang(lang, () => {
    const T = TERMINATION_TEXT[lang];
    const esc = (v?: string) => escapeHtml(v ?? '');
    const box = (on: boolean) => `<i>${on ? '✓' : ''}</i>`;
    const row = (k: string, v: string, ltr = false) =>
      `<div class="tm-row"><span class="k">${k}</span><span class="tm-fill">${ltr ? `<bdi dir="ltr">${v}</bdi>` : v}</span></div>`;

    const client = clientById(data, r.clientId);
    const owner = ownerData(data, r.rooms[0]?.roomId);
    const tenantName = client ? `${client.firstName} ${client.lastName}` : '';
    const sep = lang === 'ar' ? '، ' : ', ';
    const byOwner = r.terminatedBy === 'owner';

    // The signer is the party requesting the termination; the contract was
    // concluded with the other party.
    const signer = byOwner
      ? {
          name: owner.name,
          phone: [owner.phone, owner.phone2].filter(Boolean).join(' / '),
          address: [owner.address, owner.city].filter(Boolean).join(sep),
          doc: owner.docNumber ? `${owner.docNumber} (${docTypeLabel(owner.docType)})` : '',
        }
      : {
          name: tenantName,
          phone: [client?.phone, client?.phone2].filter(Boolean).join(' / '),
          address: [client?.address, client?.city].filter(Boolean).join(sep),
          doc: client?.documentNumber ? `${client.documentNumber} (${docTypeLabel(client.documentType)})` : '',
        };
    const counterparty = byOwner ? tenantName : owner.name;

    const rooms = r.rooms.map((rr) => ({ rr, room: data.rooms.find((x) => x.id === rr.roomId) }));
    const propertyNames = rooms.map(({ room }) => room?.name).filter(Boolean).join(sep);
    const propertyPlace = [...new Set(rooms.map(({ room }) => room?.commune).filter(Boolean))].join(sep);
    const first = rooms[0]?.room;
    const floor = first ? data.floors.find((f) => f.id === first.floorId)?.name : '';
    const details = first
      ? [
          `${first.capacity} ${T.rooms}`,
          floor && `${T.floor} ${floor}`,
          first.furnished ? T.furnished : T.unfurnished,
        ].filter(Boolean).join(' · ')
      : '';
    const monthly = reservationPeriod(data, r) === 'month';
    const rent = r.rooms.reduce((s, rr) => s + rr.pricePerNight, 0);

    const reasons = (r.terminationReason ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const reasonLines = reasons.length >= 3 ? reasons : [...reasons, '', '', ''].slice(0, 3);

    return `
  <div class="doc compact tm-doc">
    ${docHeader(store, r.code, `${T.issued} ${numDate(r.terminationDate)}`, T.title)}

    <div class="grid2">
      <div class="party">
        <h3>${T.signerSec}</h3>
        ${row(T.fullName, esc(signer.name))}
        <div class="tm-check">
          <span class="k">${T.capacity}</span>
          <span class="tm-box">${box(!byOwner)} ${T.tenant}</span>
          <span class="tm-box">${box(byOwner)} ${T.owner}</span>
        </div>
        ${row(T.tel, esc(signer.phone), true)}
        ${row(T.idDoc, esc(signer.doc))}
        ${row(T.addr, esc(signer.address))}
      </div>
      <div class="party">
        <h3>${T.propSec}</h3>
        ${row(T.property, esc(propertyNames))}
        ${row(T.location, esc(propertyPlace))}
        ${row(T.details, esc(details))}
        ${row(T.rent, `${formatDA(rent)} ${monthly ? T.perMonth : T.perNight}`, true)}
        ${row(T.concludedWith, esc(counterparty))}
      </div>
    </div>

    <p class="tm-decl">${T.declare}</p>

    <div class="section green" style="margin-bottom:9px">
      <h3>📅 ${T.datesSec}</h3>
      <div class="tm-grid">
        ${row(T.startDate, numDate(r.checkIn), true)}
        ${row(T.endDate, numDate(r.checkOut), true)}
      </div>
      ${row(T.termDate, numDate(r.terminationDate), true)}
    </div>

    <div class="section blue" style="margin-bottom:9px">
      <h3>📝 ${T.reasonsSec}</h3>
      ${reasonLines.map((l) => `<div class="tm-line">${esc(l)}</div>`).join('')}
    </div>

    <p class="tm-closing">${T.closing}</p>

    <div class="tm-made">
      ${row(T.madeAt, esc(r.terminationPlace))}
      ${row(T.date, numDate(r.terminationDate), true)}
    </div>

    <div class="sign-grid">
      <div class="sign-box"><p class="who">${T.signTenant}</p><div class="line">${esc(tenantName) || '&nbsp;'}</div></div>
      <div class="sign-box stamp-cell">
        <p class="who">${T.signAgency}</p>
        ${eStamp(store)}
      </div>
      <div class="sign-box"><p class="who">${T.signOwner}</p><div class="line">${esc(owner.name) || '&nbsp;'}</div></div>
    </div>

    <div class="foot">${tr('Document généré par', 'وثيقة صادرة عن')} ${esc(store.name)}${store.phone ? ` — <span class="tel">${esc(store.phone)}</span>` : ''} — ${tr('Merci de votre confiance.', 'شكرا على ثقتكم.')}</div>
  </div>`;
  });
}
