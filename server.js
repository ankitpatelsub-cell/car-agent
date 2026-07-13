// server.js — Car Dealership Assistant: chat API + customer site + admin (SQLite-backed).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { run, DB } = require('./agent-core');
const { limited } = require('./ratelimit');

const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type });
  if (Buffer.isBuffer(body)) return res.end(body);
  if (typeof body === 'string') return res.end(body);
  res.end(JSON.stringify(body));
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  async function body() { let b = ''; for await (const c of req) b += c; try { return JSON.parse(b || '{}'); } catch { return {}; } }
  if (req.method === 'POST' && limited(req.socket.remoteAddress)) return send(res, 429, { error: 'rate limit' });

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    const b = await body(); if (!b.text) return send(res, 400, { error: 'no text' });
    return send(res, 200, run(b.text, b.channel || 'whatsapp', b.locale || 'en'));
  }
  if (req.method === 'GET' && url.pathname === '/api/cars') {
    const brand = url.searchParams.get('brand'); const budget = url.searchParams.get('budget');
    const list = (brand || budget) ? DB.matchCars({ brand: brand || undefined, budgetLakh: budget ? +budget : undefined }) : DB.allCars();
    return send(res, 200, list);
  }
  if (req.method === 'POST' && url.pathname === '/api/cars') {
    const b = await body();
    if (!b.brand || !b.model || !b.price) return send(res, 400, { error: 'need brand, model, price' });
    return send(res, 200, { id: DB.addCar(b).lastInsertRowid });
  }
  if (req.method === 'POST' && url.pathname === '/api/cars/delete') {
    const b = await body(); DB.delCar(b.id); return send(res, 200, { ok: true });
  }
  if (req.method === 'GET' && url.pathname === '/api/leads') return send(res, 200, DB.leads());
  if (req.method === 'GET' && url.pathname === '/api/bookings') return send(res, 200, DB.bookings());
  if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, { cars: DB.allCars().length, leads: DB.leads().length, bookings: DB.bookings().length });

  // Pages
  let p = url.pathname === '/' ? '/index.html' : url.pathname;
  if (url.pathname.startsWith('/admin')) p = '/admin.html';
  const fp = path.join(PUBLIC, p);
  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return send(res, 200, fs.readFileSync(fp), MIME[path.extname(fp)] || 'text/plain');
  return send(res, 404, { error: 'not found' });
});
const PORT = 8097;
server.listen(PORT, '0.0.0.0', () => console.log('Car Agent (DB) on ' + PORT));
