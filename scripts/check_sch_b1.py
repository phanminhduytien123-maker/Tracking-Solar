import re

def parse_sch(path):
    print("=== SCHEMATIC:", path)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # find symbols
    syms = re.split(r'\n\s*\(symbol\s+', content)
    for s in syms[1:]:
        ref = re.search(r'\(property\s+\"Reference\"\s+\"([^\"]+)\"', s)
        val = re.search(r'\(property\s+\"Value\"\s+\"([^\"]+)\"', s)
        fp = re.search(r'\(property\s+\"Footprint\"\s+\"([^\"]+)\"', s)
        if ref and val:
            r = ref.group(1)
            v = val.group(1)
            f_str = fp.group(1) if fp else ""
            if any(k in r for k in ['PWR', 'U_LM', 'U_MINI', 'ESP1', 'M1', 'M2', 'INA']):
                print(f"  {r:16} | {v:20} | {f_str}")

parse_sch('hardware/solar_tracker_diy_1layer/board1_tracker_master/board1_tracker_master.kicad_sch')
