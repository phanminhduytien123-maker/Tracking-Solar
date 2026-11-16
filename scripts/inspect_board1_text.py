import pcbnew

b1 = pcbnew.LoadBoard(r"D:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6\board1_tracker_master\board1_tracker_master.kicad_pcb")
print("=== BOARD 1 DRAWINGS ===")
for d in b1.GetDrawings():
    if hasattr(d, 'GetText'):
        print(f"{d.GetLayerName()}: '{d.GetText()}' at ({d.GetPosition().x/1e6:.2f}, {d.GetPosition().y/1e6:.2f})")

print("\n=== FOOTPRINTS & TEXTS ===")
for fp in b1.GetFootprints():
    ref = fp.GetReference()
    val = fp.GetValue()
    pos = fp.GetPosition()
    if "MINI" in ref.upper() or "LM2596" in ref.upper() or "PWR" in ref.upper():
        print(f"FP: {ref} ({val}) at ({pos.x/1e6:.2f}, {pos.y/1e6:.2f})")

