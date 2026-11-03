import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import { generate30DaysHistory, generateIntradayProfile } from './src/services/mockDataService.js';

const app = initializeApp({
  databaseURL: 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'
});
const db = getDatabase(app);
const snap = await get(ref(db, 'solar/history'));
const historyData = snap.val() || {};

const allProfiles = {};
const availableDates = [];

// Base 30 days
const historyList = generate30DaysHistory();
const dateIndexMap = new Map();
historyList.forEach((item, idx) => {
  dateIndexMap.set(item.date, idx);
});

const byDay = {};

Object.entries(historyData).forEach(([tsKey, rec]) => {
  if (!rec || typeof rec !== 'object') return;
  const ts = rec.epoch_ts || Number(tsKey);
  if (!ts) return;
  const d = new Date(ts * 1000);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dayKey = `${dd}/${mm}`;

  if (!byDay[dayKey]) {
    byDay[dayKey] = {
      date: dayKey,
      maxTrk: 0,
      maxSta: 0,
      slots: new Map()
    };
  }

  const trk = Number(rec.wh_trk || 0);
  const sta = Number(rec.wh_sta || 0);
  if (trk > byDay[dayKey].maxTrk) byDay[dayKey].maxTrk = trk;
  if (sta > byDay[dayKey].maxSta) byDay[dayKey].maxSta = sta;

  const h = d.getHours();
  const m = d.getMinutes();
  if (h >= 5 && h <= 19) {
    const slot = `${String(h).padStart(2, '0')}:${m < 30 ? '00' : '30'}`;
    let pTrk = Number(rec.p_trk || 0);
    let pSta = Number(rec.p_sta || 0);
    if (pTrk > 50) pTrk = pTrk / 37.0;
    if (pSta > 50) pSta = pSta / 37.0;
    byDay[dayKey].slots.set(slot, {
      pTracking: parseFloat(pTrk.toFixed(1)),
      pStatic: parseFloat(pSta.toFixed(1))
    });
  }
});

Object.entries(byDay).forEach(([dayKey, dayInfo]) => {
  const profile = generateIntradayProfile();
  profile.forEach(pt => {
    if (dayInfo.slots.has(pt.time)) {
      const s = dayInfo.slots.get(pt.time);
      pt.pTracking = s.pTracking;
      pt.pStatic = s.pStatic;
      const exp = 1.018 * s.pStatic;
      pt.gain = exp > 0 ? parseFloat((((s.pTracking / exp) - 1) * 100).toFixed(1)) : 0;
    }
  });
  allProfiles[dayKey] = profile;
  availableDates.push(dayKey);
});

console.log('Available dates with intraday profiles:', availableDates);
console.log('03/11 11:30 slot in profile:', allProfiles['03/11']?.find(p => p.time === '11:30'));
console.log('03/11 12:00 slot in profile:', allProfiles['03/11']?.find(p => p.time === '12:00'));
console.log('03/11 16:30 slot in profile:', allProfiles['03/11']?.find(p => p.time === '16:30'));
process.exit(0);
