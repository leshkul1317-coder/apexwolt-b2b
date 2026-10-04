// APEXWOLT B2B — приёмник заявки на закупку.
// Переносимая функция: работает как Yandex Cloud Function (handler(event, context))
// и локально через backend/local-server.js. Логика не зависит от хостинга.
//
// Контракт: POST JSON { contact:{name, company, inn, email, phone, comment, consent}, items:[{name, code, qty}] }
// Ответ: { ok:true, id } либо { ok:false, error }.
//
// Отправка письма и запись в базу вынесены в сменные модули (email.js / storage.js):
// сейчас это заглушки (лог + локальный JSON), в проде — реальный SMTP + БД (ключи в ENV).

const { sendManagerEmail } = require('./email');
const { sendTelegram } = require('./telegram');
const { saveRequest } = require('./storage');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s()+\-]{7,20}$/;

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function validate(payload) {
  const errors = [];
  const c = (payload && payload.contact) || {};
  const items = (payload && payload.items) || [];
  if (!c.name || String(c.name).trim().length < 2) errors.push('Укажите имя контактного лица');
  if (!c.company && !c.inn) errors.push('Укажите название компании или ИНН');
  if (c.inn && !/^\d{10}(\d{2})?$/.test(String(c.inn).trim())) errors.push('ИНН должен содержать 10 или 12 цифр');
  const hasEmail = c.email && EMAIL_RE.test(String(c.email).trim());
  const hasPhone = c.phone && PHONE_RE.test(String(c.phone).trim());
  if (!hasEmail && !hasPhone) errors.push('Укажите email или телефон для связи');
  if (!c.consent) errors.push('Требуется согласие на обработку персональных данных');
  if (!Array.isArray(items) || items.length === 0) errors.push('Заявка пуста — добавьте позиции');
  return errors;
}

function newId() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `AW-${stamp}-${Math.random().toString(36).slice(2, 6)}`;
}

// Основная бизнес-логика (не зависит от транспорта).
async function processRequest(payload) {
  const errors = validate(payload);
  if (errors.length) return { status: 400, body: { ok: false, error: errors.join('. ') } };

  const record = {
    id: newId(),
    createdAt: new Date().toISOString(),
    contact: {
      name: String(payload.contact.name).trim(),
      company: payload.contact.company ? String(payload.contact.company).trim() : '',
      inn: payload.contact.inn ? String(payload.contact.inn).trim() : '',
      email: payload.contact.email ? String(payload.contact.email).trim() : '',
      phone: payload.contact.phone ? String(payload.contact.phone).trim() : '',
      comment: payload.contact.comment ? String(payload.contact.comment).trim().slice(0, 2000) : '',
      consent: !!payload.contact.consent,            // согласие 152-ФЗ (обязательно)
      marketing: !!payload.contact.marketing,        // согласие на рассылки (добровольно, opt-in)
    },
    items: payload.items.map(it => ({
      name: String(it.name || '').slice(0, 300),
      code: String(it.code || '').slice(0, 60),
      qty: Math.max(1, parseInt(it.qty, 10) || 1),
      mrc: toNum(it.mrc),          // МРЦ (публичная), если известна
      partner: toNum(it.partner),  // цена партнёра, если известна
      brand: it.brand ? String(it.brand).slice(0, 40) : '',
    })),
    source: (payload.meta && payload.meta.source) || 'site',
  };

  // 1) сохранить (критично): БД-заглушка -> реальная БД на этапе прода
  await saveRequest(record);
  // 2) уведомления (Email + Telegram) — устойчиво: падение канала не теряет заявку
  const results = await Promise.allSettled([sendManagerEmail(record), sendTelegram(record)]);
  const channels = ['email', 'telegram'];
  results.forEach((r, i) => { if (r.status === 'rejected') console.error(`notify[${channels[i]}] failed:`, r.reason && r.reason.message); });

  return { status: 200, body: { ok: true, id: record.id } };
}

// ---- Адаптер Yandex Cloud Functions / API Gateway ----
module.exports.handler = async (event = {}) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod && event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ ok: false, error: 'Метод не поддерживается' }) };
  }
  let payload;
  try {
    payload = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ ok: false, error: 'Некорректный JSON' }) };
  }
  try {
    const res = await processRequest(payload);
    return { statusCode: res.status, headers: cors, body: JSON.stringify(res.body) };
  } catch (e) {
    console.error('request-handler error:', e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok: false, error: 'Внутренняя ошибка. Попробуйте позже.' }) };
  }
};

// экспорт для локального сервера/тестов
module.exports.processRequest = processRequest;
module.exports.validate = validate;
