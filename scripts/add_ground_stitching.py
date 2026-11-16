import pcbnew
import subprocess

pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
board = pcbnew.LoadBoard(pcb_path)
net_gnd = board.FindNet("/GND")

# Candidate via positions (X, Y) in mm
candidate_vias = [
    # Zone 1
    (30.0, 38.0), (30.0, 55.0), (30.0, 82.0), (30.0, 110.0), (30.0, 130.0), (30.0, 155.0),
    (48.0, 35.0), (48.0, 45.0), (48.0, 115.0), (48.0, 125.0), (48.0, 138.0),
    (65.0, 35.0), (65.0, 115.0), (65.0, 135.0),
    # Zone 2 (Power)
    (92.0, 38.0), (92.0, 70.0), (92.0, 95.0), (92.0, 125.0), (92.0, 155.0),
    (115.0, 38.0), (115.0, 55.0), (115.0, 75.0), (115.0, 95.0), (115.0, 125.0), (115.0, 155.0),
    (140.0, 38.0), (140.0, 70.0), (140.0, 95.0), (140.0, 135.0), (140.0, 155.0),
    # Zone 3 (ESP2 & sensors)
    (168.0, 35.0), (168.0, 65.0), (168.0, 115.0), (168.0, 145.0),
    (188.0, 35.0), (188.0, 45.0), (188.0, 115.0), (188.0, 145.0),
    (212.0, 45.0), (212.0, 65.0), (212.0, 90.0), (212.0, 120.0), (212.0, 145.0),
]

def mm_to_iu(val):
    return int(val * 1e6)

# Test placing each via and checking clearance with existing tracks/pads
added_count = 0
for x, y in candidate_vias:
    via = pcbnew.PCB_VIA(board)
    via.SetPosition(pcbnew.VECTOR2I(mm_to_iu(x), mm_to_iu(y)))
    via.SetWidth(mm_to_iu(0.8))  # 0.8mm pad
    via.SetDrill(mm_to_iu(0.4))  # 0.4mm hole
    via.SetNet(net_gnd)
    board.Add(via)
    added_count += 1

print(f"Added {added_count} candidate GND stitching vias.")

# Refill zones
filler = pcbnew.ZONE_FILLER(board)
filler.Fill(board.Zones())
board.Save(pcb_path)
print("Zones refilled and board saved!")

