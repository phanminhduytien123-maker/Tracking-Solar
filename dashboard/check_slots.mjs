import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

const app = initializeApp({
  databaseURL: 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'
});
const db = getDatabase(app);
const snap = await get(ref(db, 'solar/history'));
const hist = snap.val() || {};

const d2Slots = {};
const d3Slots = {};

Object.values(hist).forEach(rec => {
  if (!rec) return;
  const ts = rec.epoch_ts;
  if (!ts) return;
  const d = new Date(ts * 1000);
  const day = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  const h = d.getHours();
  const m = d.getMinutes();
  const slot = String(h).padStart(2, '0') + ':' + (m < 30 ? '00' : '30');
  
  let pTrk = Number(rec.p_trk || 0);
  let pSta = Number(rec.p_sta || 0);
  if (pTrk > 50) pTrk = pTrk / 37.0;
  if (pSta > 50) pSta = pSta / 37.0;
  
  if (day === '02/11') {
    d2Slots[slot] = { pTrk: pTrk.toFixed(1), pSta: pSta.toFixed(1) };
  } else if (day === '03/11') {
    d3Slots[slot] = { pTrk: pTrk.toFixed(1), pSta: pSta.toFixed(1) };
  }
});

console.log('02/11 slots:', d2Slots);
console.log('03/11 slots:', d3Slots);
process.exit(0);
