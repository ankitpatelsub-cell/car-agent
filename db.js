// db.js — SQLite data layer for the Car Dealership Assistant.
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'dealership.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT, model TEXT, year INTEGER, fuel TEXT,
    km INTEGER, price INTEGER, city TEXT, status TEXT DEFAULT 'available',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT, channel TEXT, intent TEXT, locale TEXT, status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT, channel TEXT, status TEXT DEFAULT 'booked',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead TEXT, when_ts INTEGER, done INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed inventory once.
const count = db.prepare('SELECT COUNT(*) c FROM cars').get().c;
if (count === 0) {
  const ins = db.prepare('INSERT INTO cars (brand, model, year, fuel, km, price, city) VALUES (?,?,?,?,?,?,?)');
  const seed = [
    ['maruti','Swift',2021,'petrol',28000,540000,'Ahmedabad'],
    ['hyundai','i20',2020,'diesel',41000,610000,'Ahmedabad'],
    ['toyota','Innova',2019,'diesel',88000,980000,'Ahmedabad'],
    ['honda','City',2022,'petrol',19000,870000,'Ahmedabad'],
    ['tata','Nexon',2021,'electric',22000,1090000,'Ahmedabad'],
    ['maruti','Brezza',2020,'petrol',47000,750000,'Ahmedabad'],
    ['kia','Seltos',2022,'petrol',15000,1290000,'Ahmedabad'],
    ['mahindra','XUV700',2023,'diesel',12000,1690000,'Ahmedabad'],
  ];
  const tx = db.transaction(rows => rows.forEach(r => ins.run(...r)));
  tx(seed);
}

function allCars() { return db.prepare("SELECT * FROM cars WHERE status='available' ORDER BY price").all(); }
function matchCars({ brand, model, budgetLakh, fuel }) {
  let q = "SELECT * FROM cars WHERE status='available'"; const p = [];
  if (brand) { q += ' AND lower(brand)=?'; p.push(brand.toLowerCase()); }
  if (model) { q += ' AND lower(model) LIKE ?'; p.push('%' + model.toLowerCase() + '%'); }
  if (fuel) { q += ' AND lower(fuel)=?'; p.push(fuel.toLowerCase()); }
  if (budgetLakh) { q += ' AND price <= ?'; p.push(budgetLakh * 1e5 * 1.1); }
  q += ' ORDER BY price';
  return db.prepare(q).all(...p);
}
function addCar(c) { return db.prepare('INSERT INTO cars (brand,model,year,fuel,km,price,city) VALUES (?,?,?,?,?,?,?)').run(c.brand,c.model,c.year,c.fuel,c.km,c.price,c.city); }
function delCar(id) { return db.prepare('UPDATE cars SET status="sold" WHERE id=?').run(id); }
function addLead(l) { return db.prepare('INSERT INTO leads (text,channel,intent,locale,status) VALUES (?,?,?,?,?)').run(l.text,l.channel,l.intent,l.locale,l.status||'new'); }
function addBooking(b) { return db.prepare('INSERT INTO bookings (text,channel,status) VALUES (?,?,?)').run(b.text,b.channel,b.status||'booked'); }
function addFollowup(f) { return db.prepare('INSERT INTO followups (lead,when_ts,done) VALUES (?,?,0)').run(f.lead, f.when_ts); }
function leads() { return db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 50').all(); }
function bookings() { return db.prepare('SELECT * FROM bookings ORDER BY id DESC LIMIT 50').all(); }

module.exports = { db, allCars, matchCars, addCar, delCar, addLead, addBooking, addFollowup, leads, bookings };
