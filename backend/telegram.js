// Уведомление менеджеру в Telegram. Сейчас — ЗАГЛУШКА (лог).
// На проде: создать бота у @BotFather, узнать chat_id менеджера/группы, задать ENV:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// Токен — ТОЛЬКО в переменных окружения, никогда в код/Git.

const https = require('https');
const { formatEmail } = require('./email'); // тот же подробный текст, что и в письме

async function sendTelegram(record) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const text = formatEmail(record).slice(0, 4000); // лимит Telegram ~4096

  if (!token || !chatId) {
    console.log('\n===== [TELEGRAM — ЗАГЛУШКА] сообщение менеджеру =====\n' + text + '\n====================================================\n');
    return { sent: false, stub: true };
  }

  const payload = JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true });
  await new Promise((resolve, reject) => {
    const req = https.request(
      `https://api.telegram.org/bot${token}/sendMessage`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => res.statusCode < 300 ? resolve() : reject(new Error(`Telegram ${res.statusCode}: ${d}`))); }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
  return { sent: true };
}

module.exports = { sendTelegram };
