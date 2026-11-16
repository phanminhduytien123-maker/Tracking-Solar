import pcbnew

pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
board = pcbnew.LoadBoard(pcb_path)

lib_socket = r"D:\KiCAD\share\kicad\footprints\Connector_PinSocket_2.54mm.pretty"

# Footprints to change to Female Socket (PinSocket)
# J_ESP1_L1, J_ESP1_R1, J_ESP2_L1, J_ESP2_R1 -> 1x22
esp_refs = ["J_ESP1_L1", "J_ESP1_R1", "J_ESP2_L1", "J_ESP2_R1"]

for ref in esp_refs:
    old_fp = board.FindFootprintByReference(ref)
    if not old_fp:
        print(f"Not found: {ref}")
        continue
    pos = old_fp.GetPosition()
    rot = old_fp.GetOrientation()
    val = old_fp.GetValue()
    
    # Load new female socket footprint
    new_fp = pcbnew.FootprintLoad(lib_socket, "PinSocket_1x22_P2.54mm_Vertical")
    new_fp.SetReference(ref)
    new_fp.SetValue(val)
    new_fp.SetPosition(pos)
    new_fp.SetOrientation(rot)
    
    # Map pads and nets from old_fp to new_fp
    for old_pad in old_fp.Pads():
        pad_num = old_pad.GetName()
        new_pad = new_fp.FindPadByNumber(pad_num)
        if new_pad:
            new_pad.SetNetCode(old_pad.GetNetCode())
            
    # Replace in board
    board.Remove(old_fp)
    board.Add(new_fp)
    print(f"Replaced {ref} with PinSocket_1x22_P2.54mm_Vertical at ({pos.x/1e6:.1f}, {pos.y/1e6:.1f})")

board.Save(pcb_path)
print("Saved updated PCB with female sockets!")

