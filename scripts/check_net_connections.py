import re

with open(r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.net", "r", encoding="utf-8") as f:
    text = f.read()

nets = re.split(r'\(net\b', text)
print("Nets count:", len(nets)-1)
comp_nets = {}
for n in nets[1:]:
    name_m = re.search(r'\(name\s+"([^"]+)"\)', n)
    if not name_m:
        continue
    netname = name_m.group(1)
    nodes = re.findall(r'\(node[\s\S]*?\(ref\s+"([^"]+)"\)[\s\S]*?\(pin\s+"([^"]+)"\)', n)
    for ref, pin in nodes:
        comp_nets[(ref, pin)] = netname

print(f"Total connected pins parsed: {len(comp_nets)}")
for ref in ['R_ENC1_A1', 'R_ENC1_B1', 'R_ENC2_A1', 'R_ENC2_B1']:
    print(ref, "pin 1 ->", comp_nets.get((ref, "1")), "| pin 2 ->", comp_nets.get((ref, "2")))

for ref in ['J_M1_AZ1', 'J_M2_EL1']:
    for p in ['1', '2', '3', '4']:
        print(ref, f"pin {p} ->", comp_nets.get((ref, p)))
