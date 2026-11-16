import pcbnew

pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
board = pcbnew.LoadBoard(pcb_path)
net_gnd = board.FindNet("/GND")

# Remove any existing zones
for z in list(board.Zones()):
    board.DeleteNative(z)

def make_zone(layer):
    z = pcbnew.ZONE(board)
    z.SetNet(net_gnd)
    z.SetLayer(layer)
    z.SetMinThickness(int(0.25 * 1e6))
    z.SetThermalReliefGap(int(0.4 * 1e6))
    z.SetThermalReliefSpokeWidth(int(0.4 * 1e6))
    z.SetPadConnection(pcbnew.ZONE_CONNECTION_THT_THERMAL)
    ol = z.Outline()
    ol.NewOutline()
    ol.Append(10000000, 10000000)
    ol.Append(230000000, 10000000)
    ol.Append(230000000, 170000000)
    ol.Append(10000000, 170000000)
    board.Add(z)
    return z

make_zone(pcbnew.F_Cu)
make_zone(pcbnew.B_Cu)

filler = pcbnew.ZONE_FILLER(board)
filler.Fill(board.Zones())
board.Save(pcb_path)
print("[V] Applied and filled Top and Bottom GND planes!")

