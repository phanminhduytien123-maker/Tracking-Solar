import re

with open('hardware/solar_tracker_diy_1layer_a6/board2_sensor_relay/board2_sensor_relay.kicad_pcb', 'r', encoding='utf-8') as f:
    c = f.read()

# find nets
net_map = {}
for m in re.finditer(r'\(net\s+(\d+)\s+\"([^\"]+)\"\)', c):
    net_map[int(m.group(1))] = m.group(2)

print("--- J_BUS_LINK2 & U_LM2596_ESP2 area tracks ---")
tracks = re.findall(r'\(segment\s+\(start\s+([\d\.\-]+)\s+([\d\.\-]+)\)\s+\(end\s+([\d\.\-]+)\s+([\d\.\-]+)\)\s+\(width\s+([\d\.\-]+)\)\s+\(layer\s+\"([^\"]+)\"\)\s+\(net\s+(\d+)\)\)', c)
for x1, y1, x2, y2, w, lay, net in tracks:
    x1, y1, x2, y2 = float(x1), float(y1), float(x2), float(y2)
    net_name = net_map.get(int(net), f"net{net}")
    if any(k in net_name for k in ['3.3V_ESP1', '12V_BAT', '3.3V_ESP2', 'RAW_VOC_STA']):
        print(f"  {net_name:15} | ({x1:>5.1f}, {y1:>5.1f}) -> ({x2:>5.1f}, {y2:>5.1f}) on {lay} w={w}")

