import re

with open(r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.net", "r", encoding="utf-8") as f:
    text = f.read()

nets = re.split(r'\(net\b', text)
print(f"Total net blocks: {len(nets)}")

esp_nodes = {}
for n in nets[1:]:
    name_m = re.search(r'\(name\s+"([^"]+)"\)', n)
    if not name_m:
        continue
    netname = name_m.group(1)
    nodes = re.findall(r'\(node[\s\S]*?\(ref\s+"([^"]+)"\)[\s\S]*?\(pin\s+"([^"]+)"\)', n)
    for ref, pin in nodes:
        if "ESP" in ref:
            if ref not in esp_nodes:
                esp_nodes[ref] = {}
            esp_nodes[ref][int(pin)] = netname

for ref in sorted(esp_nodes.keys()):
    print(f"\n=== {ref} ===")
    for p in sorted(esp_nodes[ref].keys()):
        print(f"  Pin {p:2}: {esp_nodes[ref][p]}")
