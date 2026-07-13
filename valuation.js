// valuation.js — India used-car indicative valuation + inventory matching.
// Heuristic grounded in Indian resale patterns (brand resale, fuel, age, km).
// NOT a live pricing API — transparent, explainable estimates a dealer can tune.

// Brand resale strength (1.0 = average). Maruti/Toyota/Honda hold value; others depreciate faster.
const BRAND_RESALE = {
  maruti: 1.08, suzuki: 1.08, toyota: 1.10, honda: 1.05, hyundai: 1.0, tata: 0.92,
  mahindra: 0.98, kia: 0.97, volkswagen: 0.9, skoda: 0.88, ford: 0.85, renault: 0.9, nissan: 0.9,
};
// Fuel multiplier
const FUEL = { petrol: 1.0, diesel: 1.02, cng: 0.95, electric: 1.08, hybrid: 1.06 };

// Age-based depreciation curve (%) of ex-showroom retained value by year.
function ageFactor(years) {
  if (years <= 0) return 0.92;
  if (years === 1) return 0.80;
  if (years === 2) return 0.70;
  if (years === 3) return 0.62;
  if (years === 4) return 0.55;
  if (years === 5) return 0.48;
  if (years <= 7) return 0.40;
  if (years <= 10) return 0.30;
  return 0.20;
}
// KM penalty: every 20k over 50k shaves ~3%
function kmFactor(km) { return Math.max(0.8, 1 - Math.max(0, km - 50000) / 20000 * 0.03); }

// exShowroom in INR lakhs; years, km. Returns { value, low, high, basis[] }.
function valueCar({ brand, fuel = 'petrol', years = 3, km = 40000, exShowroomLakh = 8 }) {
  const b = BRAND_RESALE[(brand || '').toLowerCase()] || 1.0;
  const f = FUEL[(fuel || 'petrol').toLowerCase()] || 1.0;
  const base = exShowroomLakh * 1e5 * ageFactor(years) * b * f * kmFactor(km);
  const low = Math.round((base * 0.92) / 1000) * 1000;
  const high = Math.round((base * 1.08) / 1000) * 1000;
  const basis = [
    `ब्रांड रीसेल: ${brand} ×${b}`,
    `ईंधन: ${fuel} ×${f}`,
    `उम्र ${years} साल → ${(ageFactor(years) * 100).toFixed(0)}% मूल्य`,
    `किमी ${km} → किमी फैक्टर ${kmFactor(km).toFixed(2)}`,
  ];
  return { value: Math.round(base / 1000) * 1000, low, high, basis };
}

// Simple in-memory inventory (dealer seeds via /api/stock). Matches by brand/model/budget.
let INVENTORY = [
  { id: 'C001', brand: 'maruti', model: 'Swift', year: 2021, fuel: 'petrol', km: 28000, price: 540000, city: 'Ahmedabad' },
  { id: 'C002', brand: 'hyundai', model: 'i20', year: 2020, fuel: 'diesel', km: 41000, price: 610000, city: 'Ahmedabad' },
  { id: 'C003', brand: 'toyota', model: 'Innova', year: 2019, fuel: 'diesel', km: 88000, price: 980000, city: 'Ahmedabad' },
  { id: 'C004', brand: 'honda', model: 'City', year: 2022, fuel: 'petrol', km: 19000, price: 870000, city: 'Ahmedabad' },
  { id: 'C005', brand: 'tata', model: 'Nexon', year: 2021, fuel: 'electric', km: 22000, price: 1090000, city: 'Ahmedabad' },
  { id: 'C006', brand: 'maruti', model: 'Brezza', year: 2020, fuel: 'petrol', km: 47000, price: 750000, city: 'Ahmedabad' },
];

function matchStock({ brand, model, budgetLakh, fuel }) {
  let list = INVENTORY.slice();
  if (brand) list = list.filter(c => c.brand === brand.toLowerCase());
  if (model) list = list.filter(c => c.model.toLowerCase().includes(model.toLowerCase()));
  if (fuel) list = list.filter(c => c.fuel === fuel.toLowerCase());
  if (budgetLakh) list = list.filter(c => c.price <= budgetLakh * 1e5 * 1.1);
  return list.sort((a, b) => a.price - b.price);
}
function addStock(car) { const c = { id: 'C' + String(INVENTORY.length + 1).padStart(3, '0'), ...car }; INVENTORY.push(c); return c; }
// EMI estimate: 20% down, 9.5% p.a., 36 months.
function emi(principalLakh, months = 36, rate = 9.5) {
  const p = principalLakh * 1e5; const r = rate / 12 / 100;
  const e = p * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
  return { emi: Math.round(e), total: Math.round(e * months), down: Math.round(p * 0.2) };
}
// On-road price for a NEW car (India): ex-showroom + RTO + insurance + TCS.
function onRoad(exShowroomLakh, state = 'GJ') {
  const ex = exShowroomLakh * 1e5;
  const rto = ex * 0.09;           // ~9% RTO (varies by state)
  const ins = ex * 0.04;           // ~4% 1st-yr insurance
  const tcs = ex * 0.01;           // 1% TCS over 10L
  const total = ex + rto + ins + tcs;
  return { ex, rto: Math.round(rto), ins: Math.round(ins), tcs: Math.round(tcs), total: Math.round(total), totalLakh: +(total / 1e5).toFixed(2) };
}
// Exchange: value old car, apply as down-payment credit toward new on-road.
function exchange(oldCar, newExShowroomLakh) {
  const ov = valueCar(oldCar).value;
  const nr = onRoad(newExShowroomLakh);
  const net = nr.total - ov;
  const emiCalc = net > 0 ? emi(net / 1e5) : { emi: 0, down: 0, total: 0 };
  return { oldValue: ov, newOnRoad: nr.total, netPayable: Math.max(0, net), emi: emiCalc };
}

module.exports = { valueCar, matchStock, addStock, emi, onRoad, exchange, INVENTORY: () => INVENTORY };
