import pcbnew

pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
board = pcbnew.LoadBoard(pcb_path)

lib_tht = r"D:\KiCAD\share\kicad\footprints\Resistor_THT.pretty"
res_refs = {
    "R_ENC1_A1": (27.0, 64.0, 90),
    "R_ENC1_B1": (27.0, 74.0, 90),
    "R_ENC2_A1": (27.0, 89.0, 90),
    "R_ENC2_B1": (27.0, 99.0, 90),
}

def mm_to_iu(val):
    return int(val * 1e6)

# 1. Collect net names
net_info = {}
for ref in res_refs:
    fp = board.FindFootprintByReference(ref)
    if fp:
        p1 = fp.FindPadByNumber("1")
        p2 = fp.FindPadByNumber("2")
        net_info[ref] = (p1.GetNetname() if p1 else "", p2.GetNetname() if p2 else "")
        print(f"Captured nets for {ref}: {net_info[ref]}")
    else:
        # Default fallback
        if "ENC1_A" in ref: net_info[ref] = ("/M1_ENC_A", "/+3.3V_ESP1")
        elif "ENC1_B" in ref: net_info[ref] = ("/M1_ENC_B", "/+3.3V_ESP1")
        elif "ENC2_A" in ref: net_info[ref] = ("/M2_ENC_A", "/+3.3V_ESP1")
        elif "ENC2_B" in ref: net_info[ref] = ("/M2_ENC_B", "/+3.3V_ESP1")

# 2. Remove old footprints
for ref in res_refs:
    fp = board.FindFootprintByReference(ref)
    if fp:
        board.Remove(fp)
        print(f"Removed {ref}")

# 3. Add new THT footprints
for ref, (x_mm, y_mm, rot_deg) in res_refs.items():
    new_fp = pcbnew.FootprintLoad(lib_tht, "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal")
    new_fp.SetReference(ref)
    new_fp.SetValue("6.2k")
    new_fp.SetPosition(pcbnew.VECTOR2I(mm_to_iu(x_mm), mm_to_iu(y_mm)))
    new_fp.SetOrientation(pcbnew.EDA_ANGLE(rot_deg, pcbnew.DEGREES_T))
    
    net1_name, net2_name = net_info[ref]
    net1 = board.FindNet(net1_name)
    net2 = board.FindNet(net2_name)
    
    pad1 = new_fp.FindPadByNumber("1")
    pad2 = new_fp.FindPadByNumber("2")
    if pad1 and net1: pad1.SetNet(net1)
    if pad2 and net2: pad2.SetNet(net2)
    
    board.Add(new_fp)
    print(f"Added THT resistor {ref} at ({x_mm}, {y_mm}) rot={rot_deg}")

board.Save(pcb_path)
print("SUCCESS: Board updated with 4 Through-Hole Resistors!")
