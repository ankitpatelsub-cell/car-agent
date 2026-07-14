// server.js — Car Dealership Assistant: chat API + customer site + admin (SQLite-backed).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { run, DB } = require('./agent-core');
const { limited } = require('./ratelimit');
const auth = require('./auth');

// Load .env (ADMIN_PASS / ADMIN_SECRET) if present.
try {
  const ep = path.join(__dirname, '.env');
  if (fs.existsSync(ep)) for (const line of fs.readFileSync(ep, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

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
  const authOk = () => auth.checkToken(req.headers['x-auth-token'] || '');

  if (req.method === 'POST' && url.pathname === '/api/login') {
    const b = await body();
    if (auth.checkPass(b.password)) return send(res, 200, { token: auth.makeToken() });
    return send(res, 401, { error: 'unauthorized' });
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    const b = await body(); if (!b.text) return send(res, 400, { error: 'no text' });
    return send(res, 200, run(b.text, b.channel || 'whatsapp', b.locale || 'en'));
  }
  if (req.method === 'GET' && url.pathname === '/api/cars') {
    const brand = url.searchParams.get('brand'); const budget = url.searchParams.get('budget');
    const list = (brand || budget) ? DB.matchCars({ brand: brand || undefined, budgetLakh: budget ? +budget : undefined }) : DB.allCars();
    return send(res, 200, list);
  }
  // Mutating car routes require auth.
  if (req.method === 'POST' && url.pathname === '/api/cars') {
    if (!authOk()) return send(res, 401, { error: 'unauthorized' });
    const b = await body();
    if (!b.brand || !b.model || !b.price) return send(res, 400, { error: 'need brand, model, price' });
    const newId = DB.addCar(b).lastInsertRowid;
    // Integration: notify Reels Agent to auto-generate a marketing reel.
    fetch('http://localhost:8098/api/car-added', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newId, brand: b.brand, model: b.model, year: b.year, price: b.price, fuel: b.fuel, city: b.city })
    }).catch(() => {});
    return send(res, 200, { id: newId });
  }
  if (req.method === 'POST' && url.pathname === '/api/cars/delete') {
    if (!authOk()) return send(res, 401, { error: 'unauthorized' });
    const b = await body(); DB.delCar(b.id); return send(res, 200, { ok: true });
  }
  if (req.method === 'GET' && url.pathname === '/api/leads') { if (!authOk()) return send(res, 401, { error: 'unauthorized' }); return send(res, 200, DB.leads()); }
  if (req.method === 'GET' && url.pathname === '/api/bookings') { if (!authOk()) return send(res, 401, { error: 'unauthorized' }); return send(res, 200, DB.bookings()); }
  if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, { cars: DB.allCars().length, leads: DB.leads().length, bookings: DB.bookings().length });
  if (req.method === 'GET' && url.pathname === '/api/overview') return send(res, 200, { cars: DB.allCars().length, leads: DB.leads().length, bookings: DB.bookings().length });

  // Structured lead capture (no auth — public forms write to DB).
  if (req.method === 'POST' && url.pathname === '/api/test-drive') {
    const b = await body();
    if (!b.name || !b.phone) return send(res, 400, { error: 'need name + phone' });
    DB.addBooking({ text: `TD request: ${b.name} ${b.phone} ${b.car || ''}`, channel: 'web', status: 'booked' });
    DB.addLead({ text: `test-drive ${b.name} ${b.car || ''}`, channel: 'web', intent: 'testdrive', locale: b.locale || 'en', status: 'new' });
    return send(res, 200, { ok: true, msg: 'Test-drive requested. Executive will call you.' });
  }
  if (req.method === 'POST' && url.pathname === '/api/valuation-lead') {
    const b = await body();
    if (!b.phone) return send(res, 400, { error: 'need phone' });
    DB.addLead({ text: `valuation ${b.brand || ''} ${b.year || ''} ${b.km || ''} by ${b.name || 'anon'}`, channel: 'web', intent: 'exchange', locale: b.locale || 'en', status: 'hot' });
    return send(res, 200, { ok: true, msg: 'We will send your car valuation shortly.' });
  }

  // Pages
  let p = url.pathname === '/' ? '/index.html' : url.pathname;
  if (url.pathname.startsWith('/admin')) p = '/admin.html';
  const fp = path.join(PUBLIC, p);
  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return send(res, 200, fs.readFileSync(fp), MIME[path.extname(fp)] || 'text/plain');
  return send(res, 404, { error: 'not found' });
});
const PORT = 8097;
server.listen(PORT, '0.0.0.0', () => console.log('Car Agent (DB) on ' + PORT));
