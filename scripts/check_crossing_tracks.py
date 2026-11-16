import pcbnew

pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
board = pcbnew.LoadBoard(pcb_path)

print("=== TRACKS CROSSING REGIONS (X < 80 to X > 140) ===")
crossing_nets = set()
for t in board.GetTracks():
    if t.GetClass() == "PCB_TRACK":
        p1 = t.GetStart()
        p2 = t.GetEnd()
        x1, x2 = p1.x / 1e6, p2.x / 1e6
        # Check if track segment crosses x=80 or x=140
        if (x1 < 90 and x2 > 90) or (x1 > 90 and x2 < 90) or (x1 < 140 and x2 > 140) or (x1 > 140 and x2 < 140):
            crossing_nets.add((t.GetNetname(), round(t.GetWidth()/1e6, 2)))

for net, w in sorted(crossing_nets):
    print(f"  Crossing net: {net:25} (width {w} mm)")

