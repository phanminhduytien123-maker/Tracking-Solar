import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { generate30DaysHistory, generateIntradayProfile } from './src/services/mockDataService.js';

const app = initializeApp({
  databaseURL: 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'
});
const db = getDatabase(app);
const solarRef = ref(db, 'solar');

onValue(solarRef, (snap) => {
  const val = snap.val();
  const historyData = val.history;
  const trackingData = val.tracking;

  const historyList = generate30DaysHistory();
  const dateIndexMap = new Map();
  historyList.forEach((item, idx) => {
    dateIndexMap.set(item.date, idx);
  });

  const byDay = {};
  const intradayProfile = generateIntradayProfile();
  const intradaySlotMap = new Map();

  const now = new Date();
  const todayStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  console.log('todayStr:', todayStr);

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
        sumTrk: 0,
        sumSta: 0,
        count: 0
      };
    }
    const trk = Number(rec.wh_trk || 0);
    const sta = Number(rec.wh_sta || 0);
    byDay[dayKey].count++;
    if (trk > byDay[dayKey].maxTrk) byDay[dayKey].maxTrk = trk;
    if (sta > byDay[dayKey].maxSta) byDay[dayKey].maxSta = sta;
    byDay[dayKey].sumTrk += trk;
    byDay[dayKey].sumSta += sta;

    if (dayKey === todayStr) {
      const hour = d.getHours();
      const min = d.getMinutes();
      if (hour >= 5 && hour <= 19) {
        const slot = `${hour.toString().padStart(2, '0')}:${min < 30 ? '00' : '30'}`;
        let pTrk = Number(rec.p_trk || 0);
        let pSta = Number(rec.p_sta || 0);
        if (pTrk > 50) pTrk = pTrk / 37.0;
        if (pSta > 50) pSta = pSta / 37.0;
        intradaySlotMap.set(slot, {
          pTracking: parseFloat(pTrk.toFixed(1)),
          pStatic: parseFloat(pSta.toFixed(1))
        });
      }
    }
  });

  console.log('byDay keys:', Object.keys(byDay));
  console.log('byDay[02/11]:', byDay['02/11']);
  console.log('dateIndexMap for 02/11:', dateIndexMap.get('02/11'));
  console.log('dateIndexMap for 03/11:', dateIndexMap.get('03/11'));

  Object.values(byDay).forEach((dayInfo) => {
    const idx = dateIndexMap.get(dayInfo.date);
    if (idx !== undefined) {
      let trkWh = dayInfo.maxTrk;
      let staWh = dayInfo.maxSta;

      if (dayInfo.date === todayStr && trackingData && trackingData.dailyEnergyWh) {
        const liveTrkWh = Number(trackingData.dailyEnergyWh || 0);
        if (liveTrkWh > trkWh) trkWh = liveTrkWh;
      }

      trkWh = parseFloat(trkWh.toFixed(1));
      staWh = parseFloat(staWh.toFixed(1));
      const diffWh = parseFloat((trkWh - staWh).toFixed(1));
      const diffKwh = parseFloat(((trkWh - staWh) / 1000).toFixed(3));
      const expectedStaWh = 1.018 * staWh;
      const gain = expectedStaWh > 0 ? parseFloat((((trkWh / expectedStaWh) - 1) * 100).toFixed(1)) : 0;

      historyList[idx] = {
        ...historyList[idx],
        trackingWh: trkWh,
        trackingKwh: parseFloat((trkWh / 1000).toFixed(3)),
        staticWh: staWh,
        staticKwh: parseFloat((staWh / 1000).toFixed(3)),
        diffWh,
        diffKwh,
        gainPercent: gain
      };
    }
  });

  console.log('historyList[-2] (02/11):', historyList[historyList.length - 2]);
  console.log('historyList[-1] (03/11):', historyList[historyList.length - 1]);
  console.log('intradaySlotMap count:', intradaySlotMap.size);
  console.log('intradaySlotMap sample slots:', Array.from(intradaySlotMap.entries()).slice(0, 10));

  process.exit(0);
});
