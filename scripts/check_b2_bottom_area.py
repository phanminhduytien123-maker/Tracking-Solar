import re

with open('hardware/solar_tracker_diy_1layer_a6/board2_sensor_relay/board2_sensor_relay.kicad_pcb', 'r', encoding='utf-8') as f:
    c = f.read()

# check footprints and tracks between y=140 and y=150, x=10 to x=60
fps = re.findall(r'\(footprint\s+\"([^\"]+)\"[\s\S]*?\(property\s+\"Reference\"\s+\"([^\"]+)\"[\s\S]*?\(at\s+([\d\.\-]+)\s+([\d\.\-]+)', c)
for fp, ref, x, y in fps:
    x, y = float(x), float(y)
    if 138 <= y <= 155 and 10 <= x <= 65:
        print(f"FP: {ref} at ({x}, {y}) [{fp}]")

# check tracks in that area
segs = re.findall(r'\(segment\s+\(start\s+([\d\.\-]+)\s+([\d\.\-]+)\)\s+\(end\s+([\d\.\-]+)\s+([\d\.\-]+)\)\s+\(width\s+([\d\.\-]+)\)\s+\(layer\s+\"([^\"]+)\"\)\s+\(net\s+\"([^\"]+)\"\)[\s\S]*?\)', c)
for x1, y1, x2, y2, w, lay, net in segs:
    x1, y1, x2, y2 = float(x1), float(y1), float(x2), float(y2)
    if (138 <= y1 <= 155 or 138 <= y2 <= 155) and (10 <= x1 <= 65 or 10 <= x2 <= 65):
        print(f"Track: {net} ({x1}, {y1}) -> ({x2}, {y2}) on {lay}")

