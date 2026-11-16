import re
with open(r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb", "r", encoding="utf-8") as f:
    text = f.read()
zones = re.findall(r'\(zone[\s\S]*?\n\t\)', text)
for i, z in enumerate(zones):
    lines = z.splitlines()[:15]
    print(f"Zone {i}:")
    for l in lines:
        if any(k in l for k in ["layer", "net", "name", "keepout", "hatch"]):
            print("  ", l.strip())
