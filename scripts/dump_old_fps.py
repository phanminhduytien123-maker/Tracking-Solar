import re

with open('hardware/solar_tracker_diy_1layer/board1_tracker_master/board1_tracker_master.kicad_pcb', 'r', encoding='utf-8') as f:
    c = f.read()

fps = re.findall(r'\(footprint\s+\"([^\"]+)\"[\s\S]*?\(property\s+\"Reference\"\s+\"([^\"]+)\"[\s\S]*?\(property\s+\"Value\"\s+\"([^\"]+)\"[\s\S]*?\(at\s+([\d\.\-]+)\s+([\d\.\-]+)(?:\s+([\d\.\-]+))?\)', c)
for fp, ref, val, x, y, rot in fps:
    print(f"{ref:15} | {val:15} | at ({x:>6}, {y:>6}) rot={rot} | {fp}")

