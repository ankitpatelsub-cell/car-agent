// agent-core.js — Car Dealership Assistant (multi-brand, India, EN/हिंदी).
const mem = require('./memory');
const V = require('./valuation');
const I18N = {
  en: { think: 'analyzing', buy: 'Matching stock', sell: 'Indicative valuation', td: 'Test-drive booked', fin: 'EMI estimate', docs: 'RC transfer checklist', follow: 'Follow-up scheduled', val: 'est. value' },
  hi: { think: 'विश्लेषण', buy: 'स्टॉक मिलान', sell: 'अनुमानित मूल्य', td: 'टेस्ट-ड्राइव बुक', fin: 'EMI अनुमान', docs: 'RC ट्रांसफर चेकलिस्ट', follow: 'फॉलो-अप शेड्यूल', val: 'अनुमानित मूल्य' },
};
function parseIntent(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('value') || t.includes('कितने') || t.includes('मूल्य') || t.includes('बेच') || t.includes('sell') || t.includes('price')) return 'sell';
  if (t.includes('emi') || t.includes('लोन') || t.includes('किश्त') || t.includes('finance')) return 'finance';
  if (t.includes('test') || t.includes('ड्राइव') || t.includes('देख') || t.includes('बुक')) return 'testdrive';
  if (t.includes('rc') || t.includes('डॉक्यूमेंट') || t.includes('कागज') || t.includes('transfer') || t.includes('पेपर')) return 'docs';
  if (t.includes('खरीद') || t.includes('चाहिए') || t.includes('buy') || t.includes('want') || t.includes('need')) return 'buy';
  return 'buy';
}
function run(text, channel = 'whatsapp', locale = 'en') {
  const L = I18N[locale] || I18N.en;
  const intent = parseIntent(text);
  const steps = [{ tool: 'think', result: '(' + L.think + ') ' + channel + ' → intent: ' + intent }];

  if (intent === 'sell') {
    const m = text.toLowerCase().match(/(\w+)\s+(\w+)?\s*(\d{4})/);
    const brand = (text.match(/maruti|suzuki|toyota|honda|hyundai|tata|mahindra|kia|volkswagen|skoda|ford|renault|nissan/i) || ['maruti'])[0];
    const year = (text.match(/\b(19|20)\d{2}\b/) || [2020])[0];
    const km = (text.match(/(\d{2,3})\s?k\s?km/) || [40000])[0];
    const ex = 8;
    const v = V.valueCar({ brand, years: Math.max(0, new Date().getFullYear() - (+year)), km: parseInt(km) || 40000, exShowroomLakh: ex });
    steps.push({ tool: 'value', result: `${brand} ${year} (${km} km): ₹${(v.low / 1e5).toFixed(2)}L–₹${(v.high / 1e5).toFixed(2)}L (${L.val} ₹${(v.value / 1e5).toFixed(2)}L)` });
    steps.push({ tool: 'explain', result: v.basis.join(' | ') });
    mem.addLead({ text, channel, intent, locale });
  }
  else if (intent === 'buy') {
    const brand = (text.match(/maruti|suzuki|toyota|honda|hyundai|tata|mahindra|kia|volkswagen|skoda|ford|renault|nissan/i) || [null])[0];
    const budget = (text.match(/(\d+)\s?lakh/) || [null]);
    const list = V.matchStock({ brand, budgetLakh: budget ? +budget[1] : null });
    if (list.length) {
      steps.push({ tool: 'match', result: L.buy + ': ' + list.slice(0, 3).map(c => `${c.id} ${c.brand} ${c.model} ${c.year} ₹${(c.price / 1e5).toFixed(2)}L`).join('; ') });
    } else steps.push({ tool: 'match', result: 'No exact stock — I will source it. Sending to procurement.' });
    mem.addLead({ text, channel, intent, locale });
  }
  else if (intent === 'finance') {
    const budget = (text.match(/(\d+)\s?lakh/) || [6]);
    const e = V.emi(budget ? +budget[1] : 6);
    steps.push({ tool: 'finance', result: `${L.fin}: ₹${(e.down / 1e5).toFixed(2)}L down + ₹${(e.emi / 1e3).toFixed(0)}k/month ×36 @9.5% (total ₹${(e.total / 1e5).toFixed(2)}L)` });
    mem.addLead({ text, channel, intent, locale });
  }
  else if (intent === 'testdrive') {
    const b = mem.addBooking({ text, channel });
    steps.push({ tool: 'testdrive', result: L.td + ' ' + b.id + ' — our executive will call to confirm slot' });
    mem.addFollowup({ lead: b.id, min: 30 });
    steps.push({ tool: 'follow', result: L.follow });
  }
  else if (intent === 'docs') {
    steps.push({ tool: 'docs', result: L.docs + ': 1) Form 29 (seller) 2) Form 30 (buyer) 3) RC 4) Insurance 5) PUC 6) NOC (if interstate) 7) Loan closure letter' });
  }
  steps.push({ tool: 'done', result: 'OK' });
  mem.pushTrace({ type: 'task', intent, channel });
  return { steps, intent };
}

module.exports = { run, parseIntent };
