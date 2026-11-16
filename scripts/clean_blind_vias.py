import pcbnew
import math

board = pcbnew.LoadBoard(r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb")

# Remove all existing vias with net /GND that are standalone stitching vias
tracks = list(board.GetTracks())
removed = 0
for item in tracks:
    if isinstance(item, pcbnew.PCB_VIA):
        if item.GetNetname() == "/GND":
            # Check if this via is connected to any track
            connected_to_track = False
            for trk in tracks:
                if isinstance(trk, pcbnew.PCB_TRACK) and trk.GetNetname() == "/GND":
                    if (trk.GetStart() - item.GetPosition()).EuclideanNorm() < 1000 or (trk.GetEnd() - item.GetPosition()).EuclideanNorm() < 1000:
                        connected_to_track = True
                        break
            if not connected_to_track:
                board.DeleteNative(item)
                removed += 1

print(f"Removed {removed} blind stitching vias.")

# Now re-fill zones and save
filler = pcbnew.ZONE_FILLER(board)
filler.Fill(board.Zones())
board.Save(r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb")
print("Saved clean board.")

