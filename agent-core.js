// agent-core.js — Car Dealership Assistant (NEW-car primary, used as exchange/CPO section).
const mem = require('./memory');
const V = require('./valuation');
const I18N = {
  en: { think: 'analyzing', newcar: 'New car on-road', exchange: 'Exchange offer', used: 'Used-car section', td: 'Test-drive booked', fin: 'EMI estimate', docs: 'RC/paperwork', follow: 'Follow-up scheduled', offer: 'Current offers' },
  hi: { think: 'विश्लेषण', newcar: 'नई कार ऑन-रोड', exchange: 'एक्सचेंज ऑफर', used: 'पुरानी कार सेक्शन', td: 'टेस्ट-ड्राइव बुक', fin: 'EMI अनुमान', docs: 'कागज़ात', follow: 'फॉलो-अप', offer: 'चालू ऑफर' },
};
function parseIntent(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('exchange') || t.includes('एक्सचेंज') || t.includes('trade') || t.includes('बदल') || t.includes('पुरानी') || t.includes('old car')) return 'exchange';
  if (t.includes('on-road') || t.includes('ऑन-रोड') || t.includes('onroad') || t.includes('ex-showroom') || t.includes('दाम') || t.includes('price') || t.includes('कीमत')) return 'newcar';
  if (t.includes('emi') || t.includes('लोन') || t.includes('किश्त') || t.includes('finance')) return 'finance';
  if (t.includes('used') || t.includes('पुरानी कार') || t.includes('second') || t.includes('cpo') || t.includes('सर्टिफाइड')) return 'used';
  if (t.includes('offer') || t.includes('ऑफर') || t.includes('discount') || t.includes('छूट')) return 'offer';
  if (t.includes('test') || t.includes('ड्राइव') || t.includes('बुक') || t.includes('बुकिंग')) return 'testdrive';
  if (t.includes('rc') || t.includes('डॉक्यूमेंट') || t.includes('कागज') || t.includes('transfer') || t.includes('पेपर')) return 'docs';
  if (t.includes('खरीद') || t.includes('चाहिए') || t.includes('buy') || t.includes('want') || t.includes('need')) return 'newcar';
  return 'newcar';
}
function exLakh(text) { const m = text.match(/(\d+(?:\.\d+)?)\s?lakh/); return m ? +m[1] : null; }
function brandOf(text) { const m = text.match(/maruti|suzuki|toyota|honda|hyundai|tata|mahindra|kia|volkswagen|skoda|ford|renault|nissan|mg|citroen/i); return m ? m[0] : null; }

function run(text, channel = 'whatsapp', locale = 'en') {
  const L = I18N[locale] || I18N.en;
  const intent = parseIntent(text);
  const steps = [{ tool: 'think', result: '(' + L.think + ') ' + channel + ' → intent: ' + intent }];
  const ex = exLakh(text);

  if (intent === 'newcar') {
    const brand = brandOf(text);
    if (ex) {
      const o = V.onRoad(ex);
      steps.push({ tool: 'onroad', result: `${L.newcar} ₹${ex}L ex → on-road ₹${o.totalLakh}L (RTO ₹${(o.rto/1e5).toFixed(2)}L, ins ₹${(o.ins/1e5).toFixed(2)}L)` });
    } else {
      steps.push({ tool: 'onroad', result: `${brand ? brand + ' ' : ''}new car: share ex-showroom lakh for on-road price` });
    }
    mem.addLead({ text, channel, intent, locale });
  }
  else if (intent === 'exchange') {
    // old car valuation + credit toward new
    const oldBrand = brandOf(text) || 'maruti';
    const oldYear = (text.match(/\b(19|20)\d{2}\b/) || [2019])[0];
    const oldKm = (text.match(/(\d{2,3})\s?k\s?km/) || [50000])[0];
    const newEx = ex || 8;
    const x = V.exchange({ brand: oldBrand, years: Math.max(0, new Date().getFullYear() - (+oldYear)), km: parseInt(oldKm) || 50000 }, newEx);
    steps.push({ tool: 'exchange', result: `${L.exchange}: old ${oldBrand} ${oldYear} ≈ ₹${(x.oldValue/1e5).toFixed(2)}L credit → new on-road ₹${(x.newOnRoad/1e5).toFixed(2)}L, net ₹${(x.netPayable/1e5).toFixed(2)}L` });
    if (x.emi.emi) steps.push({ tool: 'finance', result: `EMI ₹${(x.emi.emi/1e3).toFixed(0)}k/mo ×36 after exchange` });
    mem.addLead({ text, channel, intent, locale });
  }
  else if (intent === 'used') {
    const brand = brandOf(text);
    const list = V.matchStock({ brand, budgetLakh: ex });
    steps.push({ tool: 'used', result: list.length ? (L.used + ': ' + list.slice(0,3).map(c=>`${c.id} ${c.brand} ${c.model} ${c.year} ₹${(c.price/1e5).toFixed(2)}L`).join('; ')) : (L.used + ': certified stock coming — share budget') });
    mem.addLead({ text, channel, intent, locale });
  }
  else if (intent === 'offer') {
    steps.push({ tool: 'offer', result: `${L.offer}: festive exchange bonus up to ₹25k, 0% ROI for 6 mo (select models), free 1-yr RSA` });
  }
  else if (intent === 'finance') {
    const e = V.emi(ex || 8);
    steps.push({ tool: 'finance', result: `${L.fin}: ₹${(e.down/1e5).toFixed(2)}L down + ₹${(e.emi/1e3).toFixed(0)}k/mo ×36 @9.5% (total ₹${(e.total/1e5).toFixed(2)}L)` });
    mem.addLead({ text, channel, intent, locale });
  }
  else if (intent === 'testdrive') {
    const b = mem.addBooking({ text, channel });
    steps.push({ tool: 'testdrive', result: `${L.td} ${b.id} — executive will call to confirm slot` });
    mem.addFollowup({ lead: b.id, min: 30 });
    steps.push({ tool: 'follow', result: L.follow });
  }
  else if (intent === 'docs') {
    steps.push({ tool: 'docs', result: `${L.docs}: New: invoice, RC, insurance, fastag, TCS. Exchange: + Form 29/30 of old car, NOC if interstate` });
  }
  steps.push({ tool: 'done', result: 'OK' });
  mem.pushTrace({ type: 'task', intent, channel });
  return { steps, intent };
}

module.exports = { run, parseIntent };
