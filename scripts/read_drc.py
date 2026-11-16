with open('hardware/solar_tracker_diy_1layer_a6/board2_sensor_relay/drc_test.rpt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if l.startswith('**') or l.startswith('[error') or l.startswith('[warning'):
        print(l.strip())
    elif 'unconnected' in l.lower() or 'short' in l.lower():
        print(f"  {l.strip()}")

