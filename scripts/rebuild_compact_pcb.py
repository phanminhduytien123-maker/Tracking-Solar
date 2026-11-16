import pcbnew
import os
import re
import subprocess

def run_compact():
    pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
    net_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.net"
    dsn_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.dsn"
    ses_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.ses"
    
    print("[1] Loading netlist pin connections...")
    with open(net_path, "r", encoding="utf-8") as f:
        net_text = f.read()

    nets_split = re.split(r'\(net\b', net_text)
    comp_nets = {}
    for n in nets_split[1:]:
        name_m = re.search(r'\(name\s+"([^"]+)"\)', n)
        if not name_m:
            continue
        netname = name_m.group(1)
        nodes = re.findall(r'\(node[\s\S]*?\(ref\s+"([^"]+)"\)[\s\S]*?\(pin\s+"([^"]+)"\)', n)
        for ref, pin in nodes:
            comp_nets[(ref, pin)] = netname

    print(f"    Loaded {len(comp_nets)} pin connections from netlist.")

    print("[2] Loading PCB...")
    board = pcbnew.LoadBoard(pcb_path)
    
    LIB_RES_THT  = r"D:\KiCAD\share\kicad\footprints\Resistor_THT.pretty"
    LIB_CUSTOM   = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\custom_footprints.pretty"

    def mm_to_iu(val):
        return int(val * 1e6)

    def replace_or_add_fp(ref, val, lib_dir, fp_name):
        old_fp = board.FindFootprintByReference(ref)
        if old_fp:
            board.DeleteNative(old_fp)
        new_fp = pcbnew.FootprintLoad(lib_dir, fp_name)
        if not new_fp:
            print(f"    ERROR: Could not load footprint {fp_name} from {lib_dir}")
            return None
        new_fp.SetReference(ref)
        new_fp.SetValue(val)
        board.Add(new_fp)
        return new_fp

    # Load / Replace 6 Custom Hardware Modules
    print("    Loading custom hardware modules...")
    replace_or_add_fp("U_MINI560",      "Mini560 PRO",   LIB_CUSTOM, "Mini560_Buck_Module")
    replace_or_add_fp("U_LM2596_ESP1",  "LM2596 #1",     LIB_CUSTOM, "LM2596_Voltmeter_Display_Module")
    replace_or_add_fp("U_LM2596_ESP2",  "LM2596 #2",     LIB_CUSTOM, "LM2596_Voltmeter_Display_Module")
    replace_or_add_fp("J_INA1_TRK1",    "INA226 TRK",    LIB_CUSTOM, "INA226_CJMCU226_Module")
    replace_or_add_fp("J_INA2_STA1",    "INA226 STA",    LIB_CUSTOM, "INA226_CJMCU226_Module")
    replace_or_add_fp("J_RTC1",         "DS3231 RTC",    LIB_CUSTOM, "DS3231_RTC_ZS042_Module")
    replace_or_add_fp("J_ACS1_TRK1",    "ACS712 TRK",    LIB_CUSTOM, "ACS712_Current_Sensor_Module")
    replace_or_add_fp("J_ACS2_STA1",    "ACS712 STA",    LIB_CUSTOM, "ACS712_Current_Sensor_Module")
    replace_or_add_fp("J_FZ1_TRK1",     "FZ0430 TRK",    LIB_CUSTOM, "FZ0430_Voltage_Sensor_Module")
    replace_or_add_fp("J_FZ2_STA1",     "FZ0430 STA",    LIB_CUSTOM, "FZ0430_Voltage_Sensor_Module")
    replace_or_add_fp("J_RL6_ESP2_PWR", "Relay 6 Contact", r"D:\KiCAD\share\kicad\footprints\TerminalBlock_Phoenix.pretty", "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal")
    replace_or_add_fp("J_M1_AZ1",       "DM556 #1 Azimuth", r"D:\KiCAD\share\kicad\footprints\TerminalBlock_Phoenix.pretty", "TerminalBlock_Phoenix_MKDS-1,5-6-5.08_1x06_P5.08mm_Horizontal")
    replace_or_add_fp("J_M2_EL1",       "DM556 #2 Elevation", r"D:\KiCAD\share\kicad\footprints\TerminalBlock_Phoenix.pretty", "TerminalBlock_Phoenix_MKDS-1,5-6-5.08_1x06_P5.08mm_Horizontal")

    old_rl_pwr = board.FindFootprintByReference("U_RELAY_ESP2_PWR")
    if old_rl_pwr:
        board.DeleteNative(old_rl_pwr)
    old_rl6 = board.FindFootprintByReference("J_RL6_CONTACT1")
    if old_rl6:
        board.DeleteNative(old_rl6)

    for r_ref in ["R_ENC1_A1", "R_ENC1_B1", "R_ENC2_A1", "R_ENC2_B1"]:
        replace_or_add_fp(r_ref, "6.2k", LIB_RES_THT, "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal")

    for r_ref in ["R_TEMP_TRK1", "R_TEMP_STA1"]:
        replace_or_add_fp(r_ref, "4.7k", LIB_RES_THT, "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal")

    replace_or_add_fp("R_RL6_PU1", "10k", LIB_RES_THT, "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal")

    # Clear old tracks, vias, zones, and drawings
    print("    Clearing old tracks, vias, zones, and drawings...")
    for track in list(board.GetTracks()):
        board.DeleteNative(track)
    for zone in list(board.Zones()):
        board.DeleteNative(zone)
    for d in list(board.GetDrawings()):
        board.DeleteNative(d)

    # 1. Redraw Edge.Cuts outline (185mm x 175mm: X=10..195, Y=10..185)
    print("    Drawing new Edge.Cuts outline (185 x 175 mm)...")
    def add_edge_rect(x1, y1, x2, y2):
        pts = [(x1, y1), (x2, y1), (x2, y2), (x1, y2), (x1, y1)]
        for i in range(4):
            seg = pcbnew.PCB_SHAPE(board)
            seg.SetShape(pcbnew.SHAPE_T_SEGMENT)
            seg.SetLayer(pcbnew.Edge_Cuts)
            seg.SetWidth(mm_to_iu(0.15))
            seg.SetStart(pcbnew.VECTOR2I(mm_to_iu(pts[i][0]), mm_to_iu(pts[i][1])))
            seg.SetEnd(pcbnew.VECTOR2I(mm_to_iu(pts[i+1][0]), mm_to_iu(pts[i+1][1])))
            board.Add(seg)

    def add_mounting_hole(x, y, r=1.6):
        c = pcbnew.PCB_SHAPE(board)
        c.SetShape(pcbnew.SHAPE_T_CIRCLE)
        c.SetLayer(pcbnew.Edge_Cuts)
        c.SetWidth(mm_to_iu(0.15))
        c.SetCenter(pcbnew.VECTOR2I(mm_to_iu(x), mm_to_iu(y)))
        c.SetEnd(pcbnew.VECTOR2I(mm_to_iu(x + r), mm_to_iu(y)))
        board.Add(c)

    add_edge_rect(10.0, 10.0, 195.0, 185.0)
    add_mounting_hole(15.0, 15.0)
    add_mounting_hole(190.0, 15.0)
    add_mounting_hole(15.0, 180.0)
    add_mounting_hole(190.0, 180.0)

    # 2. Add Silkscreen Dividers and Titles
    def add_silk_line(x1, y1, x2, y2):
        shape = pcbnew.PCB_SHAPE(board)
        shape.SetShape(pcbnew.SHAPE_T_SEGMENT)
        shape.SetLayer(pcbnew.F_SilkS)
        shape.SetWidth(mm_to_iu(0.2))
        shape.SetStart(pcbnew.VECTOR2I(mm_to_iu(x1), mm_to_iu(y1)))
        shape.SetEnd(pcbnew.VECTOR2I(mm_to_iu(x2), mm_to_iu(y2)))
        board.Add(shape)

    add_silk_line(89.0, 15.0, 89.0, 180.0)
    add_silk_line(125.0, 15.0, 125.0, 180.0)

    def add_title(text, x, y, size=1.0, bold=False):
        t = pcbnew.PCB_TEXT(board)
        t.SetText(text)
        t.SetLayer(pcbnew.F_SilkS)
        t.SetPosition(pcbnew.VECTOR2I(mm_to_iu(x), mm_to_iu(y)))
        t.SetTextWidth(mm_to_iu(size))
        t.SetTextHeight(mm_to_iu(size))
        t.SetTextThickness(mm_to_iu(0.16 if bold else 0.13))
        t.SetHorizJustify(pcbnew.GR_TEXT_H_ALIGN_CENTER)
        board.Add(t)

    add_title("VÙNG 1: ĐIỀU KHIỂN CHÍNH (ESP32-S3 #1)", 49.5, 13.5, size=0.95, bold=True)
    add_title("VÙNG 2: NGUỒN DC-DC", 107.0, 13.5, size=0.95, bold=True)
    add_title("VÙNG 3: VOC / ISC / RELAY (ESP32-S3 #2)", 160.0, 13.5, size=0.95, bold=True)

    print("[3] Positioning all 34 components (Compact 185x175mm)...")
    def place_fp(ref, x, y, rot):
        fp = board.FindFootprintByReference(ref)
        if fp is None:
            print(f"    ERROR: {ref} missing from board!")
            return
        fp.SetPosition(pcbnew.VECTOR2I(mm_to_iu(x), mm_to_iu(y)))
        fp.SetOrientation(pcbnew.EDA_ANGLE(rot, pcbnew.DEGREES_T))

    # Zone 1 Left Terminals (X=17.0, Rot=270 facing LEFT)
    place_fp("J_SW1",          17.0, 25.0, 270)
    place_fp("J_SW2",          17.0, 40.0, 270)
    place_fp("J_ENC1_AZ1",     17.0, 62.0, 270)
    place_fp("J_ENC2_EL1",     17.0, 88.0, 270)
    place_fp("J_M1_AZ1",       17.0, 114.0, 270)
    place_fp("J_M2_EL1",       17.0, 148.0, 270)

    # 4 THT Resistors for Encoders (X=26.5)
    place_fp("R_ENC1_A1",      26.5, 56.0, 90)
    place_fp("R_ENC1_B1",      26.5, 68.0, 90)
    place_fp("R_ENC2_A1",      26.5, 82.0, 90)
    place_fp("R_ENC2_B1",      26.5, 94.0, 90)

    # ESP1 Sockets (X=36.0 & 61.4, Y=55.0)
    place_fp("J_ESP1_L1",      36.0, 55.0, 0)
    place_fp("J_ESP1_R1",      61.4, 55.0, 0)

    # Zone 1 RTC DS3231 & TEMT6000 (X=48.7)
    place_fp("J_RTC1",         48.7, 128.0, 0)
    place_fp("J_TEMT_EXT1",    48.7, 155.0, 0)

    # Zone 1 INA226 Modules & Mini560 (Column X=76.0)
    place_fp("J_INA1_TRK1",    76.0, 45.0, 0)
    place_fp("J_INA2_STA1",    76.0, 75.0, 0)
    place_fp("U_MINI560",      76.0, 158.0, 270)   # Mini560 vertical at bottom

    # Zone 2: Power Modules (Column X=107.0, Rot=270 vertical)
    place_fp("J_PWR_GRID12V1", 97.0,  20.0, 180)   # Top terminal facing UP
    place_fp("J_PWR_BAT12V1",  117.0, 20.0, 180)   # Top terminal facing UP
    place_fp("U_LM2596_ESP1",  107.0, 58.0,  270)   # LM2596 #1 vertical
    place_fp("U_LM2596_ESP2",  107.0, 126.0, 270)   # LM2596 #2 vertical

    # Zone 3: Sensors Column (X=132.0)
    place_fp("J_ACS1_TRK1",    132.0, 35.0, 0)
    place_fp("J_ACS2_STA1",    132.0, 70.0, 0)
    place_fp("J_FZ1_TRK1",     132.0, 102.0, 0)
    place_fp("J_FZ2_STA1",     132.0, 130.0, 0)

    # Zone 3: ESP2 Sockets (X=145.0 & 170.4, Y=55.0)
    place_fp("J_ESP2_L1",      145.0, 55.0, 0)
    place_fp("J_ESP2_R1",      170.4, 55.0, 0)

    # Zone 3: Relay 6-Channel Header (X=148.0, Y=120.0, rot=90 horizontal)
    place_fp("J_RELAY_CTRL1",  148.0, 120.0, 90)

    # Zone 3: Relay 6 Pullup Resistor 10k to +3.3V_ESP1 (X=158.0, Y=130.0, rot=0 horizontal)
    place_fp("R_RL6_PU1",      158.0, 130.0, 0)

    # Zone 3: Relay 6 Power Contact Terminal (X=188.0, Y=150.0, rot=90 facing RIGHT)
    place_fp("J_RL6_ESP2_PWR", 188.0, 150.0, 90)

    # Zone 3: Right Resistors (X=178.0)
    place_fp("R_TEMP_TRK1",    178.0, 55.0, 90)
    place_fp("R_TEMP_STA1",    178.0, 98.0, 90)

    # Zone 3: Right Terminals (X=188.0, Rot=90 facing RIGHT)
    place_fp("J_PV_TRK_IN1",   188.0, 35.0, 90)
    place_fp("J_TEMP_TRK1",    188.0, 55.0, 90)
    place_fp("J_PV_STA_IN1",   188.0, 78.0, 90)
    place_fp("J_TEMP_STA1",    188.0, 98.0, 90)
    place_fp("J_LAMP12V_OUT1", 188.0, 125.0, 90)

    # Assign nets to pads
    print("[4] Assigning nets to pads from netlist...")
    total_assigned = 0
    for fp in board.GetFootprints():
        ref = fp.GetReference()
        for pad in fp.Pads():
            pin_num = pad.GetPadName()
            net_name = comp_nets.get((ref, pin_num))
            if net_name:
                net_obj = board.FindNet(net_name)
                if not net_obj:
                    net_obj = pcbnew.NETINFO_ITEM(board, net_name)
                    board.Add(net_obj)
                pad.SetNet(net_obj)
                total_assigned += 1
            else:
                pad.SetNet(board.FindNet(""))
    print(f"    Successfully assigned nets to {total_assigned} pads.")

    # Net Classes & Rules
    print("[5] Configuring netclasses...")
    ns = board.GetDesignSettings().m_NetSettings

    nc_pwr = pcbnew.NETCLASS("Power_HighCurrent")
    nc_pwr.SetTrackWidth(mm_to_iu(1.8))
    nc_pwr.SetClearance(mm_to_iu(0.35))
    nc_pwr.SetViaDiameter(mm_to_iu(1.4))
    nc_pwr.SetViaDrill(mm_to_iu(0.7))
    ns.SetNetclass("Power_HighCurrent", nc_pwr)

    nc_5v = pcbnew.NETCLASS("Power_5V")
    nc_5v.SetTrackWidth(mm_to_iu(1.2))
    nc_5v.SetClearance(mm_to_iu(0.3))
    nc_5v.SetViaDiameter(mm_to_iu(1.2))
    nc_5v.SetViaDrill(mm_to_iu(0.6))
    ns.SetNetclass("Power_5V", nc_5v)

    nc_3v3 = pcbnew.NETCLASS("Power_3V3")
    nc_3v3.SetTrackWidth(mm_to_iu(0.6))
    nc_3v3.SetClearance(mm_to_iu(0.25))
    nc_3v3.SetViaDiameter(mm_to_iu(1.0))
    nc_3v3.SetViaDrill(mm_to_iu(0.5))
    ns.SetNetclass("Power_3V3", nc_3v3)

    nc_motor = pcbnew.NETCLASS("Motor_Signals")
    nc_motor.SetTrackWidth(mm_to_iu(0.45))
    nc_motor.SetClearance(mm_to_iu(0.25))
    nc_motor.SetViaDiameter(mm_to_iu(0.9))
    nc_motor.SetViaDrill(mm_to_iu(0.45))
    ns.SetNetclass("Motor_Signals", nc_motor)

    ns.SetNetclassPatternAssignment("*12V*", "Power_HighCurrent")
    ns.SetNetclassPatternAssignment("*GND_PWR*", "Power_HighCurrent")
    ns.SetNetclassPatternAssignment("*PV_*", "Power_HighCurrent")
    ns.SetNetclassPatternAssignment("*LAMP*", "Power_HighCurrent")
    ns.SetNetclassPatternAssignment("*5V*", "Power_5V")
    ns.SetNetclassPatternAssignment("*3.3V*", "Power_3V3")
    ns.SetNetclassPatternAssignment("*PUL*", "Motor_Signals")
    ns.SetNetclassPatternAssignment("*DIR*", "Motor_Signals")
    ns.SetNetclassPatternAssignment("*ENA*", "Motor_Signals")

    ns.RecomputeEffectiveNetclasses()
    board.GetDesignSettings().m_MinResolvedSpokes = 1

    # Antenna Keepout Zones
    print("[6] Setting up Antenna Keepouts...")
    def add_antenna_keepout(x1, y1, x2, y2, layer):
        z = pcbnew.ZONE(board)
        z.SetIsRuleArea(True)
        z.SetDoNotAllowTracks(True)
        z.SetDoNotAllowVias(True)
        z.SetDoNotAllowZoneFills(True)
        z.SetLayer(layer)
        ol = z.Outline()
        ol.NewOutline()
        ol.Append(mm_to_iu(x1), mm_to_iu(y1))
        ol.Append(mm_to_iu(x2), mm_to_iu(y1))
        ol.Append(mm_to_iu(x2), mm_to_iu(y2))
        ol.Append(mm_to_iu(x1), mm_to_iu(y2))
        board.Add(z)

    # ESP1 Antenna: X: 38.0 to 59.0, Y: 44.0 to 51.0
    add_antenna_keepout(38.0, 44.0, 59.0, 51.0, pcbnew.F_Cu)
    add_antenna_keepout(38.0, 44.0, 59.0, 51.0, pcbnew.B_Cu)

    # ESP2 Antenna: X: 147.0 to 168.4, Y: 44.0 to 51.0
    add_antenna_keepout(147.0, 44.0, 168.4, 51.0, pcbnew.F_Cu)
    add_antenna_keepout(147.0, 44.0, 168.4, 51.0, pcbnew.B_Cu)

    # Save board before routing
    board.Save(pcb_path)
    print(f"[7] Saved pre-route board to {pcb_path}.")

    # Export DSN
    print("[8] Exporting Specctra DSN...")
    pcbnew.ExportSpecctraDSN(board, dsn_path)
    print(f"    DSN exported to {dsn_path}")

    # Run Freerouting
    print("[9] Running Freerouting auto-router (80 passes)...")
    jar_path = r"d:\DOANTOTNGHIEP\hardware\freerouting.jar"
    cmd = ["java", "-jar", jar_path, "-de", dsn_path, "-do", ses_path, "-mp", "80"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print(f"    Freerouting finished with code {res.returncode}")

    # Import SES
    print("[10] Importing Specctra SES...")
    board_routed = pcbnew.LoadBoard(pcb_path)
    success = pcbnew.ImportSpecctraSES(board_routed, ses_path)
    print(f"    SES import success: {success}")
    tracks = board_routed.GetTracks()
    print(f"    Total tracks and vias routed: {len(tracks)}")

    # Verify and add TEMP_TRK link if unrouted
    net_temp = board_routed.FindNet('/TEMP_TRK')
    if net_temp:
        has_esp_conn = False
        for t in board_routed.GetTracks():
            if t.GetNetname() == '/TEMP_TRK':
                sp, ep = t.GetStart(), t.GetEnd()
                if (abs(sp.x/1e6 - 145.0) < 0.5 and abs(sp.y/1e6 - 72.78) < 0.5) or (abs(ep.x/1e6 - 145.0) < 0.5 and abs(ep.y/1e6 - 72.78) < 0.5):
                    has_esp_conn = True
                    break
        if not has_esp_conn:
            pts = [(145.00, 72.78), (151.03, 72.78), (165.00, 58.81), (174.19, 58.81), (178.00, 55.00)]
            for i in range(len(pts) - 1):
                seg = pcbnew.PCB_TRACK(board_routed)
                seg.SetStart(pcbnew.VECTOR2I(mm_to_iu(pts[i][0]), mm_to_iu(pts[i][1])))
                seg.SetEnd(pcbnew.VECTOR2I(mm_to_iu(pts[i+1][0]), mm_to_iu(pts[i+1][1])))
                seg.SetWidth(mm_to_iu(0.30))
                seg.SetLayer(pcbnew.F_Cu)
                seg.SetNet(net_temp)
                board_routed.Add(seg)
            print("    Added robust TEMP_TRK link to ESP2 GPIO15.")

    # Add GND Copper Planes on F.Cu and B.Cu (10..195, 10..185)
    print("[11] Adding GND Copper Planes on F.Cu and B.Cu...")
    net_gnd = board_routed.FindNet("/GND")

    def make_zone(layer):
        z = pcbnew.ZONE(board_routed)
        z.SetNet(net_gnd)
        z.SetLayer(layer)
        z.SetMinThickness(mm_to_iu(0.25))
        z.SetThermalReliefGap(mm_to_iu(0.4))
        z.SetThermalReliefSpokeWidth(mm_to_iu(0.4))
        z.SetPadConnection(pcbnew.ZONE_CONNECTION_THT_THERMAL)
        ol = z.Outline()
        ol.NewOutline()
        ol.Append(mm_to_iu(10.0), mm_to_iu(10.0))
        ol.Append(mm_to_iu(195.0), mm_to_iu(10.0))
        ol.Append(mm_to_iu(195.0), mm_to_iu(185.0))
        ol.Append(mm_to_iu(10.0), mm_to_iu(185.0))
        board_routed.Add(z)
        return z

    make_zone(pcbnew.F_Cu)
    make_zone(pcbnew.B_Cu)
    board_routed.GetDesignSettings().m_MinResolvedSpokes = 1

    # Fill zones
    print("[12] Filling copper zones...")
    filler = pcbnew.ZONE_FILLER(board_routed)
    filler.Fill(board_routed.Zones())

    # Save board
    board_routed.Save(pcb_path)
    print(f"[V] Master routing and copper pour completed and saved to {pcb_path}!")

if __name__ == "__main__":
    run_compact()

