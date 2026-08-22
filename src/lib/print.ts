import type { AppData } from '@/data/seed';
import type { Reservation, Sale, Purchase, Mediator, Payment, Client, StoreInfo } from '@/types';
import {
  reservationPaid, reservationRemaining, salePaid, saleRemaining,
  purchasePaid, purchaseRemaining, mediatorStats,
} from '@/store/selectors';
import { formatDA, formatDate } from './utils';
import { clientById, serviceName, mediatorName, reservationPeriod } from './lookups';
import {
  formatDZD, ZAKAT_RATE, NISAB_GOLD_GRAMS, type ZakatInputs, type ZakatResult,
} from './zakat';

/** Duration wording of a reservation: "3 nuit(s)" or "6 mois". */
function durationLabel(data: AppData, r: Reservation): string {
  const units = r.nights;
  return reservationPeriod(data, r) === 'month'
    ? `${units} mois`
    : `${units} nuit(s)`;
}

/** Header of the price column: "Prix/nuit" or "Prix/mois". */
function unitPriceHeader(data: AppData, r: Reservation): string {
  return reservationPeriod(data, r) === 'month' ? 'Prix/mois' : 'Prix/nuit';
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

  /* ── Centered header: logo on top-middle, then the agency identity ── */
  .head { text-align: center; border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 14px; }
  .logo-center { display: flex; justify-content: center; margin-bottom: 8px; }
  .logo-center img { max-width: 130px; max-height: 84px; object-fit: contain; }
  .logo-placeholder { width: 84px; height: 66px; background: linear-gradient(135deg,#0ea5e9,#0284c7); border-radius: 12px; display: grid; place-items: center; font-size: 30px; font-weight: 800; color: #fff; }
  .brand-info h1 { font-size: 20px; color: #0369a1; font-weight: 800; letter-spacing: .3px; }
  .brand-info p { font-size: 11px; color: #64748b; margin-top: 2px; }
  .brand-info .description { font-size: 11px; color: #475569; font-style: italic; margin-top: 3px; }
  .legal { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px 18px; font-size: 10.5px; color: #475569; margin-top: 5px; }
  .legal span { white-space: nowrap; }

  /* Phone numbers are always emphasised. */
  .tel, .phone, .brand-info .tel strong { font-weight: 800; color: #0f172a; }
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
  .cachet-circle { width: 128px; height: 128px; border-radius: 50%; border: 3px solid #0284c7; display: flex; align-items: center; justify-content: center; transform: rotate(-8deg); color: #0369a1; flex-shrink: 0; }
  .cachet-circle .inner { width: 110px; height: 110px; border: 1.5px dashed #0284c7; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 8px; overflow: hidden; }
  .cachet-circle .cc-top { font-size: 7px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 700; }
  .cachet-circle .cc-name { font-size: 11px; font-weight: 900; text-transform: uppercase; line-height: 1.15; margin: 3px 0; word-break: break-word; max-width: 100%; }
  .cachet-circle .cc-sub { font-size: 6.8px; text-transform: uppercase; letter-spacing: .8px; }
  .cachet-circle .cc-line { width: 60%; border-top: 1px solid #7dd3fc; margin: 3px 0; }
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

  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
    .doc { border-color: #0284c7; }
  }
`;

export function printHTML(title: string, bodyHtml: string) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_STYLES}</style></head><body>${bodyHtml}</body></html>`);
  doc.close();
  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 500);
  }, 350);
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
    <p class="tbl-head">✨ Services additionnels</p>
    <table>
      <thead><tr><th>Service</th><th class="right">Qté</th><th class="right">P.U.</th><th class="right">Total</th></tr></thead>
      <tbody>${r.services.map((sv) => `<tr>
        <td>${serviceName(data, sv.serviceId)}</td>
        <td class="right">${sv.quantity}</td>
        <td class="right">${formatDA(sv.unitPrice)}</td>
        <td class="right">${formatDA(sv.unitPrice * sv.quantity)}</td>
      </tr>`).join('')}</tbody>
    </table>` : '';

  return `
  <div class="doc">
    ${docHeader(store, r.code, `Créé le ${formatDate(r.createdAt)}`, 'Bon de Location')}

    <!-- Owner of the apartment + client -->
    <div class="grid2">
      ${ownerSection(data, mainRoomId)}
      ${clientSection(client, '👤 Client')}
    </div>

    <div class="section green" style="margin-bottom:14px">
      <h3>📅 Location</h3>
      <p><strong>Arrivée:</strong> ${formatDate(r.checkIn)} à ${r.checkInTime}</p>
      <p><strong>Départ:</strong> ${formatDate(r.checkOut)} à ${r.checkOutTime}</p>
      <p><strong>Durée:</strong> ${durationLabel(data, r)}</p>
    </div>

    <!-- Apartments -->
    <p class="tbl-head">🏠 Appartement(s)</p>
    <table>
      <thead><tr><th>Nom</th><th>Étage</th><th>Catégorie</th><th class="right">${unitPriceHeader(data, r)}</th><th class="right">Durée</th><th class="right">Sous-total</th></tr></thead>
      <tbody>${roomRows}</tbody>
    </table>

    ${serviceSection}
    ${agencyFeeBox(data, r)}
    ${paymentsTable(r.payments)}

    <!-- Totals -->
    <div class="totals-wrap">
      <div class="row"><span>Loyer</span><span>${formatDA(rentTotal)}</span></div>
      ${fee > 0 ? `<div class="row"><span>Frais d'agence</span><span class="badge-fee">${formatDA(fee)}</span></div>` : ''}
      <div class="row"><span>Total location</span><strong>${formatDA(r.total)}</strong></div>
      <div class="row"><span>Total payé</span><span class="badge-paid">${formatDA(paid)}</span></div>
      <div class="row grand"><span>Reste dû</span><span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></div>
    </div>

    <!-- Stamp -->
    <div class="stamp">
      <div style="font-size:11px;color:#64748b">
        <p>Le client reconnaît avoir pris connaissance des conditions de séjour.</p>
        <p style="margin-top:28px">Signature client : ____________________</p>
      </div>
      ${eStamp(store)}
    </div>

    <div class="foot">Document généré par ${store.name}${store.phone ? ` — <span class="tel">${store.phone}</span>` : ''} — Merci de votre confiance.</div>
  </div>`;
}

// ─── Shared building blocks for the new documents ───────────────────────────

/** Bold phone number, with an optional light label in front of it. */
function tel(number?: string, label = 'Tél :'): string {
  if (!number) return '';
  return `<p><span class="tel-label">${label}</span> <span class="tel">${number}</span></p>`;
}

/**
 * Header shared by every printed document: the logo sits centred at the very
 * top, the agency identity right under it, then a band carrying the document
 * kind, its number and its date.
 */
function docHeader(store: StoreInfo, code: string, dateLabel: string, docTitle: string): string {
  const logoHtml = store.logo
    ? `<img src="${store.logo}" alt="logo" />`
    : `<div class="logo-placeholder">${store.name.charAt(0)}</div>`;
  const legalItems = [
    store.nif && `<span><strong>NIF:</strong> ${store.nif}</span>`,
    store.nis && `<span><strong>NIS:</strong> ${store.nis}</span>`,
    store.rc && `<span><strong>RC:</strong> ${store.rc}</span>`,
    store.article && `<span><strong>Art:</strong> ${store.article}</span>`,
  ].filter(Boolean).join('');
  return `
    <div class="head">
      <div class="logo-center">${logoHtml}</div>
      <div class="brand-info">
        <h1>${store.name}</h1>
        ${store.description ? `<p class="description">${store.description}</p>` : ''}
        ${store.address ? `<p>${store.address}</p>` : ''}
        ${tel(store.phone)}
        ${store.email ? `<p>${store.email}</p>` : ''}
        <div class="legal">${legalItems}</div>
      </div>
      <div class="doc-band">
        <span class="kind">${docTitle}</span>
        <span class="code">N° ${code}</span>
        <span class="date">${dateLabel}</span>
      </div>
    </div>`;
}

/**
 * Round electronic stamp: the agency name inside a double circle. Long names
 * are typeset smaller so they always stay inside the disc.
 */
function eStamp(store: StoreInfo): string {
  const name = store.name ?? '';
  const size = name.length > 30 ? 8 : name.length > 20 ? 9.5 : 11;
  return `
    <div class="cachet-circle">
      <div class="inner">
        <div class="cc-top">Cachet</div>
        <div class="cc-line"></div>
        <div class="cc-name" style="font-size:${size}px">${name}</div>
        <div class="cc-line"></div>
        <div class="cc-sub">Signature électronique</div>
      </div>
    </div>`;
}

/** Owner block of an apartment (propriétaire du bien). */
function ownerSection(data: AppData, roomId: string | undefined, title = '🔑 Propriétaire du bien'): string {
  const room = roomId ? data.rooms.find((r) => r.id === roomId) : undefined;
  const linked = room?.ownerClientId ? clientById(data, room.ownerClientId) : undefined;
  const name = room?.ownerName || (linked ? `${linked.firstName} ${linked.lastName}` : '');
  const phone = room?.ownerPhone || linked?.phone || '';
  const address = [linked?.address, linked?.city].filter(Boolean).join(', ');
  if (!name && !phone) {
    return `<div class="section orange"><h3>${title}</h3><p>—</p></div>`;
  }
  return `
    <div class="section orange">
      <h3>${title}</h3>
      <p><strong>${name || '—'}</strong></p>
      ${tel(phone)}
      ${address ? `<p>${address}</p>` : ''}
      ${room ? `<p><span class="tel-label">Bien :</span> ${room.name}${room.commune ? ` — ${room.commune}` : ''}</p>` : ''}
    </div>`;
}

/** Owner party card used on the contract / versement (same data, party look). */
function ownerParty(data: AppData, roomId: string | undefined): string {
  const room = roomId ? data.rooms.find((r) => r.id === roomId) : undefined;
  const linked = room?.ownerClientId ? clientById(data, room.ownerClientId) : undefined;
  const name = room?.ownerName || (linked ? `${linked.firstName} ${linked.lastName}` : '');
  const phone = room?.ownerPhone || linked?.phone || '';
  const address = [linked?.address, linked?.city].filter(Boolean).join(', ');
  return `
    <div class="party">
      <h3>Le Propriétaire</h3>
      <p class="role">Propriétaire du bien</p>
      <p><strong>${name || '—'}</strong></p>
      ${tel(phone)}
      ${address ? `<p>${address}</p>` : ''}
      ${room ? `<p><span class="tel-label">Bien :</span> ${room.name}${room.commune ? ` — ${room.commune}` : ''}</p>` : ''}
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
    ? `<div class="fee-sub"><strong>Commission employé :</strong> ${worker.name} — ${r.agencyFeePercent ?? 0}% des frais, soit ${formatDA(commission)}</div>`
    : '';
  return `
    <div class="fee-box">
      <h3>💼 Frais d'agence</h3>
      <div class="fee-row">
        <span>Montant des frais d'agence (inclus dans le total)</span>
        <span class="fee-amount">${formatDA(fee)}</span>
      </div>
      ${sub}
    </div>`;
}

function clientSection(client: Client | undefined, title = '👤 Client'): string {
  return `
    <div class="section blue">
      <h3>${title}</h3>
      <p><strong>${client ? `${client.firstName} ${client.lastName}` : '—'}</strong></p>
      ${client?.sexe ? `<p>${client.sexe === 'M' ? 'Masculin' : 'Féminin'}${client.profession ? ` · ${client.profession}` : ''}</p>` : ''}
      ${tel(client?.phone ? `${client.phone}${client.phone2 ? ` / ${client.phone2}` : ''}` : '')}
      ${client?.email ? `<p>${client.email}</p>` : ''}
      ${client?.city || client?.address ? `<p>${[client?.address, client?.city].filter(Boolean).join(', ')}</p>` : ''}
      ${client?.documentType ? `<p>Pièce: ${client.documentNumber ?? '—'} (${client.documentType})</p>` : ''}
    </div>`;
}

function apartmentSection(data: AppData, roomId: string, title = '🏠 Appartement'): string {
  const room = data.rooms.find((r) => r.id === roomId);
  if (!room) return `<div class="section violet"><h3>${title}</h3><p>—</p></div>`;
  const floor = data.floors.find((f) => f.id === room.floorId)?.name;
  const lines = [
    `<p><strong>${room.name}</strong></p>`,
    room.commune && `<p><strong>Commune:</strong> ${room.commune}</p>`,
    `<p><strong>Ameublement:</strong> ${room.furnished ? 'Meublé' : 'Non meublé'}</p>`,
    room.furnished && room.furnitureDescription && `<p><strong>Meubles:</strong> ${room.furnitureDescription}</p>`,
    floor && `<p><strong>Étage:</strong> ${floor}</p>`,
    `<p><strong>Chambres:</strong> ${room.capacity}</p>`,
    room.description && `<p><strong>Description:</strong> ${room.description}</p>`,
  ].filter(Boolean).join('');
  return `<div class="section violet"><h3>${title}</h3>${lines}</div>`;
}

function paymentsTable(payments: Payment[]): string {
  if (payments.length === 0) return '';
  return `
    <p class="tbl-head">💳 Historique des paiements</p>
    <table>
      <thead><tr><th>Date</th><th>Note</th><th class="right">Montant</th></tr></thead>
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
        <p>Document établi en deux exemplaires.</p>
        <p style="margin-top:28px">Signature ${signerLabel} : ____________________</p>
      </div>
      ${eStamp(store)}
    </div>
    <div class="foot">Document généré par ${store.name}${store.phone ? ` — <span class="tel">${store.phone}</span>` : ''} — Merci de votre confiance.</div>`;
}

// ─── Facture de vente ────────────────────────────────────────────────────────

export function buildSaleInvoiceHTML(data: AppData, sale: Sale, store: StoreInfo): string {
  const client = clientById(data, sale.clientId);
  const paid = salePaid(sale);
  const remaining = saleRemaining(sale);
  const mediator = sale.mediatorId ? data.mediators.find((m) => m.id === sale.mediatorId) : undefined;

  const saleDetails = `
    <div class="section green">
      <h3>📅 Détails de la vente</h3>
      <p><strong>Date:</strong> ${formatDate(sale.date)} à ${sale.time}</p>
      <p><strong>Statut:</strong> ${sale.status === 'paid' ? '<span class="badge-paid">Payée</span>' : '<span class="badge-debt">Dette</span>'}</p>
      ${sale.notes ? `<p><strong>Remarque:</strong> ${sale.notes}</p>` : ''}
    </div>`;

  const mediatorSection = mediator ? `
    <div class="section orange">
      <h3>🤝 Médiateur</h3>
      <p><strong>${mediator.firstName} ${mediator.lastName}</strong></p>
      ${tel(mediator.phone)}
      <p><strong>Commission:</strong> ${formatDA(sale.mediatorCommission)}${sale.commissionType === 'percent' && sale.commissionPercent ? ` (${sale.commissionPercent}% du prix de vente)` : ''}</p>
    </div>` : '';

  return `
  <div class="doc">
    ${docHeader(store, sale.code, `Vente du ${formatDate(sale.date)} à ${sale.time}`, 'Facture de Vente')}
    <div class="grid2">
      ${clientSection(client, '👤 Acheteur')}
      ${apartmentSection(data, sale.roomId, '🏠 Appartement vendu')}
    </div>
    ${mediatorSection
      ? `<div class="grid2">${mediatorSection}${saleDetails}</div>`
      : `<div style="margin-bottom:16px">${saleDetails}</div>`}
    ${paymentsTable(sale.payments)}
    <div class="totals-wrap">
      <div class="row"><span>Prix de vente</span><strong>${formatDA(sale.price)}</strong></div>
      <div class="row"><span>Total payé</span><span class="badge-paid">${formatDA(paid)}</span></div>
      <div class="row"><span>Reste dû</span><span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></div>
      <div class="row grand"><span>Net à payer</span><span>${formatDA(sale.price)}</span></div>
    </div>
    ${stampSection(store, 'acheteur')}
  </div>`;
}

// ─── Bon d'achat ─────────────────────────────────────────────────────────────

export function buildPurchaseInvoiceHTML(data: AppData, purchase: Purchase, store: StoreInfo): string {
  const client = clientById(data, purchase.clientId);
  const paid = purchasePaid(purchase);
  const remaining = purchaseRemaining(purchase);

  return `
  <div class="doc">
    ${docHeader(store, purchase.code, `Achat du ${formatDate(purchase.date)} à ${purchase.time}`, "Bon d'Achat")}
    <div class="grid2">
      ${clientSection(client, '👤 Vendeur')}
      ${apartmentSection(data, purchase.roomId, '🏠 Appartement acquis')}
    </div>
    <div class="section green" style="margin-bottom:16px">
      <h3>📅 Détails de l'achat</h3>
      <p><strong>Date:</strong> ${formatDate(purchase.date)} à ${purchase.time}</p>
      <p><strong>Prix d'achat:</strong> ${formatDA(purchase.purchasePrice)}</p>
      <p><strong>Prix de revente prévu:</strong> ${formatDA(purchase.salePrice)}</p>
      <p><strong>Statut:</strong> ${purchase.status === 'paid' ? '<span class="badge-paid">Payé</span>' : '<span class="badge-debt">Dette</span>'}</p>
      ${purchase.notes ? `<p><strong>Remarque:</strong> ${purchase.notes}</p>` : ''}
    </div>
    ${paymentsTable(purchase.payments)}
    <div class="totals-wrap">
      <div class="row"><span>Prix d'achat</span><strong>${formatDA(purchase.purchasePrice)}</strong></div>
      <div class="row"><span>Payé par l'agence</span><span class="badge-paid">${formatDA(paid)}</span></div>
      <div class="row"><span>Reste à payer</span><span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></div>
      <div class="row grand"><span>Total achat</span><span>${formatDA(purchase.purchasePrice)}</span></div>
    </div>
    ${stampSection(store, 'vendeur')}
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
  <div class="doc">
    ${docHeader(store, code, `Paiement du ${formatDate(payment.date)}`, title)}
    <div class="section green" style="margin-bottom:16px;text-align:center;padding:18px">
      <h3>💰 Montant du paiement</h3>
      <p style="font-size:26px;font-weight:900;color:#059669;margin-top:4px">${formatDA(payment.amount)}</p>
      ${payment.note ? `<p style="margin-top:6px;color:#475569">${payment.note}</p>` : ''}
    </div>
    ${infoSections}
    <div class="totals-wrap">
      ${totals.map((t) => `<div class="row"><span>${t.label}</span><span class="${t.cls ?? ''}">${t.value}</span></div>`).join('')}
    </div>
    ${stampSection(store, 'client')}
  </div>`;
}

export function buildSalePaymentReceiptHTML(
  data: AppData, sale: Sale, payment: Payment, store: StoreInfo,
): string {
  const client = clientById(data, sale.clientId);
  const infos = `
    <div class="grid2">
      ${clientSection(client, '👤 Acheteur')}
      ${apartmentSection(data, sale.roomId, '🏠 Appartement vendu')}
    </div>
    <div class="section orange" style="margin-bottom:16px">
      <h3>📋 Vente ${sale.code}</h3>
      <p><strong>Date de vente:</strong> ${formatDate(sale.date)} à ${sale.time}</p>
      <p><strong>Prix de vente:</strong> ${formatDA(sale.price)}</p>
      ${sale.mediatorId ? `<p><strong>Médiateur:</strong> ${mediatorName(data, sale.mediatorId)}</p>` : ''}
    </div>
    ${paymentsTable(sale.payments)}`;
  return receiptShell(store, sale.code, 'Reçu de Paiement — Vente', payment, infos, [
    { label: 'Prix de vente', value: formatDA(sale.price) },
    { label: 'Total payé', value: formatDA(salePaid(sale)), cls: 'badge-paid' },
    { label: 'Reste dû', value: formatDA(saleRemaining(sale)), cls: saleRemaining(sale) > 0 ? 'badge-debt' : 'badge-paid' },
  ]);
}

export function buildPurchasePaymentReceiptHTML(
  data: AppData, purchase: Purchase, payment: Payment, store: StoreInfo,
): string {
  const client = clientById(data, purchase.clientId);
  const infos = `
    <div class="grid2">
      ${clientSection(client, '👤 Vendeur')}
      ${apartmentSection(data, purchase.roomId, '🏠 Appartement acquis')}
    </div>
    <div class="section orange" style="margin-bottom:16px">
      <h3>📋 Achat ${purchase.code}</h3>
      <p><strong>Date d'achat:</strong> ${formatDate(purchase.date)} à ${purchase.time}</p>
      <p><strong>Prix d'achat:</strong> ${formatDA(purchase.purchasePrice)}</p>
      <p><strong>Prix de revente prévu:</strong> ${formatDA(purchase.salePrice)}</p>
    </div>
    ${paymentsTable(purchase.payments)}`;
  return receiptShell(store, purchase.code, 'Reçu de Paiement — Achat', payment, infos, [
    { label: "Prix d'achat", value: formatDA(purchase.purchasePrice) },
    { label: "Payé par l'agence", value: formatDA(purchasePaid(purchase)), cls: 'badge-paid' },
    { label: 'Reste à payer', value: formatDA(purchaseRemaining(purchase)), cls: purchaseRemaining(purchase) > 0 ? 'badge-debt' : 'badge-paid' },
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
      <h3>📋 Location ${r.code}</h3>
      <p><strong>Appartement(s):</strong> ${roomsList || '—'}</p>
      <p><strong>Arrivée:</strong> ${formatDate(r.checkIn)} à ${r.checkInTime}</p>
      <p><strong>Départ:</strong> ${formatDate(r.checkOut)} à ${r.checkOutTime}</p>
      <p><strong>Durée:</strong> ${durationLabel(data, r)}</p>
    </div>
    ${agencyFeeBox(data, r)}
    ${paymentsTable(r.payments)}`;
  return receiptShell(store, r.code, 'Reçu de Paiement — Location', payment, infos, [
    ...(fee > 0 ? [{ label: "Dont frais d'agence", value: formatDA(fee), cls: 'badge-fee' }] : []),
    { label: 'Total location', value: formatDA(r.total) },
    { label: 'Total payé', value: formatDA(reservationPaid(r)), cls: 'badge-paid' },
    { label: 'Reste dû', value: formatDA(reservationRemaining(r)), cls: reservationRemaining(r) > 0 ? 'badge-debt' : 'badge-paid' },
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
        <h3>🤝 Médiateur</h3>
        <p><strong>${mediator.firstName} ${mediator.lastName}</strong></p>
        ${tel(`${mediator.phone}${mediator.phone2 ? ` / ${mediator.phone2}` : ''}`)}
        ${mediator.email ? `<p>${mediator.email}</p>` : ''}
        ${mediator.city || mediator.address ? `<p>${[mediator.address, mediator.city].filter(Boolean).join(', ')}</p>` : ''}
        ${mediator.cin ? `<p>CIN: ${mediator.cin}</p>` : ''}
      </div>
      <div class="section violet">
        <h3>📊 Situation des commissions</h3>
        <p><strong>Ventes réalisées:</strong> ${stats.salesCount}</p>
        <p><strong>Commissions gagnées:</strong> ${formatDA(stats.commissionEarned)}</p>
        <p><strong>Déjà payé:</strong> ${formatDA(stats.paid)}</p>
        <p><strong>Reste dû:</strong> ${formatDA(stats.remaining)}</p>
      </div>
    </div>
    ${salesRows ? `
      <p class="tbl-head">🏠 Ventes avec ce médiateur</p>
      <table>
        <thead><tr><th>Code</th><th>Appartement</th><th>Date</th><th class="right">Prix vente</th><th class="right">Commission</th></tr></thead>
        <tbody>${salesRows}</tbody>
      </table>` : ''}
    ${paymentsTable(mediator.payments)}`;
  return receiptShell(store, `MED-${mediator.id.slice(0, 6).toUpperCase()}`, 'Reçu de Commission — Médiateur', payment, infos, [
    { label: 'Commissions gagnées', value: formatDA(stats.commissionEarned) },
    { label: 'Total payé', value: formatDA(stats.paid), cls: 'badge-paid' },
    { label: 'Reste dû', value: formatDA(stats.remaining), cls: stats.remaining > 0 ? 'badge-debt' : 'badge-paid' },
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
  <div class="doc">
    ${docHeader(store, `ZAK-${year}`, `Exercice du 01/01/${year} au 31/12/${year}`, 'Calcul de la Zakat')}

    <div class="doc-title-band">
      <h2>Zakat des Biens Commerciaux</h2>
      <div class="sub">Exercice ${year} — 1 janvier au 31 décembre · Taux ${(ZAKAT_RATE * 100).toFixed(1)} %</div>
    </div>

    <p class="tbl-head">💰 Actifs zakatables</p>
    <table>
      <thead><tr><th>Poste</th><th class="right">Montant</th></tr></thead>
      <tbody>
        ${row('Liquidités en banque', formatDZD(inputs.bankCash))}
        ${row('Liquidités en caisse', formatDZD(inputs.cashOnHand))}
        ${row('Commissions à encaisser', formatDZD(inputs.receivableCommissions))}
        ${row("Biens immobiliers destinés à la revente", formatDZD(inputs.propertiesForSale))}
        ${row('Autres marchandises', formatDZD(inputs.tradeInventory))}
        ${row('Autres actifs zakatables', formatDZD(inputs.otherAssets))}
        <tr><td><strong>Total des actifs</strong></td><td class="right"><strong>${formatDZD(result.totalAssets)}</strong></td></tr>
      </tbody>
    </table>

    <p class="tbl-head">📉 Dettes exigibles</p>
    <table>
      <thead><tr><th>Poste</th><th class="right">Montant</th></tr></thead>
      <tbody>
        ${row('Dettes à court terme', formatDZD(result.totalLiabilities), 'badge-debt')}
      </tbody>
    </table>

    <p class="tbl-head">🧮 Étapes du calcul</p>
    <table>
      <thead><tr><th>Étape</th><th class="right">Valeur</th></tr></thead>
      <tbody>
        ${row('Total des actifs', formatDZD(result.totalAssets))}
        ${row('− Dettes exigibles', formatDZD(result.totalLiabilities))}
        ${row('= Assiette zakatable nette', formatDZD(result.netWealth))}
        ${row(
          `Nisab (${NISAB_GOLD_GRAMS} g d'or${result.nisabFromGold ? ` × ${formatDZD(inputs.goldPricePerGram)}/g` : ''})`,
          formatDZD(result.nisab),
        )}
        ${row('Nisab atteint ?', result.isDue ? 'Oui — Zakat obligatoire' : 'Non — Zakat non due')}
        ${row('Taux appliqué', result.isDue ? `${(ZAKAT_RATE * 100).toFixed(1)} %` : '—')}
      </tbody>
    </table>

    <div class="amount-hero">
      <div class="lbl">Montant de la Zakat à verser</div>
      <div class="val">${formatDZD(result.zakat)}</div>
      <div class="words">${
        result.isDue
          ? `Soit ${formatDZD(result.netWealth)} × 2,5 %.`
          : "L'assiette zakatable n'atteint pas le nisab : aucune Zakat n'est due."
      }</div>
    </div>

    ${stampSection(store, 'responsable')}
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
    : 'Toutes les catégories';

  const expenseRows = expenses.length
    ? expenses.map((e) => `<tr>
        <td>${formatDate(e.date)}</td>
        <td>${e.name}</td>
        <td>${data.expenseCategories.find((c) => c.id === e.categoryId)?.name ?? '—'}</td>
        <td>${e.description ?? ''}</td>
        <td class="right badge-debt">${formatDA(e.amount)}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#94a3b8">Aucune dépense sur la période</td></tr>';

  const maintRows = maintenances.length
    ? maintenances.map((m) => `<tr>
        <td>${formatDate(m.date)}</td>
        <td>${data.rooms.find((r) => r.id === m.roomId)?.name ?? '—'}</td>
        <td>${m.name}</td>
        <td>${m.description ?? ''}</td>
        <td class="right badge-debt">${formatDA(m.cost)}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#94a3b8">Aucune maintenance sur la période</td></tr>';

  const categoryRows = byCategory
    .map((c) => `<tr><td>${c.name}</td><td class="right">${formatDA(c.total)}</td></tr>`)
    .join('');

  return `
  <div class="doc">
    ${docHeader(store, `DEP-${from}_${to}`, `Période du ${formatDate(from)} au ${formatDate(to)}`, 'Rapport des Dépenses')}

    <div class="doc-title-band">
      <h2>Rapport des Dépenses</h2>
      <div class="sub">${formatDate(from)} → ${formatDate(to)} · ${categoryName}</div>
    </div>

    <p class="tbl-head">🧾 Dépenses générales</p>
    <table>
      <thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Description</th><th class="right">Montant</th></tr></thead>
      <tbody>${expenseRows}</tbody>
    </table>

    ${categoryRows ? `
      <p class="tbl-head">📊 Répartition par catégorie</p>
      <table>
        <thead><tr><th>Catégorie</th><th class="right">Total</th></tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>` : ''}

    <p class="tbl-head">🔧 Maintenances</p>
    <table>
      <thead><tr><th>Date</th><th>Appartement</th><th>Intervention</th><th>Description</th><th class="right">Coût</th></tr></thead>
      <tbody>${maintRows}</tbody>
    </table>

    <div class="totals-wrap">
      <div class="row"><span>Dépenses générales</span><span class="badge-debt">${formatDA(expensesTotal)}</span></div>
      <div class="row"><span>Maintenances</span><span class="badge-debt">${formatDA(maintTotal)}</span></div>
      <div class="row grand"><span>Total des charges</span><span>${formatDA(expensesTotal + maintTotal)}</span></div>
    </div>

    ${stampSection(store, 'responsable')}
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
  <div class="doc">
    ${docHeader(store, r.code, `Établi le ${formatDate(r.createdAt)}`, 'Contrat de Location')}

    <div class="doc-title-band">
      <h2>Contrat de Location</h2>
      <div class="sub">N° ${r.code} — établi le ${formatDate(r.createdAt)}</div>
    </div>

    <!-- Parties: the agency (mandataire), the owner of the apartment, the tenant -->
    <div class="parties" style="grid-template-columns:1fr 1fr 1fr">
      <div class="party">
        <h3>Le Bailleur / Mandataire</h3>
        <p class="role">Agence</p>
        <p><strong>${store.name}</strong></p>
        ${store.address ? `<p>${store.address}</p>` : ''}
        ${tel(store.phone)}
        ${store.email ? `<p>${store.email}</p>` : ''}
        ${store.rc ? `<p>RC : ${store.rc}${store.nif ? ` · NIF : ${store.nif}` : ''}</p>` : ''}
      </div>
      ${ownerParty(data, mainRoomId)}
      <div class="party">
        <h3>Le Locataire</h3>
        <p class="role">Client</p>
        <p><strong>${client ? `${client.firstName} ${client.lastName}` : '—'}</strong></p>
        ${tel(client?.phone ? `${client.phone}${client.phone2 ? ` / ${client.phone2}` : ''}` : '')}
        ${client?.address || client?.city ? `<p>${[client?.address, client?.city].filter(Boolean).join(', ')}</p>` : ''}
        ${client?.documentType ? `<p>Pièce : ${client.documentNumber ?? '—'} (${client.documentType})</p>` : ''}
      </div>
    </div>

    <p class="tbl-head">🏠 Bien(s) loué(s)</p>
    <table>
      <thead><tr><th>Appartement</th><th>Localisation</th><th>Étage</th><th class="right">${unitPriceHeader(data, r)}</th><th class="right">Durée</th><th class="right">Sous-total</th></tr></thead>
      <tbody>${roomRows}</tbody>
    </table>

    <div class="grid2">
      <div class="section green">
        <h3>📅 Durée de la location</h3>
        <p><strong>Arrivée :</strong> ${formatDate(r.checkIn)} à ${r.checkInTime}</p>
        <p><strong>Départ :</strong> ${formatDate(r.checkOut)} à ${r.checkOutTime}</p>
        <p><strong>Durée :</strong> ${durationLabel(data, r)}</p>
      </div>
      <div class="section blue">
        <h3>💰 Conditions financières</h3>
        <p><strong>Loyer :</strong> ${formatDA(rentTotal)}</p>
        ${fee > 0 ? `<p><strong>Frais d'agence :</strong> <span class="badge-fee">${formatDA(fee)}</span></p>` : ''}
        <p><strong>Total à payer :</strong> ${formatDA(r.total)}</p>
        <p><strong>Déjà versé :</strong> ${formatDA(paid)}</p>
        <p><strong>Reste dû :</strong> <span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></p>
      </div>
    </div>

    ${agencyFeeBox(data, r)}

    <div class="clauses">
      <h4>Conditions générales</h4>
      <ol>
        <li>La présente location est consentie pour la période du ${formatDate(r.checkIn)} au ${formatDate(r.checkOut)}, soit ${durationLabel(data, r)}.</li>
        <li>Le montant total de la location s'élève à ${formatDA(r.total)}${fee > 0 ? `, dont ${formatDA(fee)} de frais d'agence` : ''}, payable selon l'échéancier convenu entre les parties.</li>
        ${fee > 0 ? `<li>Les frais d'agence de ${formatDA(fee)} rémunèrent l'intermédiation de l'agence et restent acquis à celle-ci.</li>` : ''}
        <li>Le locataire s'engage à occuper le bien loué paisiblement et à le restituer dans l'état où il l'a reçu.</li>
        <li>Toute prolongation au-delà de la date de départ pourra donner lieu à une facturation supplémentaire au tarif en vigueur.</li>
        <li>Le locataire demeure responsable de toute dégradation causée au bien pendant la durée de la location.</li>
        <li>Le présent contrat est établi en deux exemplaires originaux, un pour chaque partie.</li>
      </ol>
    </div>

    ${paymentsTable(r.payments)}

    <div class="sign-grid">
      <div class="sign-box"><p class="who">Le Locataire</p><div class="line">${client ? `${client.firstName} ${client.lastName}` : 'Signature'}</div></div>
      <div class="sign-box stamp-cell">
        <p class="who">Cachet de l'agence</p>
        ${eStamp(store)}
      </div>
      <div class="sign-box"><p class="who">Le Bailleur</p><div class="line">${store.name}</div></div>
    </div>

    <div class="foot">Document généré par ${store.name}${store.phone ? ` — <span class="tel">${store.phone}</span>` : ''} — Merci de votre confiance.</div>
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
  <div class="doc">
    ${docHeader(store, r.code, `Établi le ${formatDate(issueDate)}`, 'Bon de Versement')}

    <div class="doc-title-band">
      <h2>Bon de Versement</h2>
      <div class="sub">N° ${r.code} — ${formatDate(issueDate)}</div>
    </div>

    <div class="amount-hero">
      <div class="lbl">Montant total versé</div>
      <div class="val">${formatDA(paid)}</div>
      <div class="words">Reçu de ${client ? `${client.firstName} ${client.lastName}` : 'la part du client'} la somme ci-dessus.</div>
    </div>

    <!-- Owner of the apartment + client who paid -->
    <div class="grid2">
      ${ownerSection(data, mainRoomId)}
      ${clientSection(client, '👤 Versé par (Client)')}
    </div>

    <div class="grid2">
      <div class="section violet">
        <h3>📋 Location ${r.code}</h3>
        <p><strong>Appartement(s) :</strong> ${roomsList || '—'}</p>
        <p><strong>Séjour :</strong> ${formatDate(r.checkIn)} → ${formatDate(r.checkOut)}</p>
        <p><strong>Durée :</strong> ${durationLabel(data, r)}</p>
      </div>
      <div class="section green">
        <h3>💰 Détail du montant</h3>
        <p><strong>Loyer :</strong> ${formatDA(rentTotal)}</p>
        ${fee > 0 ? `<p><strong>Frais d'agence :</strong> <span class="badge-fee">${formatDA(fee)}</span></p>` : ''}
        <p><strong>Total location :</strong> ${formatDA(r.total)}</p>
      </div>
    </div>

    ${agencyFeeBox(data, r)}

    ${paymentsTable(r.payments)}

    <div class="totals-wrap">
      <div class="row"><span>Loyer</span><span>${formatDA(rentTotal)}</span></div>
      ${fee > 0 ? `<div class="row"><span>Frais d'agence</span><span class="badge-fee">${formatDA(fee)}</span></div>` : ''}
      <div class="row"><span>Total location</span><strong>${formatDA(r.total)}</strong></div>
      <div class="row"><span>Total versé</span><span class="badge-paid">${formatDA(paid)}</span></div>
      <div class="row grand"><span>Reste dû</span><span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></div>
    </div>

    ${stampSection(store, 'client')}
  </div>`;
}
