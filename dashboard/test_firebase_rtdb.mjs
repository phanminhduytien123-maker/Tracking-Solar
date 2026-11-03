import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';

const app = initializeApp({
  databaseURL: 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'
});
const db = getDatabase(app);
const solarRef = ref(db, 'solar');

console.log('Connecting to Firebase...');
onValue(solarRef, (snap) => {
  const val = snap.val();
  console.log('val keys:', val ? Object.keys(val) : 'null');
  console.log('has history?:', val && !!val.history);
  if (val && val.history) {
    console.log('history keys count:', Object.keys(val.history).length);
  }
  process.exit(0);
}, (err) => {
  console.error('onValue error:', err);
  process.exit(1);
});
