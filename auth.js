// auth.js — minimal stateless token auth for the car-agent admin.
const crypto = require('crypto');
const SECRET = process.env.ADMIN_SECRET || 'dev-only-change-me';

// Token = base64(ts) + '.' + HMAC(ts, SECRET). Valid 12h.
function makeToken() {
  const ts = Date.now().toString();
  const sig = crypto.createHmac('sha256', SECRET).update(ts).digest('hex');
  return Buffer.from(ts).toString('base64url') + '.' + sig;
}
function checkToken(tok) {
  if (!tok) return false;
  const [tsB64, sig] = tok.split('.');
  if (!tsB64 || !sig) return false;
  const ts = Buffer.from(tsB64, 'base64url').toString();
  const expect = crypto.createHmac('sha256', SECRET).update(ts).digest('hex');
  if (sig !== expect) return false;
  if (Date.now() - (+ts) > 12 * 3600 * 1000) return false; // 12h expiry
  return true;
}
function checkPass(p) {
  const want = process.env.ADMIN_PASS || 'admin123';
  return typeof p === 'string' && p === want;
}
module.exports = { makeToken, checkToken, checkPass };
