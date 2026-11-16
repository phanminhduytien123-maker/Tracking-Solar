import re

for path in [
    'hardware/solar_tracker_diy_1layer/board1_tracker_master/board1_tracker_master.kicad_pcb',
    'hardware/solar_tracker_diy_1layer_a6/board1_tracker_master/board1_tracker_master.kicad_pcb'
]:
    print('==============================')
    print('FILE:', path)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    fps = re.findall(r'\(footprint\s+\"([^\"]+)\"[\s\S]*?\(property\s+\"Reference\"\s+\"([^\"]+)\"[\s\S]*?\(property\s+\"Value\"\s+\"([^\"]+)\"', content)
    for fp, ref, val in fps:
        # find (at x y)
        m = re.search(r'\(property\s+\"Reference\"\s+\"' + re.escape(ref) + r'\"[\s\S]*?\(at\s+([\d\.\-]+)\s+([\d\.\-]+)', content)
        # also footprint pos
        m_fp = re.search(r'\(footprint\s+\"' + re.escape(fp) + r'\"[\s\S]*?\(at\s+([\d\.\-]+)\s+([\d\.\-]+)', content)
        pos = m_fp.groups() if m_fp else ('?', '?')
        print(f'{ref} ({val}) [{fp}] at {pos}')

