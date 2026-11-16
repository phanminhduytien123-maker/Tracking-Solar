import re

def inspect_a6_power_zone():
    with open('hardware/solar_tracker_diy_1layer_a6/board1_tracker_master/board1_tracker_master.kicad_pcb', 'r', encoding='utf-8') as f:
        content = f.read()

    print("=== FOOTPRINTS IN A6 BOARD 1 (Y <= 60) ===")
    tokens = re.split(r'\n\s*\(footprint\s+', content)
    for t in tokens[1:]:
        ref = re.search(r'\(property\s+\"Reference\"\s+\"([^\"]+)\"', t)
        val = re.search(r'\(property\s+\"Value\"\s+\"([^\"]+)\"', t)
        pos = re.search(r'\(at\s+([\d\.\-]+)\s+([\d\.\-]+)(?:\s+([\d\.\-]+))?\)', t)
        if ref and pos:
            x, y = float(pos.group(1)), float(pos.group(2))
            rot = pos.group(3) if pos.group(3) else '0'
            if y <= 60:
                print(f"  {ref.group(1):16} | {val.group(1) if val else '':20} | pos: ({x:>5.1f}, {y:>5.1f}) rot={rot:>4}")

    print("\n=== GR_TEXT IN A6 BOARD 1 ===")
    matches = re.findall(r'\(gr_text\s+\"([^\"]+)\"\s+\(at\s+([\d\.\-]+)\s+([\d\.\-]+)', content)
    for txt, x, y in matches:
        print(f"  '{txt}' at ({float(x):.1f}, {float(y):.1f})")

inspect_a6_power_zone()

