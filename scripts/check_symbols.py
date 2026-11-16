import re

with open(r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_sch", "r", encoding="utf-8") as f:
    content = f.read()

# match symbols
matches = re.findall(r'\(symbol\s+\(lib_id "([^"]+)"\)(?:(?!\(symbol)[\s\S])*?\(property "Reference" "([^"]+)"(?:(?!\(symbol)[\s\S])*?\(property "Footprint" "([^"]+)"', content)

print(f"Total symbols found: {len(matches)}")
for lib_id, ref, fp in matches:
    print(f"{ref:20} : {fp}")

