import type { AppData } from '@/data/seed';
import type { Reservation, Sale, Purchase, Mediator, Payment, Client, StoreInfo } from '@/types';
import {
  reservationPaid, reservationRemaining, salePaid, saleRemaining,
  purchasePaid, purchaseRemaining, mediatorStats,
} from '@/store/selectors';
import { formatDA, formatDate, nightsBetween } from './utils';
import { clientById, serviceName, mediatorName } from './lookups';

export const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 28px; background: #fff; font-size: 12.5px; }
  .doc { max-width: 820px; margin: 0 auto; }

  /* ── Header ── */
  .head { display: grid; grid-template-columns: auto 1fr auto; align-items: start; gap: 18px; border-bottom: 3px solid #0284c7; padding-bottom: 16px; margin-bottom: 18px; }
  .logo-wrap { width: 80px; }
  .logo-wrap img { width: 80px; height: auto; object-fit: contain; border-radius: 8px; }
  .logo-placeholder { width: 80px; height: 60px; background: linear-gradient(135deg,#0ea5e9,#0284c7); border-radius: 10px; display:grid; place-items:center; font-size: 28px; font-weight: 800; color:#fff; }
  .brand-info h1 { font-size: 18px; color: #0369a1; font-weight: 800; }
  .brand-info p { font-size: 11px; color: #64748b; margin-top: 2px; }
  .brand-info .description { font-size: 11px; color: #475569; font-style: italic; margin-top: 3px; }
  .res-meta { text-align: right; }
  .res-meta .code { font-size: 20px; font-weight: 900; color: #0369a1; }
  .res-meta .date { font-size: 11px; color: #64748b; margin-top: 2px; }
  .legal { display: flex; gap: 24px; font-size: 10.5px; color: #475569; margin-top: 4px; }
  .legal span { white-space: nowrap; }

  /* ── Section boxes ── */
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
  .section { border: 2px solid; border-radius: 10px; padding: 12px 14px; }
  .section.blue { border-color: #bae6fd; }
  .section.green { border-color: #bbf7d0; }
  .section.violet { border-color: #ddd6fe; }
  .section.orange { border-color: #fed7aa; }
  .section h3 { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 7px; font-weight: 700; }
  .section.blue h3 { color: #0284c7; }
  .section.green h3 { color: #059669; }
  .section.violet h3 { color: #7c3aed; }
  .section.orange h3 { color: #d97706; }
  .section p { margin: 2px 0; line-height: 1.5; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px; }
  th { background: #f0f9ff; text-align: left; padding: 8px 10px; font-size: 10.5px; text-transform: uppercase; color: #0369a1; letter-spacing: .4px; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  .right { text-align: right; }
  .tbl-head { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin: 12px 0 6px; color: #475569; }

  /* ── Totals ── */
  .totals-wrap { margin-left: auto; width: 300px; border: 2px solid #bae6fd; border-radius: 10px; padding: 12px 16px; }
  .totals-wrap .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals-wrap .grand { border-top: 2px solid #0284c7; margin-top: 6px; padding-top: 8px; font-size: 15px; font-weight: 800; color: #0369a1; }
  .badge-paid { color: #059669; font-weight: 700; }
  .badge-debt { color: #dc2626; font-weight: 700; }

  /* ── Stamp ── */
  .stamp { margin-top: 26px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  .cachet { border: 2px dashed #0284c7; color: #0369a1; border-radius: 12px; padding: 12px 20px; transform: rotate(-5deg); text-align: center; font-weight: 700; font-size: 12px; }
  .cachet small { display: block; font-weight: 400; font-size: 10px; margin-top: 4px; }
  .foot { margin-top: 24px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }

  /* ── Contract-specific ── */
  .doc-title-band { text-align: center; margin: 6px 0 18px; }
  .doc-title-band h2 { font-size: 20px; font-weight: 900; color: #0369a1; letter-spacing: .5px; text-transform: uppercase; }
  .doc-title-band .sub { font-size: 11px; color: #64748b; margin-top: 3px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
  .party { border: 2px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; }
  .party h3 { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 7px; font-weight: 800; color: #0369a1; }
  .party p { margin: 2px 0; line-height: 1.5; }
  .party .role { font-size: 9.5px; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }
  .clauses { margin: 4px 0 8px; }
  .clauses h4 { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #475569; margin: 14px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
  .clauses ol { padding-left: 18px; }
  .clauses li { font-size: 11px; color: #334155; line-height: 1.55; margin-bottom: 5px; }
  .amount-hero { text-align: center; border: 2px solid #bbf7d0; background: #f0fdf4; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
  .amount-hero .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .8px; color: #059669; font-weight: 800; }
  .amount-hero .val { font-size: 30px; font-weight: 900; color: #059669; margin-top: 4px; }
  .amount-hero .words { font-size: 11px; color: #475569; margin-top: 4px; font-style: italic; }
  .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 34px; }
  .sign-box { text-align: center; }
  .sign-box .who { font-size: 10.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .5px; }
  .sign-box .line { margin-top: 42px; border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 10px; color: #94a3b8; }

  @media print { body { padding: 0; } .no-print { display: none !important; } }
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
  const nights = nightsBetween(r.checkIn, r.checkOut);
  const paid = reservationPaid(r);
  const remaining = reservationRemaining(r);

  const logoHtml = store.logo
    ? `<img src="${store.logo}" alt="logo" />`
    : `<div class="logo-placeholder">${store.name.charAt(0)}</div>`;

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

  const paymentSection = r.payments.length > 0 ? `
    <p class="tbl-head">💳 Paiements</p>
    <table>
      <thead><tr><th>Date</th><th>Note</th><th class="right">Montant</th></tr></thead>
      <tbody>${r.payments.map((p) => `<tr>
        <td>${formatDate(p.date)}</td>
        <td>${p.note ?? '—'}</td>
        <td class="right badge-paid">${formatDA(p.amount)}</td>
      </tr>`).join('')}</tbody>
    </table>` : '';

  const legalItems = [
    store.nif && `<span><strong>NIF:</strong> ${store.nif}</span>`,
    store.nis && `<span><strong>NIS:</strong> ${store.nis}</span>`,
    store.rc && `<span><strong>RC:</strong> ${store.rc}</span>`,
    store.article && `<span><strong>Art:</strong> ${store.article}</span>`,
  ].filter(Boolean).join('');

  return `
  <div class="doc">
    <!-- Header -->
    <div class="head">
      <div class="logo-wrap">${logoHtml}</div>
      <div class="brand-info">
        <h1>${store.name}</h1>
        ${store.description ? `<p class="description">${store.description}</p>` : ''}
        <p>${store.address}</p>
        <p>${store.phone}${store.email ? ` · ${store.email}` : ''}</p>
        <div class="legal">${legalItems}</div>
      </div>
      <div class="res-meta">
        <div class="code">N° ${r.code}</div>
        <div class="date">Créé le ${formatDate(r.createdAt)}</div>
      </div>
    </div>

    <!-- Client + Dates -->
    <div class="grid2">
      <div class="section blue">
        <h3>👤 Client</h3>
        <p><strong>${client ? `${client.firstName} ${client.lastName}` : '—'}</strong></p>
        ${client?.sexe ? `<p>${client.sexe === 'M' ? 'Masculin' : 'Féminin'}${client.profession ? ` · ${client.profession}` : ''}</p>` : ''}
        <p>${client?.phone ?? ''}${client?.phone2 ? ` / ${client.phone2}` : ''}</p>
        ${client?.email ? `<p>${client.email}</p>` : ''}
        ${client?.city ? `<p>${client.city}${client.address ? `, ${client.address}` : ''}</p>` : ''}
        ${client?.documentType ? `<p>Pièce: ${client.documentNumber ?? '—'} (${client.documentType})</p>` : ''}
      </div>
      <div class="section green">
        <h3>📅 Location</h3>
        <p><strong>Arrivée:</strong> ${formatDate(r.checkIn)} à ${r.checkInTime}</p>
        <p><strong>Départ:</strong> ${formatDate(r.checkOut)} à ${r.checkOutTime}</p>
        <p><strong>Durée:</strong> ${nights} nuit(s)</p>
      </div>
    </div>

    <!-- Apartments -->
    <p class="tbl-head">🏠 Appartement(s)</p>
    <table>
      <thead><tr><th>Nom</th><th>Étage</th><th>Catégorie</th><th class="right">Prix/nuit</th><th class="right">Nuits</th><th class="right">Sous-total</th></tr></thead>
      <tbody>${roomRows}</tbody>
    </table>

    ${serviceSection}
    ${paymentSection}

    <!-- Totals -->
    <div class="totals-wrap">
      <div class="row"><span>Total location</span><strong>${formatDA(r.total)}</strong></div>
      <div class="row"><span>Total payé</span><span class="badge-paid">${formatDA(paid)}</span></div>
      <div class="row"><span>Reste dû</span><span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></div>
      <div class="row grand"><span>Net à payer</span><span>${formatDA(r.total)}</span></div>
    </div>

    <!-- Stamp -->
    <div class="stamp">
      <div style="font-size:11px;color:#64748b">
        <p>Le client reconnaît avoir pris connaissance des conditions de séjour.</p>
        <p style="margin-top:28px">Signature client : ____________________</p>
      </div>
      <div class="cachet">${store.name}<small>Cachet &amp; Signature</small></div>
    </div>

    <div class="foot">Document généré par ${store.name}${store.phone ? ` — ${store.phone}` : ''} — Merci de votre confiance.</div>
  </div>`;
}

// ─── Shared building blocks for the new documents ───────────────────────────

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
      <div class="logo-wrap">${logoHtml}</div>
      <div class="brand-info">
        <h1>${store.name}</h1>
        ${store.description ? `<p class="description">${store.description}</p>` : ''}
        <p>${store.address}</p>
        <p>${store.phone}${store.email ? ` · ${store.email}` : ''}</p>
        <div class="legal">${legalItems}</div>
      </div>
      <div class="res-meta">
        <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0284c7">${docTitle}</div>
        <div class="code">N° ${code}</div>
        <div class="date">${dateLabel}</div>
      </div>
    </div>`;
}

function clientSection(client: Client | undefined, title = '👤 Client'): string {
  return `
    <div class="section blue">
      <h3>${title}</h3>
      <p><strong>${client ? `${client.firstName} ${client.lastName}` : '—'}</strong></p>
      ${client?.sexe ? `<p>${client.sexe === 'M' ? 'Masculin' : 'Féminin'}${client.profession ? ` · ${client.profession}` : ''}</p>` : ''}
      <p>${client?.phone ?? ''}${client?.phone2 ? ` / ${client.phone2}` : ''}</p>
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
    room.wilaya && `<p><strong>Wilaya:</strong> ${room.wilaya}${room.commune ? ` · <strong>Commune:</strong> ${room.commune}` : ''}</p>`,
    !room.wilaya && room.commune ? `<p><strong>Commune:</strong> ${room.commune}</p>` : '',
    room.secteur && `<p><strong>Secteur:</strong> ${room.secteur}</p>`,
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
      <div class="cachet">${store.name}<small>Cachet &amp; Signature</small></div>
    </div>
    <div class="foot">Document généré par ${store.name}${store.phone ? ` — ${store.phone}` : ''} — Merci de votre confiance.</div>`;
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
      <p>${mediator.phone}</p>
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
  const infos = `
    <div class="grid2">
      ${clientSection(client)}
      <div class="section violet">
        <h3>📋 Location ${r.code}</h3>
        <p><strong>Appartement(s):</strong> ${roomsList || '—'}</p>
        <p><strong>Arrivée:</strong> ${formatDate(r.checkIn)} à ${r.checkInTime}</p>
        <p><strong>Départ:</strong> ${formatDate(r.checkOut)} à ${r.checkOutTime}</p>
        <p><strong>Durée:</strong> ${nightsBetween(r.checkIn, r.checkOut)} nuit(s)</p>
      </div>
    </div>
    ${paymentsTable(r.payments)}`;
  return receiptShell(store, r.code, 'Reçu de Paiement — Location', payment, infos, [
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
        <p>${mediator.phone}${mediator.phone2 ? ` / ${mediator.phone2}` : ''}</p>
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

// ─── Contrat de location (rental contract) ──────────────────────────────────

export function buildRentalContractHTML(data: AppData, r: Reservation, store: StoreInfo): string {
  const client = clientById(data, r.clientId);
  const nights = nightsBetween(r.checkIn, r.checkOut);
  const paid = reservationPaid(r);
  const remaining = reservationRemaining(r);

  const roomRows = r.rooms.map((rr) => {
    const room = data.rooms.find((x) => x.id === rr.roomId);
    const floor = room ? (data.floors.find((f) => f.id === room.floorId)?.name ?? '—') : '—';
    const loc = room ? [room.wilaya, room.commune, room.secteur].filter(Boolean).join(', ') : '';
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

    <div class="parties">
      <div class="party">
        <h3>Le Bailleur / Mandataire</h3>
        <p class="role">Agence</p>
        <p><strong>${store.name}</strong></p>
        ${store.address ? `<p>${store.address}</p>` : ''}
        ${store.phone ? `<p>Tél : ${store.phone}${store.email ? ` · ${store.email}` : ''}</p>` : ''}
        ${store.rc ? `<p>RC : ${store.rc}${store.nif ? ` · NIF : ${store.nif}` : ''}</p>` : ''}
      </div>
      <div class="party">
        <h3>Le Locataire</h3>
        <p class="role">Client</p>
        <p><strong>${client ? `${client.firstName} ${client.lastName}` : '—'}</strong></p>
        ${client?.phone ? `<p>Tél : ${client.phone}${client.phone2 ? ` / ${client.phone2}` : ''}</p>` : ''}
        ${client?.address || client?.city ? `<p>${[client?.address, client?.city].filter(Boolean).join(', ')}</p>` : ''}
        ${client?.documentType ? `<p>Pièce : ${client.documentNumber ?? '—'} (${client.documentType})</p>` : ''}
      </div>
    </div>

    <p class="tbl-head">🏠 Bien(s) loué(s)</p>
    <table>
      <thead><tr><th>Appartement</th><th>Localisation</th><th>Étage</th><th class="right">Prix/nuit</th><th class="right">Nuits</th><th class="right">Sous-total</th></tr></thead>
      <tbody>${roomRows}</tbody>
    </table>

    <div class="grid2">
      <div class="section green">
        <h3>📅 Durée de la location</h3>
        <p><strong>Arrivée :</strong> ${formatDate(r.checkIn)} à ${r.checkInTime}</p>
        <p><strong>Départ :</strong> ${formatDate(r.checkOut)} à ${r.checkOutTime}</p>
        <p><strong>Durée :</strong> ${nights} nuit(s)</p>
      </div>
      <div class="section blue">
        <h3>💰 Conditions financières</h3>
        <p><strong>Loyer total :</strong> ${formatDA(r.total)}</p>
        <p><strong>Déjà versé :</strong> ${formatDA(paid)}</p>
        <p><strong>Reste dû :</strong> <span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></p>
      </div>
    </div>

    <div class="clauses">
      <h4>Conditions générales</h4>
      <ol>
        <li>La présente location est consentie pour la période du ${formatDate(r.checkIn)} au ${formatDate(r.checkOut)}, soit ${nights} nuit(s).</li>
        <li>Le montant total de la location s'élève à ${formatDA(r.total)}, payable selon l'échéancier convenu entre les parties.</li>
        <li>Le locataire s'engage à occuper le bien loué paisiblement et à le restituer dans l'état où il l'a reçu.</li>
        <li>Toute prolongation au-delà de la date de départ pourra donner lieu à une facturation supplémentaire au tarif journalier en vigueur.</li>
        <li>Le locataire demeure responsable de toute dégradation causée au bien pendant la durée de la location.</li>
        <li>Le présent contrat est établi en deux exemplaires originaux, un pour chaque partie.</li>
      </ol>
    </div>

    ${paymentsTable(r.payments)}

    <div class="sign-grid">
      <div class="sign-box"><p class="who">Le Bailleur</p><div class="line">${store.name}</div></div>
      <div class="sign-box"><p class="who">Le Locataire</p><div class="line">${client ? `${client.firstName} ${client.lastName}` : 'Signature'}</div></div>
    </div>

    <div class="foot">Document généré par ${store.name}${store.phone ? ` — ${store.phone}` : ''} — Merci de votre confiance.</div>
  </div>`;
}

// ─── Bon de versement (payment voucher) ─────────────────────────────────────

export function buildVersementHTML(data: AppData, r: Reservation, store: StoreInfo): string {
  const client = clientById(data, r.clientId);
  const paid = reservationPaid(r);
  const remaining = reservationRemaining(r);
  const nights = nightsBetween(r.checkIn, r.checkOut);
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

    <div class="grid2">
      ${clientSection(client, '👤 Versé par')}
      <div class="section violet">
        <h3>📋 Location ${r.code}</h3>
        <p><strong>Appartement(s) :</strong> ${roomsList || '—'}</p>
        <p><strong>Séjour :</strong> ${formatDate(r.checkIn)} → ${formatDate(r.checkOut)}</p>
        <p><strong>Durée :</strong> ${nights} nuit(s)</p>
      </div>
    </div>

    ${paymentsTable(r.payments)}

    <div class="totals-wrap">
      <div class="row"><span>Loyer total</span><strong>${formatDA(r.total)}</strong></div>
      <div class="row"><span>Total versé</span><span class="badge-paid">${formatDA(paid)}</span></div>
      <div class="row grand"><span>Reste dû</span><span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></div>
    </div>

    ${stampSection(store, 'client')}
  </div>`;
}
