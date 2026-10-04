// APEXWOLT B2B — подписка «Сообщить о поступлении» (back-in-stock).
// Переносимо: Yandex Cloud Function (handler(event)) и локально через local-server.js.
//
// Контракт: POST JSON { email, product:{ name, code }, meta?:{ source } }
// Ответ: { ok:true } либо { ok:false, error }.
//
// Сейчас база — заглушка (локальный JSON). Реальная отправка уведомления о поступлении
// подключается на этапе прода (когда появится синхронизация остатков).

const { saveSubscription } = require('./storage');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(payload) {
  const errors = [];
  const c = payload || {};
  if (!c.email || !EMAIL_RE.test(String(c.email).trim())) errors.push('Укажите корректный email');
  if (!c.product || !c.product.name) errors.push('Не указан товар');
  return errors;
}

async function processNotify(payload) {
  const errors = validate(payload);
  if (errors.length) return { status: 400, body: { ok: false, error: errors.join('. ') } };

  const record = {
    id: `SUB-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    email: String(payload.email).trim().slice(0, 160),
    product: {
      name: String(payload.product.name || '').slice(0, 300),
      code: String(payload.product.code || '').slice(0, 60),
    },
    source: (payload.meta && payload.meta.source) || 'site',
  };

  await saveSubscription(record);
  console.log(`\n===== [ПОДПИСКА НА ПОСТУПЛЕНИЕ] =====\n  ${record.email} -> ${record.product.name}${record.product.code ? ` [${record.product.code}]` : ''}\n=====================================\n`);
  return { status: 200, body: { ok: true, id: record.id } };
}

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
    const res = await processNotify(payload);
    return { statusCode: res.status, headers: cors, body: JSON.stringify(res.body) };
  } catch (e) {
    console.error('notify-handler error:', e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok: false, error: 'Внутренняя ошибка. Попробуйте позже.' }) };
  }
};

module.exports.processNotify = processNotify;
