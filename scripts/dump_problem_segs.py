import re

with open('hardware/solar_tracker_diy_1layer_a6/board2_sensor_relay/board2_sensor_relay.kicad_pcb', 'r', encoding='utf-8') as f:
    c = f.read()

# find segments for net /+3.3V_ESP1, /+12V_BAT, /+3.3V_ESP2, /RAW_VOC_STA
segs = re.findall(r'\(segment\s+\(start\s+([\d\.\-]+)\s+([\d\.\-]+)\)\s+\(end\s+([\d\.\-]+)\s+([\d\.\-]+)\)\s+\(width\s+([\d\.\-]+)\)\s+\(layer\s+\"([^\"]+)\"\)\s+\(net\s+\"([^\"]+)\"\)[\s\S]*?\)', c)

for x1, y1, x2, y2, w, lay, net in segs:
    x1, y1, x2, y2 = float(x1), float(y1), float(x2), float(y2)
    if any(k in net for k in ['3.3V_ESP1', '12V_BAT', '3.3V_ESP2', 'RAW_VOC_STA']):
        print(f"{net:15} | ({x1:>5.2f}, {y1:>5.2f}) -> ({x2:>5.2f}, {y2:>5.2f}) on {lay} w={w}")

