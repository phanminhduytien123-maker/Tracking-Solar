import re

def get_footprints(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # parse footprint blocks
    tokens = re.split(r'\n\s*\(footprint\s+', content)
    for t in tokens[1:]:
        header = t[:t.find('\n')]
        fp_name = header.strip(' "')
        ref = re.search(r'\(property\s+\"Reference\"\s+\"([^\"]+)\"', t)
        val = re.search(r'\(property\s+\"Value\"\s+\"([^\"]+)\"', t)
        pos = re.search(r'\(at\s+([\d\.\-]+)\s+([\d\.\-]+)(?:\s+([\d\.\-]+))?\)', t)
        r_str = ref.group(1) if ref else '?'
        v_str = val.group(1) if val else '?'
        p_str = f"({pos.group(1)}, {pos.group(2)}) rot={pos.group(3)}" if pos else '?'
        print(f"{r_str:15} | {v_str:20} | {p_str:25} | {fp_name}")

print("=== OLD FILE ===")
get_footprints('hardware/solar_tracker_diy_1layer/board1_tracker_master/board1_tracker_master.kicad_pcb')
print("\n=== NEW A6 FILE ===")
get_footprints('hardware/solar_tracker_diy_1layer_a6/board1_tracker_master/board1_tracker_master.kicad_pcb')

