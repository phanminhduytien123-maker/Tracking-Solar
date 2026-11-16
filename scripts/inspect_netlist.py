import re

with open(r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.net", "r", encoding="utf-8") as f:
    text = f.read()

comps = re.findall(r'\(comp\s+\(ref\s+"([^"]+)"\)[\s\S]*?\(footprint\s+"([^"]+)"\)', text)
print(f"Total components in netlist: {len(comps)}")
for ref, fp in sorted(comps):
    print(f"{ref:18} -> {fp}")

