with open('hardware/solar_tracker_diy_1layer_a6/board2_sensor_relay/drc_test.rpt', 'r', encoding='utf-8') as f:
    text = f.read()

import re
violations = re.split(r'\n\[', text)
for v in violations[1:]:
    header = v[:v.find(']')]
    if any(k in header for k in ['short', 'unconnected', 'dangling']):
        print(f"[{v.strip()}\n" + "-"*40)

