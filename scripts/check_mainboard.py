import re

def check_text(p):
    print("Checking", p)
    with open(p, 'r', encoding='utf-8') as f:
        content = f.read()
    
    matches = re.findall(r'\(gr_text\s+\"([^\"]+)\"\s+\(at\s+([\d\.\-]+)\s+([\d\.\-]+)', content)
    for txt, x, y in matches:
        x, y = float(x), float(y)
        if 'MASTER' in txt.upper() or 'B1' in txt.upper() or 'MINI' in txt.upper():
            print(f"  gr_text: '{txt}' at ({x}, {y})")
            
    fp_matches = re.findall(r'\(property\s+\"([^\"]+)\"\s+\"([^\"]+)\"[\s\S]*?\(at\s+([\d\.\-]+)\s+([\d\.\-]+)', content)
    for prop, val, x, y in fp_matches:
        x, y = float(x), float(y)
        if 'MASTER' in val.upper() or 'B1' in val.upper() or 'MINI' in val.upper():
            print(f"  fp prop: {prop}='{val}' at ({x}, {y})")

check_text('hardware/solar_tracker_mainboard/solar_tracker_mainboard.kicad_pcb')
