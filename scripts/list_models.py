with open(r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb", "r", encoding="utf-8") as f:
    text = f.read()

import re
models = re.findall(r'\(model "([^"]+)"', text)
for m in sorted(list(set(models))):
    print(m)

