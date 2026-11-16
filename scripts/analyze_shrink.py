import pcbnew

board = pcbnew.LoadBoard(r'hardware/solar_tracker_mainboard/solar_tracker_mainboard.kicad_pcb')

items = []
for fp in board.GetFootprints():
    ref = fp.GetReference()
    box = fp.GetBoundingBox()
    pos = fp.GetPosition()
    items.append({
        'ref': ref,
        'val': fp.GetValue(),
        'x': pos.x / 1e6,
        'y': pos.y / 1e6,
        'w': box.GetWidth() / 1e6,
        'h': box.GetHeight() / 1e6,
        'min_x': box.GetX() / 1e6,
        'max_x': (box.GetX() + box.GetWidth()) / 1e6,
        'min_y': box.GetY() / 1e6,
        'max_y': (box.GetY() + box.GetHeight()) / 1e6
    })

# Sort by X
items.sort(key=lambda it: it['x'])
print("Total components:", len(items))
for it in items:
    print(f"{it['ref']:18s} pos=({it['x']:6.1f}, {it['y']:6.1f}) span_x=[{it['min_x']:5.1f}..{it['max_x']:5.1f}] span_y=[{it['min_y']:5.1f}..{it['max_y']:5.1f}]")

