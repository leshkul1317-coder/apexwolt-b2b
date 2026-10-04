# APEXWOLT B2B — backend

Переносимые функции. Ядро не зависит от хостинга: одна и та же логика работает
локально и как Yandex Cloud Function.

## Заявка на закупку (`handler.js`)

Контракт — `POST` JSON:

```json
{
  "contact": { "name": "...", "company": "...", "inn": "...", "email": "...", "phone": "...", "comment": "...", "consent": true },
  "items":   [ { "name": "...", "code": "...", "qty": 1 } ],
  "meta":    { "source": "site" }
}
```

Ответ: `{ "ok": true, "id": "AW-..." }` или `{ "ok": false, "error": "..." }`.

Шаги внутри: валидация → сохранить (`storage.js`) → письмо менеджеру (`email.js`).

## Локальный запуск и тест

```bash
node backend/local-server.js
# в другом окне:
curl -X POST http://localhost:8787/request -H "Content-Type: application/json" \
  -d '{"contact":{"name":"Иван","company":"ООО Ромашка","email":"i@example.com","consent":true},"items":[{"name":"Дрель ДА-16,8-45","code":"7/14/04","qty":2}]}'
```

Сейчас **режим заглушек**: письмо печатается в лог, заявка пишется в
`backend/data/requests.json` (этот файл в `.gitignore` — содержит персональные данные).

## Перевод в прод (позже)

- **Почта:** задать ENV `SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MANAGER_EMAIL, MAIL_FROM`
  и установить `nodemailer` (`npm i nodemailer`). Код уже готов это использовать.
- **База:** заменить заглушку в `storage.js` на реальную БД (Yandex YDB serverless или
  Managed PostgreSQL), подключение через ENV. Интерфейс `saveRequest(record)` не меняется.
- **Хостинг:** Yandex Cloud Function + API Gateway. `handler` уже совместим
  (`event.httpMethod`, `event.body`, CORS). Деплой в аккаунт/организацию заказчика.
- **Ключи/пароли — только в ENV облака, не в код и не в Git.**
