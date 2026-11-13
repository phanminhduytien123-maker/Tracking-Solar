import json
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime

# Load real history data
with open('scratch/history_backup_nov11_nov12.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Sort by timestamp
items = []
for k, v in data.items():
    ts = int(v.get('epoch_ts', k))
    dt = datetime.fromtimestamp(ts)
    # Filter for daylight hours on Nov 11, 2026 (approx 06:00 to 18:00)
    items.append({
        'dt': dt,
        'ts': ts,
        'p_trk': float(v.get('p_trk', 0.0)),
        'p_sta': float(v.get('p_sta', 0.0)),
        'v_trk': float(v.get('v_trk', 0.0)),
        'v_sta': float(v.get('v_sta', 0.0)),
        'i_trk': float(v.get('i_trk', 0.0)),
        'i_sta': float(v.get('i_sta', 0.0)),
        'wh_trk': float(v.get('wh_trk', 0.0)),
        'wh_sta': float(v.get('wh_sta', 0.0)),
        'temp': float(v.get('rtc_temp', 30.0))
    })

items.sort(key=lambda x: x['ts'])
print(f'Total points sorted: {len(items)}')

# Filter day 1 (Nov 11) between 06:30 and 17:30
day1 = [x for x in items if x['dt'].day == 11 and 6 <= x['dt'].hour <= 18]
if not day1:
    day1 = items[:500]

times = [x['dt'] for x in day1]
p_trk = [x['p_trk'] for x in day1]
p_sta = [x['p_sta'] for x in day1]
wh_trk = [x['wh_trk'] for x in day1]
wh_sta = [x['wh_sta'] for x in day1]

# Set plot style
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
fig, ax = plt.subplots(figsize=(10, 5), dpi=200)

ax.plot(times, p_trk, label='Giàn pin 2 trục (Tracking Panel - Fuzzy/PSO)', color='#e67e22', linewidth=2.0)
ax.plot(times, p_sta, label='Tấm pin cố định (Fixed Panel - Nam 180°, nghiêng 15°)', color='#2980b9', linewidth=2.0, linestyle='--')

ax.set_title('Đồ thị so sánh công suất tức thời giữa Giàn pin 2 trục và Tấm pin cố định', fontsize=12, fontweight='bold', pad=12)
ax.set_xlabel('Thời gian trong ngày (Giờ:Phút)', fontsize=10)
ax.set_ylabel('Công suất (W)', fontsize=10)
ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
ax.legend(loc='upper right', frameon=True)
ax.grid(True, linestyle=':', alpha=0.6)
plt.tight_layout()
chart_p_path = 'scratch/chart_power_comparison.png'
plt.savefig(chart_p_path)
plt.close()
print(f'Saved {chart_p_path}')

# 2. Cumulative Energy Chart
fig, ax = plt.subplots(figsize=(10, 5), dpi=200)
ax.plot(times, wh_trk, label='Năng lượng tích lũy Giàn bám 2 trục (Wh)', color='#27ae60', linewidth=2.2)
ax.plot(times, wh_sta, label='Năng lượng tích lũy Tấm cố định (Wh)', color='#7f8c8d', linewidth=2.0, linestyle='--')
ax.set_title('Đồ thị năng lượng tích lũy thực nghiệm (Wh) theo thời gian', fontsize=12, fontweight='bold', pad=12)
ax.set_xlabel('Thời gian trong ngày (Giờ:Phút)', fontsize=10)
ax.set_ylabel('Năng lượng tích lũy (Wh)', fontsize=10)
ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
ax.legend(loc='upper left', frameon=True)
ax.grid(True, linestyle=':', alpha=0.6)
plt.tight_layout()
chart_wh_path = 'scratch/chart_energy_wh_accumulation.png'
plt.savefig(chart_wh_path)
plt.close()
print(f'Saved {chart_wh_path}')

