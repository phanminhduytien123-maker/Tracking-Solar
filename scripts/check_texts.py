import re

def check_text(p):
    print("Checking", p)
    with open(p, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # check all gr_text
    matches = re.findall(r'\(gr_text\s+\"([^\"]+)\"\s+\(at\s+([\d\.\-]+)\s+([\d\.\-]+)', content)
    for txt, x, y in matches:
        x, y = float(x), float(y)
        if 5 <= y <= 35:
            print(f"  gr_text: '{txt}' at ({x}, {y})")
            
    # check footprint texts
    fp_matches = re.findall(r'\(property\s+\"([^\"]+)\"\s+\"([^\"]+)\"[\s\S]*?\(at\s+([\d\.\-]+)\s+([\d\.\-]+)', content)
    for prop, val, x, y in fp_matches:
        x, y = float(x), float(y)
        if 5 <= y <= 35:
            print(f"  fp prop: {prop}='{val}' at ({x}, {y})")

check_text('hardware/solar_tracker_diy_1layer/board1_tracker_master/board1_tracker_master.kicad_pcb')
check_text('hardware/solar_tracker_diy_1layer_a6/board1_tracker_master/board1_tracker_master.kicad_pcb')

