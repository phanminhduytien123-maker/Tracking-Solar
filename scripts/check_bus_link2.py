import re

with open('hardware/solar_tracker_diy_1layer_a6/board2_sensor_relay/board2_sensor_relay.kicad_pcb', 'r', encoding='utf-8') as f:
    c = f.read()

segs = re.findall(r'\(segment\s+\(start\s+([\d\.\-]+)\s+([\d\.\-]+)\)\s+\(end\s+([\d\.\-]+)\s+([\d\.\-]+)\)\s+\(width\s+([\d\.\-]+)\)\s+\(layer\s+\"([^\"]+)\"\)\s+\(net\s+\"([^\"]+)\"\)[\s\S]*?\)', c)

for x1, y1, x2, y2, w, lay, net in segs:
    x1, y1, x2, y2 = float(x1), float(y1), float(x2), float(y2)
    if lay == 'B.Cu' and (18 <= x1 <= 26 or 18 <= x2 <= 26) and (28 <= y1 <= 38 or 28 <= y2 <= 38):
        print(f"B.Cu track: {net} from ({x1}, {y1}) to ({x2}, {y2})")

# also check pads of J_BUS_LINK2
tokens = re.split(r'\n\s*\(footprint\s+', c)
for t in tokens:
    if 'J_BUS_LINK2' in t:
        print("J_BUS_LINK2 footprint:")
        for line in t.splitlines()[:20]:
            print(" ", line)

