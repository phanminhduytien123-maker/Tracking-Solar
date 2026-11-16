import pcbnew

board = pcbnew.LoadBoard(r'hardware/solar_tracker_mainboard/solar_tracker_mainboard.kicad_pcb')

def mm(v):
    return v / 1e6

print("=== 1. CHECK MẢNG ĐỒNG BẤT THƯỜNG / VÙNG ĐỒNG GẦN ESP1 & DS3231 ===")
# Check all zones on the board
for i, z in enumerate(board.Zones()):
    net = z.GetNetname()
    layer = board.GetLayerName(z.GetLayer())
    bbox = z.GetBoundingBox()
    print(f"Zone {i}: Net='{net}' Layer={layer} Box=({mm(bbox.GetX()):.1f}, {mm(bbox.GetY()):.1f}, {mm(bbox.GetWidth()):.1f}, {mm(bbox.GetHeight()):.1f}) IsRuleArea={z.GetIsRuleArea()}")

# Check tracks between ESP1 (X=36..61, Y=55..110) and DS3231 (X=30..68, Y=117..139)
print("\n=== Tracks between ESP1 and DS3231 (Y in [105..130], X in [30..70]) ===")
for t in board.GetTracks():
    if not isinstance(t, pcbnew.PCB_VIA):
        sp, ep = t.GetStart(), t.GetEnd()
        sx, sy, ex, ey = mm(sp.x), mm(sp.y), mm(ep.x), mm(ep.y)
        if (30 <= sx <= 70 and 105 <= sy <= 135) or (30 <= ex <= 70 and 105 <= ey <= 135):
            print(f"  Track net={t.GetNetname():15s} layer={board.GetLayerName(t.GetLayer())} w={mm(t.GetWidth()):.2f} ({sx:.1f},{sy:.1f}) -> ({ex:.1f},{ey:.1f})")

print("\n=== 2. CHECK ĐƯỜNG NGUỒN CHẠY CHÉO & CROSSINGS QUA VÙNG 2 ===")
# Check thick tracks (w >= 1.0mm) that cross Region 2 (X in [85..125])
for t in board.GetTracks():
    if not isinstance(t, pcbnew.PCB_VIA):
        sp, ep = t.GetStart(), t.GetEnd()
        sx, sy, ex, ey = mm(sp.x), mm(sp.y), mm(ep.x), mm(ep.y)
        w = mm(t.GetWidth())
        if w >= 1.0:
            if (85 <= sx <= 135) or (85 <= ex <= 135):
                print(f"  Power Track net={t.GetNetname():15s} layer={board.GetLayerName(t.GetLayer())} w={w:.2f} ({sx:.1f},{sy:.1f}) -> ({ex:.1f},{ey:.1f})")

print("\n=== 3. CHECK MOUNTING HOLES M3 CLEARANCES ===")
# Collect all mounting holes (NPTH or Edge.Cuts circles)
m_holes = []
for fp in board.GetFootprints():
    for pad in fp.Pads():
        if pad.GetAttribute() == pcbnew.PAD_ATTRIB_NPTH:
            p = pad.GetPosition()
            m_holes.append((f"{fp.GetReference()} NPTH", mm(p.x), mm(p.y), mm(pad.GetDrillSize().x)/2))

for d in board.GetDrawings():
    if d.GetLayerName() == "Edge.Cuts" and d.GetShape() == pcbnew.SHAPE_T_CIRCLE:
        c = d.GetCenter()
        r = mm(d.GetRadius())
        m_holes.append(("Edge.Cuts Corner Hole", mm(c.x), mm(c.y), r))

print(f"Total mounting holes found: {len(m_holes)}")
for h in m_holes:
    print(f"  Hole {h[0]:25s} at ({h[1]:.1f}, {h[2]:.1f}) r={h[3]:.2f}")
    # Check if any track passes within 3.0mm (screw head radius ~3.0mm for M3)
    colliding = []
    for t in board.GetTracks():
        if not isinstance(t, pcbnew.PCB_VIA):
            sp, ep = t.GetStart(), t.GetEnd()
            sx, sy, ex, ey = mm(sp.x), mm(sp.y), mm(ep.x), mm(ep.y)
            # Distance from point (h[1], h[2]) to segment (sx,sy)-(ex,ey)
            # Simple bounding box check
            min_tx, max_tx = min(sx, ex) - 0.5, max(sx, ex) + 0.5
            min_ty, max_ty = min(sy, ey) - 0.5, max(sy, ey) + 0.5
            if min_tx <= h[1] <= max_tx and min_ty <= h[2] <= max_ty:
                colliding.append((t.GetNetname(), mm(t.GetWidth())))
    if colliding:
        print(f"    WARNING: Tracks near hole: {colliding}")
