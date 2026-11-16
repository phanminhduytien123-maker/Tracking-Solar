import re

paths = [
    'hardware/solar_tracker_diy_1layer/board1_tracker_master/board1_tracker_master.kicad_pcb',
    'hardware/solar_tracker_diy_1layer_a6/board1_tracker_master/board1_tracker_master.kicad_pcb'
]

for p in paths:
    print('==============================')
    print('FILE:', p)
    with open(p, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # search footprints
    print('--- FOOTPRINTS ---')
    for m in re.finditer(r'\(footprint\s+\"([^\"]+)\"[^)]*\(at\s+([\d\.\-]+)\s+([\d\.\-]+)', content):
        name = m.group(1)
        x = m.group(2)
        y = m.group(3)
        if any(k in name.upper() for k in ['MINI', 'LM', 'PWR', 'BAT', 'GRID']):
            print(f'{name} at ({x}, {y})')
            
    print('--- GR_TEXT ---')
    for m in re.finditer(r'\(gr_text\s+\"([^\"]+)\"\s+\(at\s+([\d\.\-]+)\s+([\d\.\-]+)', content):
        txt = m.group(1)
        x = m.group(2)
        y = m.group(3)
        if any(k in txt.upper() for k in ['MASTER', 'B1', 'MINI', 'LM', 'BAT', 'GRID', '12V', 'ONG', 'QUY']):
            print(f'"{txt}" at ({x}, {y})')

