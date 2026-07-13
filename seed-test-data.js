// seed-test-data.js — load realistic test inventory + sample leads into the car DB.
const DB = require('./db');
// Clear existing test stock first (keep schema).
DB.db.exec("UPDATE cars SET status='sold' WHERE status='available';");
const stock = [
  // NEW cars (showroom demo stock) and CERTIFIED USED
  ['maruti','Swift',2024,'petrol',12000,649000,'Ahmedabad'],
  ['maruti','Baleno',2023,'petrol',18000,789000,'Ahmedabad'],
  ['hyundai','i20',2024,'petrol',9000,829000,'Ahmedabad'],
  ['hyundai','Creta',2023,'diesel',24000,1390000,'Ahmedabad'],
  ['toyota','Innova Crysta',2022,'diesel',38000,1890000,'Ahmedabad'],
  ['honda','City',2024,'petrol',8000,1190000,'Ahmedabad'],
  ['tata','Nexon',2023,'electric',21000,1240000,'Ahmedabad'],
  ['tata','Punch',2024,'petrol',6000,749000,'Ahmedabad'],
  ['kia','Seltos',2023,'petrol',17000,1390000,'Ahmedabad'],
  ['mahindra','XUV700',2024,'diesel',11000,1990000,'Ahmedabad'],
  ['maruti','Brezza',2022,'petrol',33000,950000,'Ahmedabad'],     // certified used
  ['honda','Amaze',2021,'petrol',41000,680000,'Gandhinagar'],     // certified used
  ['hyundai','Venue',2021,'petrol',44000,790000,'Gandhinagar'],   // certified used
  ['toyota','Fortuner',2020,'diesel',62000,2890000,'Ahmedabad'],  // certified used
];
const ins = DB.db.prepare('INSERT INTO cars (brand,model,year,fuel,km,price,city) VALUES (?,?,?,?,?,?,?)');
const tx = DB.db.transaction(rows => rows.forEach(r => ins.run(...r)));
tx(stock);
// Sample leads
const leadIns = DB.db.prepare("INSERT INTO leads (text,channel,intent,locale,status) VALUES (?,?,?,?,?)");
[
  ['exchange my 2019 Maruti Swift 50000 km for new Baleno','whatsapp','exchange','en','new'],
  ['on-road price of Hyundai Creta 14 lakh','web','newcar','en','new'],
  ['used car under 6 lakh honda','web','used','en','new'],
  ['बुक टेस्ट ड्राइव for Tata Nexon','whatsapp','testdrive','hi','new'],
  ['emi for 12 lakh car','web','finance','en','new'],
  ['exchange my 2020 Fortuner for new XUV700','whatsapp','exchange','en','hot'],
].forEach(l => leadIns.run(...l));
console.log('Seeded', stock.length, 'cars + 6 leads.');
console.log('Available cars:', DB.allCars().length);
