// test.js — smoke tests for the Car Dealership Assistant (new-car primary).
const assert = require('assert');
const { run, parseIntent } = require('./agent-core');
const V = require('./valuation');

(async () => {
  assert(parseIntent('on-road price of 8 lakh car') === 'newcar', 'newcar intent');
  assert(parseIntent('exchange my 2019 Maruti 50000 km for new') === 'exchange', 'exchange intent');
  assert(parseIntent('used car under 6 lakh') === 'used', 'used intent');

  const o = run('on-road price of Hyundai i20 8 lakh', 'whatsapp', 'en');
  assert(o.steps.some(s => s.tool === 'onroad'), 'should quote on-road');
  console.log('✓ on-road:', o.steps.find(s => s.tool === 'onroad').result.slice(0, 55));

  const x = run('exchange my 2019 Maruti Swift 50000 km for new 8 lakh car', 'whatsapp', 'hi');
  assert(x.intent === 'exchange', 'exchange routed');
  console.log('✓ exchange (hi):', x.steps.find(s => s.tool === 'exchange').result.slice(0, 55));

  const u = run('used car under 6 lakh honda', 'whatsapp', 'en');
  assert(u.steps.some(s => s.tool === 'used'), 'used section works');
  console.log('✓ used section:', u.steps.find(s => s.tool === 'used').result.slice(0, 45));

  const or = V.onRoad(8);
  assert(or.totalLakh > 8 && or.totalLakh < 10, 'on-road > ex-showroom');
  console.log('✓ on-road math ok (8L ex → ₹' + or.totalLakh + 'L)');

  console.log('\nALL CAR AGENT TESTS PASSED');
  process.exit(0);
})().catch(e => { console.error('TEST FAILED:', e.message); process.exit(1); });
