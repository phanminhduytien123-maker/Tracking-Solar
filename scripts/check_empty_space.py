import pcbnew

board = pcbnew.LoadBoard(r'hardware/solar_tracker_mainboard/solar_tracker_mainboard.kicad_pcb')

# Let's inspect all footprint bounding boxes on the 185x175mm board
print("Board dimensions:")
bbox = board.GetBoardEdgesBoundingBox()
print(f"X: {bbox.GetX()/1e6:.1f} .. {(bbox.GetX()+bbox.GetWidth())/1e6:.1f} (W={bbox.GetWidth()/1e6:.1f})")
print(f"Y: {bbox.GetY()/1e6:.1f} .. {(bbox.GetY()+bbox.GetHeight())/1e6:.1f} (H={bbox.GetHeight()/1e6:.1f})")

fps = []
for fp in board.GetFootprints():
    ref = fp.GetReference()
    box = fp.GetBoundingBox()
    fps.append((ref, box.GetX()/1e6, (box.GetX()+box.GetWidth())/1e6, box.GetY()/1e6, (box.GetY()+box.GetHeight())/1e6))

# Look at Region 3 / bottom region:
# Where is J_RL6_CONTACT1 right now?
fp_rl = board.FindFootprintByReference('J_RL6_CONTACT1')
if fp_rl:
    p = fp_rl.GetPosition()
    print(f"J_RL6_CONTACT1 at ({p.x/1e6:.1f}, {p.y/1e6:.1f})")

# Let's check space around bottom:
print("\nCheck bottom area Y in [120 .. 185]:")
for f in sorted(fps, key=lambda x: x[3]):
    if f[4] >= 120:
        print(f"  {f[0]:18s} X=[{f[1]:5.1f} .. {f[2]:5.1f}] Y=[{f[3]:5.1f} .. {f[4]:5.1f}]")

