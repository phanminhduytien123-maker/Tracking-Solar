import pcbnew
import os

pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
board = pcbnew.LoadBoard(pcb_path)

print("=== 1. ZONES ===")
for i, z in enumerate(board.Zones()):
    net = z.GetNetname()
    layer = board.GetLayerName(z.GetLayer())
    box = z.GetBoundingBox()
    x1, y1 = round(box.GetX() / 1e6, 1), round(box.GetY() / 1e6, 1)
    w, h = round(box.GetWidth() / 1e6, 1), round(box.GetHeight() / 1e6, 1)
    print(f"Zone {i}: layer={layer}, net='{net}', box=({x1},{y1}, w={w}, h={h})")

print("\n=== 2. TRACK WIDTHS BY NET ===")
tracks = list(board.GetTracks())
widths_by_net = {}
for t in tracks:
    if t.GetClass() == "PCB_TRACK":
        net = t.GetNetname()
        w = round(t.GetWidth() / 1e6, 3)
        if net not in widths_by_net:
            widths_by_net[net] = set()
        widths_by_net[net].add(w)

for net in sorted(widths_by_net.keys()):
    if any(k in net.upper() for k in ["12V", "PV", "BAT", "LAMP", "5V", "GND", "ACS", "FZ", "RL", "RELAY", "M1", "M2"]):
        print(f"  {net:25}: widths = {sorted(list(widths_by_net[net]))} mm")

print("\n=== 3. ESP32 PINS CHECK ===")
for ref in ["J_ESP1_L1", "J_ESP1_R1", "J_ESP2_L1", "J_ESP2_R1"]:
    fp = board.FindFootprintByReference(ref)
    if fp:
        print(f"\nFootprint {ref}:")
        pads = sorted(list(fp.Pads()), key=lambda p: int(p.GetNumber()) if p.GetNumber().isdigit() else 99)
        for p in pads:
            num = p.GetNumber()
            net = p.GetNetname()
            if net:
                print(f"  Pin {num:2}: {net}")

