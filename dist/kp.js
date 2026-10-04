/* APEXWOLT B2B — генерация коммерческого предложения (КП) из состава заявки.
 * Форматы: PDF (фирменный бланк, печать/сохранение) и Excel (.xlsx, редактируемый).
 * Данные берутся из localStorage: apexwolt-cart (имена) + apexwolt-cart-meta (артикул/бренд/МРЦ/фото).
 * Реквизиты поставщика и режим НДС вынесены в KP_CONFIG — меняются в одном месте.
 */
(() => {
  'use strict';

  // ------------------------------------------------------------------
  // КОНФИГ. Реквизиты — из карточки предприятия заказчика.
  // НДС: заказчик подтвердил RUB, цена с НДС 22%. (e-mail и домен сайта — ещё уточняются.)
  // ------------------------------------------------------------------
  const KP_CONFIG = {
    supplier: {
      name: 'ООО «Гранит»',
      inn: '3817050540',
      kpp: '381701001',
      ogrn: '1203800007850',
      address: '665717, Иркутская обл., г. Братск, Центральный жилрайон, Южная ул., д. 14Б',
      phone: '8 (39535) 27-352',
      email: '',                       // в карточке не указан — заполнить позже
      signatory: 'Трухоненко А. Н.',
      signatoryRole: 'Директор',
      site: 'apexwolt.ru'              // заменить реальным доменом
    },
    vat: { mode: 'vat', rate: 22 },    // заказчик подтвердил: RUB, цена с НДС 22%. 'vat' — выделять НДС; 'none' — «НДС не облагается»
    validityDays: 5,
    brandName: 'APEXWOLT',
    logoSvg: 'assets/apexwolt-logo-solid.svg',
    logoPng: 'assets/apexwolt-logo-black.png',
    accent: '#2f63ff',
    ink: '#101114'
  };

  const VENDOR_EXCELJS = 'assets/vendor/exceljs.min.js';

  // ---------- утилиты ----------
  const readCart = () => { try { return JSON.parse(localStorage.getItem('apexwolt-cart') || '[]'); } catch { return []; } };
  const readMeta = () => { try { return JSON.parse(localStorage.getItem('apexwolt-cart-meta') || '{}'); } catch { return {}; } };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtMoney = v => (v == null) ? '—' : new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' ₽';
  const pad2 = n => String(n).padStart(2, '0');
  const fmtDate = d => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const toast = msg => { if (window.apexToast) window.apexToast(msg); else if (window.showAccountToast) window.showAccountToast(msg); };

  const kpNumber = d => `КП-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;

  // ---------- сумма прописью (рубли/копейки) ----------
  const amountInWords = value => {
    const rub = Math.floor(value);
    const kop = Math.round((value - rub) * 100);
    const u0 = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const u1 = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const ten = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hund = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
    const triadWords = (num, female) => {
      const out = [];
      const h = Math.floor(num / 100), t = Math.floor((num % 100) / 10), o = num % 10;
      if (h) out.push(hund[h]);
      if (t === 1) out.push(ten[o]);
      else { if (t) out.push(tens[t]); if (o) out.push((female ? u1 : u0)[o]); }
      return out.join(' ');
    };
    const plural = (n, forms) => { const n10 = n % 10, n100 = n % 100; if (n10 === 1 && n100 !== 11) return forms[0]; if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1]; return forms[2]; };
    const parts = [];
    const mln = Math.floor(rub / 1e6);
    const ths = Math.floor((rub % 1e6) / 1000);
    const rest = rub % 1000;
    if (mln) parts.push(triadWords(mln, false) + ' ' + plural(mln, ['миллион', 'миллиона', 'миллионов']));
    if (ths) parts.push(triadWords(ths, true) + ' ' + plural(ths, ['тысяча', 'тысячи', 'тысяч']));
    if (rest || !parts.length) parts.push(triadWords(rest, false));
    let words = parts.join(' ').replace(/\s+/g, ' ').trim();
    words = words.charAt(0).toUpperCase() + words.slice(1);
    return `${words} ${plural(rub, ['рубль', 'рубля', 'рублей'])} ${pad2(kop)} ${plural(kop, ['копейка', 'копейки', 'копеек'])}`;
  };

  // ---------- модель КП из корзины ----------
  const buildModel = () => {
    const names = readCart(), meta = readMeta();
    const map = new Map();
    names.forEach(n => {
      if (map.has(n)) map.get(n).qty += 1;
      else { const m = meta[n] || {}; map.set(n, { name: n, qty: 1, code: m.code || '', brand: m.brand || '', image: m.image || '', mrc: m.mrc ? Number(m.mrc) : null }); }
    });
    const items = [...map.values()].map((it, i) => ({ ...it, idx: i + 1, sum: it.mrc != null ? it.mrc * it.qty : null }));
    const withVat = items.reduce((s, it) => s + (it.sum || 0), 0);
    let net = null, vat = null;
    if (KP_CONFIG.vat.mode === 'vat') { const r = KP_CONFIG.vat.rate / 100; net = withVat / (1 + r); vat = withVat - net; }
    const now = new Date();
    return {
      items,
      totals: { withVat, net, vat },
      number: kpNumber(now),
      date: fmtDate(now),
      validUntil: fmtDate(addDays(now, KP_CONFIG.validityDays)),
      itemsCount: items.length,
      totalQty: items.reduce((s, it) => s + it.qty, 0)
    };
  };

  // ---------- QR «оформить онлайн» ----------
  const orderParam = items => items.filter(it => it.code).map(it => `${it.code}*${it.qty}`).join(';');
  const orderUrl = model => `${location.origin}/catalog?order=${encodeURIComponent(orderParam(model.items))}`;
  const qrDataUrl = (text, size = 320) => {
    if (typeof QRCode === 'undefined') return '';
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(holder);
    let url = '';
    try {
      new QRCode(holder, { text, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
      const canvas = holder.querySelector('canvas');
      if (canvas) url = canvas.toDataURL('image/png');
      else { const img = holder.querySelector('img'); url = img ? img.src : ''; }
    } catch (e) { url = ''; }
    document.body.removeChild(holder);
    return url;
  };

  // ---------- PDF (фирменный бланк через печать) ----------
  const vatRows = totals => {
    if (KP_CONFIG.vat.mode === 'vat') {
      return `<tr><td>Итого без НДС</td><td>${fmtMoney(totals.net)}</td></tr>
              <tr><td>НДС ${KP_CONFIG.vat.rate}%</td><td>${fmtMoney(totals.vat)}</td></tr>
              <tr class="grand"><td>Всего с НДС</td><td>${fmtMoney(totals.withVat)}</td></tr>`;
    }
    return `<tr class="grand"><td>Итого</td><td>${fmtMoney(totals.withVat)}</td></tr>
            <tr><td colspan="2" class="novat">НДС не облагается (УСН)</td></tr>`;
  };

  const buildHtml = model => {
    const s = KP_CONFIG.supplier;
    const qr = qrDataUrl(orderUrl(model));
    const rows = model.items.map(it => `
      <tr>
        <td class="c">${it.idx}</td>
        <td class="ph">${it.image ? `<img src="${esc(it.image)}" alt="">` : ''}</td>
        <td class="code">${esc(it.code) || '—'}</td>
        <td class="name"><b>${esc(it.name)}</b>${it.brand ? `<span class="bg">${esc(it.brand)}</span>` : ''}</td>
        <td class="c">${it.qty}</td>
        <td class="r">${it.mrc != null ? fmtMoney(it.mrc) : 'по запросу'}</td>
        <td class="r"><b>${it.sum != null ? fmtMoney(it.sum) : '—'}</b></td>
      </tr>`).join('');
    const supplierLine = [
      `ИНН ${s.inn}`, s.kpp ? `КПП ${s.kpp}` : '', s.ogrn ? `ОГРН ${s.ogrn}` : ''
    ].filter(Boolean).join(' · ');
    return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>${esc(model.number)} — ${esc(KP_CONFIG.brandName)}</title>
<style>
  @page { size: A4; margin: 13mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: ${KP_CONFIG.ink}; font: 12px/1.4 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
  .doc { max-width: 190mm; margin: 0 auto; padding: 8px; }
  .kp-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding-bottom: 14px; border-bottom: 2px solid ${KP_CONFIG.ink}; }
  .kp-logo img { height: 34px; }
  .kp-supplier { font-size: 10px; color: #3a3d43; text-align: right; max-width: 92mm; line-height: 1.45; }
  .kp-supplier b { color: ${KP_CONFIG.ink}; font-size: 12px; }
  h1 { margin: 20px 0 3px; font-size: 21px; letter-spacing: -.02em; }
  .kp-sub { margin: 0; color: #6a6e76; font-size: 11px; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 16px; }
  table.items th { background: #f3f5f8; color: #5a5e66; font-size: 9px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; padding: 8px 7px; text-align: left; border-bottom: 1px solid #dfe2e8; }
  table.items td { padding: 8px 7px; border-bottom: 1px solid #eceef2; vertical-align: middle; font-size: 11px; }
  td.c { text-align: center; } td.r { text-align: right; white-space: nowrap; }
  td.ph { width: 42px; } td.ph img { width: 38px; height: 38px; object-fit: contain; }
  td.code { color: #6a6e76; font-size: 10px; white-space: nowrap; }
  td.name b { font-weight: 600; } td.name .bg { display: inline-block; margin-left: 7px; padding: 1px 6px; border-radius: 99px; background: #eef1f6; color: #4a4e56; font-size: 8px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; vertical-align: middle; }
  .kp-bottom { display: flex; justify-content: space-between; gap: 24px; margin-top: 18px; }
  .kp-left { flex: 1; }
  table.totals { border-collapse: collapse; min-width: 74mm; }
  table.totals td { padding: 7px 10px; font-size: 11px; }
  table.totals td:last-child { text-align: right; white-space: nowrap; font-weight: 600; }
  table.totals tr.grand td { border-top: 2px solid ${KP_CONFIG.ink}; font-size: 14px; font-weight: 800; }
  table.totals td.novat { color: #6a6e76; font-weight: 500; font-size: 10px; text-align: left; }
  .kp-words { margin: 10px 0 0; font-size: 10.5px; color: #3a3d43; }
  .kp-words b { color: ${KP_CONFIG.ink}; }
  .kp-qr { text-align: center; width: 36mm; }
  .kp-qr img { width: 32mm; height: 32mm; }
  .kp-qr span { display: block; margin-top: 4px; font-size: 8.5px; color: #6a6e76; line-height: 1.3; }
  .kp-note { margin-top: 16px; padding-top: 12px; border-top: 1px solid #eceef2; color: #6a6e76; font-size: 9.5px; line-height: 1.5; }
  .kp-sign { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 22px; font-size: 11px; }
  .kp-sign .line { width: 60mm; border-bottom: 1px solid #b9bcc2; }
  .kp-accent { color: ${KP_CONFIG.accent}; }
  @media screen { body { background: #e9ebef; padding: 20px; } .doc { background: #fff; box-shadow: 0 10px 40px rgba(0,0,0,.12); padding: 18mm 14mm; } .print-bar { max-width: 190mm; margin: 0 auto 14px; display: flex; gap: 10px; } .print-bar button { padding: 10px 16px; border: 0; border-radius: 9px; background: ${KP_CONFIG.accent}; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; } .print-bar button.ghost { background: #fff; color: ${KP_CONFIG.ink}; border: 1px solid #d5d8de; } }
  @media print { .print-bar { display: none; } }
</style></head>
<body>
  <div class="print-bar"><button onclick="window.print()">Сохранить в PDF / Печать</button><button class="ghost" onclick="window.close()">Закрыть</button></div>
  <div class="doc">
    <div class="kp-top">
      <div class="kp-logo"><img src="${esc(KP_CONFIG.logoSvg)}" alt="${esc(KP_CONFIG.brandName)}"></div>
      <div class="kp-supplier"><b>${esc(s.name)}</b><br>${esc(supplierLine)}<br>${esc(s.address)}<br>${esc(s.phone)}${s.email ? ' · ' + esc(s.email) : ''}</div>
    </div>
    <h1>Коммерческое предложение <span class="kp-accent">${esc(model.number)}</span></h1>
    <p class="kp-sub">от ${esc(model.date)} · действительно до ${esc(model.validUntil)}</p>
    <table class="items">
      <thead><tr><th>№</th><th></th><th>Артикул</th><th>Наименование</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="kp-bottom">
      <div class="kp-left">
        <p class="kp-words">Всего наименований ${model.itemsCount}, на сумму <b>${fmtMoney(model.totals.withVat)}</b>.<br>${esc(amountInWords(model.totals.withVat))}.</p>
        <p class="kp-words" style="color:#8a8e96">Персональные цены и скидки открываются после авторизации компании в личном кабинете.</p>
      </div>
      ${qr ? `<div class="kp-qr"><img src="${qr}" alt="QR"><span>Оформить заявку онлайн<br>с этим составом</span></div>` : ''}
    </div>
    <table class="totals" style="margin-top:14px">${vatRows(model.totals)}</table>
    <div class="kp-note">
      Коммерческое предложение носит информационный характер и не является публичной офертой. Цены указаны в рублях.
      Окончательные цены, наличие и сроки поставки подтверждает менеджер. Предложение действует ${KP_CONFIG.validityDays} дн. с даты формирования.
    </div>
    <div class="kp-sign"><div><span style="color:#6a6e76">${esc(KP_CONFIG.supplier.signatoryRole)}</span><div class="line"></div>${esc(KP_CONFIG.supplier.signatory)}</div><div style="text-align:right;color:#8a8e96;font-size:9px">${esc(KP_CONFIG.supplier.site)}</div></div>
  </div>
</body></html>`;
  };

  const generatePdf = () => {
    const model = buildModel();
    if (!model.items.length) { toast('Заявка пуста — добавьте позиции из каталога.'); return; }
    const win = window.open('', '_blank');
    if (!win) { toast('Разрешите всплывающие окна, чтобы открыть КП.'); return; }
    win.document.open();
    win.document.write(buildHtml(model));
    win.document.close();
  };

  // ---------- Excel (.xlsx через ExcelJS, ленивая загрузка) ----------
  const loadScript = src => new Promise((resolve, reject) => {
    if (window.ExcelJS) return resolve();
    const el = document.createElement('script');
    el.src = src; el.onload = resolve; el.onerror = () => reject(new Error('Не удалось загрузить модуль Excel'));
    document.head.appendChild(el);
  });

  const fetchBase64 = async url => {
    try {
      const res = await fetch(url); const buf = await res.arrayBuffer();
      let bin = ''; const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    } catch { return null; }
  };

  const generateExcel = async btn => {
    const model = buildModel();
    if (!model.items.length) { toast('Заявка пуста — добавьте позиции из каталога.'); return; }
    const prev = btn && btn.textContent;
    if (btn) { btn.disabled = true; btn.textContent = 'Формируем…'; }
    try {
      await loadScript(VENDOR_EXCELJS);
      const s = KP_CONFIG.supplier;
      const wb = new ExcelJS.Workbook();
      wb.creator = KP_CONFIG.brandName;
      const ws = wb.addWorksheet('КП', { properties: { defaultRowHeight: 18 }, pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 } });
      ws.columns = [
        { width: 5 }, { width: 16 }, { width: 58 }, { width: 14 }, { width: 8 }, { width: 15 }, { width: 16 }
      ];
      const money = '#,##0.00" ₽"';
      const ink = 'FF101114', accent = 'FF2F63FF', line = 'FFDFE2E8', head = 'FFF3F5F8';

      // Логотип
      const logo64 = await fetchBase64(KP_CONFIG.logoPng);
      if (logo64) {
        const imgId = wb.addImage({ base64: logo64, extension: 'png' });
        ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 40 } });
      }
      ws.mergeCells('C1:G2');
      ws.getCell('C1').value = `${s.name}\nИНН ${s.inn} · КПП ${s.kpp} · ОГРН ${s.ogrn}\n${s.address} · ${s.phone}`;
      ws.getCell('C1').alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
      ws.getCell('C1').font = { size: 9, color: { argb: 'FF3A3D43' } };
      ws.getRow(1).height = 22; ws.getRow(2).height = 22;

      ws.mergeCells('A4:G4');
      ws.getCell('A4').value = `Коммерческое предложение ${model.number}`;
      ws.getCell('A4').font = { size: 16, bold: true, color: { argb: ink } };
      ws.mergeCells('A5:G5');
      ws.getCell('A5').value = `от ${model.date} · действительно до ${model.validUntil}`;
      ws.getCell('A5').font = { size: 10, color: { argb: 'FF6A6E76' } };

      const headRow = ws.addRow([]); // row 6 spacer
      const hr = ws.addRow(['№', 'Артикул', 'Наименование', 'Бренд', 'Кол-во', 'Цена', 'Сумма']);
      hr.eachCell(c => { c.font = { size: 9, bold: true, color: { argb: 'FF5A5E66' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: head } }; c.alignment = { vertical: 'middle' }; c.border = { bottom: { style: 'thin', color: { argb: line } } }; });
      // переносим «Артикул» в колонку B визуально: наша раскладка — A№ B(пусто-фото в PDF) ... в xlsx фото не вставляем, поэтому сдвигаем
      hr.getCell(1).value = '№'; hr.getCell(2).value = 'Артикул'; hr.getCell(3).value = 'Наименование'; hr.getCell(4).value = 'Бренд'; hr.getCell(5).value = 'Кол-во'; hr.getCell(6).value = 'Цена'; hr.getCell(7).value = 'Сумма';

      model.items.forEach(it => {
        const row = ws.addRow([it.idx, it.code || '—', it.name, it.brand || '', it.qty, it.mrc, it.sum]);
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(5).alignment = { horizontal: 'center' };
        row.getCell(6).numFmt = money; row.getCell(7).numFmt = money;
        row.getCell(7).font = { bold: true };
        row.eachCell((c, col) => { c.border = { bottom: { style: 'hair', color: { argb: 'FFECEEF2' } } }; c.alignment = { ...c.alignment, vertical: 'middle', wrapText: col === 3 }; });
        row.font = { size: 10 };
      });

      ws.addRow([]);
      const addTotal = (label, value, grand) => {
        const r = ws.addRow(['', '', '', '', '', label, value]);
        r.getCell(6).font = { size: grand ? 12 : 10, bold: grand, color: { argb: grand ? ink : 'FF5A5E66' } };
        r.getCell(7).numFmt = money; r.getCell(7).font = { size: grand ? 13 : 10, bold: true, color: { argb: grand ? ink : ink } };
        if (grand) { r.getCell(6).border = { top: { style: 'medium', color: { argb: ink } } }; r.getCell(7).border = { top: { style: 'medium', color: { argb: ink } } }; }
      };
      if (KP_CONFIG.vat.mode === 'vat') {
        addTotal('Итого без НДС', model.totals.net, false);
        addTotal(`НДС ${KP_CONFIG.vat.rate}%`, model.totals.vat, false);
        addTotal('Всего с НДС', model.totals.withVat, true);
      } else {
        addTotal('Итого', model.totals.withVat, true);
        const nr = ws.addRow(['', '', '', '', '', '', 'НДС не облагается (УСН)']);
        nr.getCell(7).font = { size: 9, color: { argb: 'FF6A6E76' } };
      }

      ws.addRow([]);
      const w1 = ws.addRow([`Всего наименований ${model.itemsCount}, на сумму ${fmtMoney(model.totals.withVat)}.`]);
      ws.mergeCells(`A${w1.number}:G${w1.number}`); w1.getCell(1).font = { size: 10, bold: true };
      const w2 = ws.addRow([amountInWords(model.totals.withVat) + '.']);
      ws.mergeCells(`A${w2.number}:G${w2.number}`); w2.getCell(1).font = { size: 10, color: { argb: 'FF3A3D43' } };
      const note = ws.addRow(['Информационное предложение, не является публичной офертой. Окончательные цены, наличие и сроки подтверждает менеджер. Персональные цены и скидки — после авторизации компании.']);
      ws.mergeCells(`A${note.number}:G${note.number}`); note.getCell(1).alignment = { wrapText: true, vertical: 'top' }; note.getCell(1).font = { size: 9, color: { argb: 'FF6A6E76' } }; ws.getRow(note.number).height = 34;
      const sign = ws.addRow([`${s.signatoryRole}: ________________ ${s.signatory}`]);
      ws.mergeCells(`A${sign.number}:G${sign.number}`); sign.getCell(1).font = { size: 10 };

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${model.number}.xlsx`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('Коммерческое предложение сформировано');
    } catch (e) {
      console.error('KP excel error:', e);
      toast('Не удалось сформировать Excel. Попробуйте ещё раз.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = prev; }
    }
  };

  // ---------- привязка кнопок ----------
  document.addEventListener('click', e => {
    const pdfBtn = e.target.closest('[data-kp-pdf]');
    if (pdfBtn) { e.preventDefault(); generatePdf(); return; }
    const xlsBtn = e.target.closest('[data-kp-excel]');
    if (xlsBtn) { e.preventDefault(); generateExcel(xlsBtn); return; }
  });

  window.apexKP = { model: buildModel, html: () => buildHtml(buildModel()), pdf: generatePdf, excel: generateExcel, config: KP_CONFIG };
})();
