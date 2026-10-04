// Сохранение заявки. Сейчас — ЗАГЛУШКА (локальный JSON-файл backend/data/requests.json).
// ВНИМАНИЕ: файл содержит персональные данные — он в .gitignore, в Git не попадает.
// На этапе прода заменяем на реальную БД (Yandex YDB serverless или Managed PostgreSQL),
// подключение через ENV (DB_* / YDB_*). Интерфейс saveRequest(record) остаётся прежним.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'requests.json');
const SUBS_FILE = path.join(DATA_DIR, 'subscriptions.json');

async function saveRequest(record) {
  // Прод: здесь будет INSERT в БД. Локально — дозапись в JSON.
  if (process.env.DB_DRIVER && process.env.DB_DRIVER !== 'json') {
    // место для реального драйвера БД (YDB/Postgres) на этапе прода
    throw new Error(`DB_DRIVER=${process.env.DB_DRIVER} не реализован — подключается на этапе прода`);
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  let list = [];
  try { list = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { list = []; }
  list.push(record);
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8');
  return { saved: true, total: list.length };
}

// Подписка «сообщить о поступлении». Локально — дозапись в JSON (в .gitignore).
async function saveSubscription(record) {
  if (process.env.DB_DRIVER && process.env.DB_DRIVER !== 'json') {
    throw new Error(`DB_DRIVER=${process.env.DB_DRIVER} не реализован — подключается на этапе прода`);
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  let list = [];
  try { list = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8')); } catch { list = []; }
  list.push(record);
  fs.writeFileSync(SUBS_FILE, JSON.stringify(list, null, 2), 'utf8');
  return { saved: true, total: list.length };
}

module.exports = { saveRequest, saveSubscription };
