// Отправка письма менеджеру. Сейчас — ЗАГЛУШКА (форматирует письмо и пишет в лог).
// На этапе прода подключаем реальный SMTP (nodemailer) с данными из ENV:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MANAGER_EMAIL, MAIL_FROM
// Ключи/пароли — ТОЛЬКО в переменных окружения, никогда в код/Git.

const money = v => (v || v === 0) ? `${new Intl.NumberFormat('ru-RU').format(Math.round(v))} ₽` : '—';

function formatEmail(record) {
  const c = record.contact;
  let sumMrc = 0, sumPartner = 0, haveMrc = false, havePartner = false;

  const itemLines = record.items.map((it, i) => {
    const qty = it.qty;
    const parts = [`  ${i + 1}. ${it.brand ? it.brand + ' ' : ''}${it.name}${it.code ? ` [${it.code}]` : ''} — ${qty} шт.`];
    const price = [];
    if (it.mrc) { price.push(`МРЦ: ${money(it.mrc)}`); sumMrc += it.mrc * qty; haveMrc = true; }
    if (it.partner) {
      price.push(`цена партнёра: ${money(it.partner)}`);
      sumPartner += it.partner * qty; havePartner = true;
      if (it.mrc && it.mrc > it.partner) {
        const disc = it.mrc - it.partner;
        price.push(`скидка: ${money(disc)} (${Math.round(disc / it.mrc * 100)}%)`);
      }
    }
    const lineSum = (it.partner || it.mrc) ? (it.partner || it.mrc) * qty : null;
    if (lineSum) price.push(`сумма: ${money(lineSum)}`);
    if (price.length) parts.push('     ' + price.join(' · '));
    return parts.join('\n');
  });

  const totals = [];
  if (haveMrc) totals.push(`  Сумма по МРЦ: ${money(sumMrc)}`);
  if (havePartner) totals.push(`  Сумма по цене партнёра: ${money(sumPartner)}`);
  if (haveMrc && havePartner && sumMrc > sumPartner) {
    const d = sumMrc - sumPartner;
    totals.push(`  Общая скидка: ${money(d)} (${Math.round(d / sumMrc * 100)}%)`);
  }
  if (!haveMrc && !havePartner) totals.push('  Цены будут подтверждены менеджером.');

  const lines = [
    `НОВАЯ ЗАЯВКА НА ЗАКУПКУ № ${record.id}`,
    `Дата и время: ${new Date(record.createdAt).toLocaleString('ru-RU')}`,
    `Источник: ${record.source}`,
    '',
    'КОНТАКТ:',
    `  Контактное лицо: ${c.name}`,
    c.company ? `  Компания: ${c.company}` : null,
    c.inn ? `  ИНН: ${c.inn}` : null,
    c.email ? `  Email: ${c.email}` : null,
    c.phone ? `  Телефон: ${c.phone}` : null,
    c.comment ? `  Комментарий: ${c.comment}` : null,
    '',
    `ПОЗИЦИИ (${record.items.length}):`,
    ...itemLines,
    '',
    'ИТОГО:',
    ...totals,
  ].filter(Boolean);
  return lines.join('\n');
}

async function sendManagerEmail(record) {
  const text = formatEmail(record);
  const to = process.env.MANAGER_EMAIL;
  const smtpReady = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && to;

  if (!smtpReady) {
    // Режим заглушки: показываем, что ушло бы менеджеру.
    console.log('\n===== [EMAIL — ЗАГЛУШКА] письмо менеджеру =====\n' + text + '\n=============================================\n');
    return { sent: false, stub: true };
  }

  // Реальная отправка (подключается на проде). nodemailer ставится отдельно: npm i nodemailer
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: (Number(process.env.SMTP_PORT) || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `Заявка ${record.id} — ${record.contact.company || record.contact.name}`,
    text,
  });
  return { sent: true };
}

module.exports = { sendManagerEmail, formatEmail };
