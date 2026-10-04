// Локальный сервер для разработки/теста функции заявки БЕЗ облака.
// Запуск:  node backend/local-server.js   (порт 8787, меняется через PORT)
// Проверка: POST http://localhost:8787/request  с JSON-телом заявки.
// Маппит обычный HTTP-запрос в event для handler (как это делает API Gateway в проде).

const http = require('http');
const { handler } = require('./handler');
const { handler: notifyHandler } = require('./notify');

const PORT = Number(process.env.PORT) || 8787;

const server = http.createServer((req, res) => {
  const path = (req.url || '').split('?')[0];
  const route = path === '/notify' ? notifyHandler : (path === '/request' || path === '/') ? handler : null;
  if (!route) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Not found' }));
    return;
  }
  let body = '';
  req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
  req.on('end', async () => {
    const event = {
      httpMethod: req.method,
      headers: req.headers,
      body,
    };
    const result = await route(event);
    res.writeHead(result.statusCode, result.headers || { 'Content-Type': 'application/json' });
    res.end(result.body);
  });
});

server.listen(PORT, () => {
  console.log(`[backend] приёмник заявки слушает http://localhost:${PORT}/request`);
  console.log('[backend] режим: заглушки (письмо -> лог, база -> backend/data/requests.json)');
});
