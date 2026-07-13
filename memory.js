// memory.js — car dealership agent state (leads, bookings, followups).
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'memory.json');
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return { leads: [], bookings: [], followups: [], trace: [] }; } }
let state = load();
function save() { fs.writeFileSync(FILE, JSON.stringify(state, null, 2)); }
function addLead(l) { const e = { id: 'L' + String(state.leads.length + 1).padStart(3, '0'), ...l, ts: new Date().toISOString(), status: 'new' }; state.leads.push(e); save(); return e; }
function addBooking(b) { const e = { id: 'TD' + String(state.bookings.length + 1).padStart(3, '0'), ...b, ts: new Date().toISOString(), status: 'booked' }; state.bookings.push(e); save(); return e; }
function addFollowup(f) { const e = { id: 'FU' + String(state.followups.length + 1).padStart(3, '0'), ...f, when: Date.now() + (f.min || 30) * 60000, done: false, ts: new Date().toISOString() }; state.followups.push(e); save(); return e; }
function pushTrace(e) { state.trace.unshift({ ts: new Date().toISOString(), ...e }); if (state.trace.length > 200) state.trace = state.trace.slice(0, 200); save(); }
function getState() { return state; }
module.exports = { addLead, addBooking, addFollowup, pushTrace, getState };
