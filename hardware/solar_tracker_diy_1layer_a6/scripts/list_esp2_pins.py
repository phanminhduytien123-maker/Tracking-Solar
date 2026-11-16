import re

with open(r'd:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.net', 'r', encoding='utf-8') as f:
    text = f.read()

nets = text.split('(net')

print("=== J_RELAY_CTRL1 PINS ===")
for block in nets:
    name_m = re.search(r'\(name "([^"]+)"\)', block)
    if not name_m: continue
    net = name_m.group(1)
    for m in re.finditer(r'\(node\s+\(ref "J_RELAY_CTRL1"\)\s+\(pin "([^"]+)"\)', block):
        print(f"Pin {m.group(1)}: {net}")

print("\n=== J_BUS_LINK2 PINS ===")
for block in nets:
    name_m = re.search(r'\(name "([^"]+)"\)', block)
    if not name_m: continue
    net = name_m.group(1)
    for m in re.finditer(r'\(node\s+\(ref "J_BUS_LINK2"\)\s+\(pin "([^"]+)"\)', block):
        print(f"Pin {m.group(1)}: {net}")
