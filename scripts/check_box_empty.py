import pcbnew

board = pcbnew.LoadBoard(r'hardware/solar_tracker_mainboard/solar_tracker_mainboard.kicad_pcb')

print("Footprints in X in [125..190], Y in [130..185]:")
for fp in board.GetFootprints():
    ref = fp.GetReference()
    box = fp.GetBoundingBox()
    bx1 = box.GetX()/1e6
    bx2 = (box.GetX()+box.GetWidth())/1e6
    by1 = box.GetY()/1e6
    by2 = (box.GetY()+box.GetHeight())/1e6
    if bx2 >= 125 and bx1 <= 190 and by2 >= 130 and by1 <= 185:
        print(f"  {ref:18s} X=[{bx1:5.1f} .. {bx2:5.1f}] Y=[{by1:5.1f} .. {by2:5.1f}]")

