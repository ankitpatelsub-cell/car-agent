// test.js — smoke tests for the Car Dealership Assistant.
const assert = require('assert');
const { run, parseIntent } = require('./agent-core');
const V = require('./valuation');

(async () => {
  assert(parseIntent('value my Maruti Swift') === 'sell', 'sell intent');
  assert(parseIntent('I want Honda City 5 lakh') === 'buy', 'buy intent');
  assert(parseIntent('EMI for 6 lakh') === 'finance', 'finance intent');

  const r = run('value my 2020 Maruti Swift 40000 km', 'whatsapp', 'en');
  assert(r.steps.some(s => s.tool === 'value'), 'should value');
  console.log('✓ valuation:', r.steps.find(s => s.tool === 'value').result.slice(0, 50));

  const b = run('I want Honda City, 5 lakh budget', 'whatsapp', 'hi');
  assert(r.intent === 'sell' && b.intent === 'buy', 'intents differ');
  console.log('✓ buy match (hi):', b.steps.find(s => s.tool === 'match').result.slice(0, 50));

  const v = V.valueCar({ brand: 'toyota', years: 3, km: 60000, exShowroomLakh: 12 });
  assert(v.value > 0, 'value positive');
  console.log('✓ valuation math ok (Toyota 3y:', '₹' + (v.value / 1e5).toFixed(2) + 'L)');

  console.log('\nALL CAR AGENT TESTS PASSED');
  process.exit(0);
})().catch(e => { console.error('TEST FAILED:', e.message); process.exit(1); });
