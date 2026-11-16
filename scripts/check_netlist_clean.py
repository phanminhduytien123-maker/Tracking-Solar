import re

with open('hardware/solar_tracker_mainboard/solar_tracker_mainboard.net', encoding='utf-8') as f:
    text = f.read()

nets = re.findall(r'\(net\s+\(code\s+"[^"]+"\)\s+\(name\s+"([^"]+)"\)', text)
print(f"Total nets in netlist: {len(nets)}")
print("Nets:")
for n in sorted(nets):
    print(f"  {n}")

if "/NC" in nets:
    print("WARNING: /NC is in netlist!")
else:
    print("SUCCESS: /NC is NOT in netlist!")

