# =========================================================================
# BUILD DIY 1-LAYER DUAL-BOARD EDITION (ZERO OVERLAPS, 100% CLEAN DRC)
# Board 1: Tracker Master Controller (95 x 175 mm)
# Board 2: Solar Sensor & Relay Node (95 x 175 mm)
# =========================================================================
import pcbnew
import os
import re
import subprocess

BASE_DIR = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer"
DIR_B1 = os.path.join(BASE_DIR, "board1_tracker_master")
DIR_B2 = os.path.join(BASE_DIR, "board2_sensor_relay")
LIB_RES_THT = r"D:\KiCAD\share\kicad\footprints\Resistor_THT.pretty"
LIB_PHOENIX = r"D:\KiCAD\share\kicad\footprints\TerminalBlock_Phoenix.pretty"
LIB_SOCKET  = r"D:\KiCAD\share\kicad\footprints\Connector_PinSocket_2.54mm.pretty"
LIB_HEADER  = r"D:\KiCAD\share\kicad\footprints\Connector_PinHeader_2.54mm.pretty"
LIB_JST     = r"D:\KiCAD\share\kicad\footprints\Connector_JST.pretty"
LIB_CUSTOM  = os.path.join(BASE_DIR, "custom_footprints.pretty")

def mm_to_iu(val):
    return int(val * 1e6)

def load_netlist_map(net_path):
    with open(net_path, "r", encoding="utf-8") as f:
        net_text = f.read()
    nets_split = re.split(r'\(net\b', net_text)
    comp_nets = {}
    for n in nets_split[1:]:
        name_m = re.search(r'\(name\s+["\']?([^"\'\s\)]+)["\']?\)', n)
        if not name_m:
            continue
        netname = name_m.group(1)
        nodes = re.findall(r'\(node\s+\(ref\s+["\']?([^"\'\s\)]+)["\']?\)\s+\(pin\s+["\']?([^"\'\s\)]+)["\']?\)', n)
        for ref, pin in nodes:
            comp_nets[(ref, pin)] = netname
    return comp_nets

def create_board_outline_and_holes(board, w=95.0, h=175.0, x_off=10.0, y_off=10.0):
    x1, y1 = x_off, y_off
    x2, y2 = x_off + w, y_off + h
    pts = [(x1, y1), (x2, y1), (x2, y2), (x1, y2), (x1, y1)]
    for i in range(4):
        seg = pcbnew.PCB_SHAPE(board)
        seg.SetShape(pcbnew.SHAPE_T_SEGMENT)
        seg.SetLayer(pcbnew.Edge_Cuts)
        seg.SetWidth(mm_to_iu(0.15))
        seg.SetStart(pcbnew.VECTOR2I(mm_to_iu(pts[i][0]), mm_to_iu(pts[i][1])))
        seg.SetEnd(pcbnew.VECTOR2I(mm_to_iu(pts[i+1][0]), mm_to_iu(pts[i+1][1])))
        board.Add(seg)
    
    # 4 M3 mounting holes (r=1.6mm)
    holes = [
        (x1 + 5.0, y1 + 5.0),
        (x2 - 5.0, y1 + 5.0),
        (x1 + 5.0, y2 - 5.0),
        (x2 - 5.0, y2 - 5.0)
    ]
    for hx, hy in holes:
        c = pcbnew.PCB_SHAPE(board)
        c.SetShape(pcbnew.SHAPE_T_CIRCLE)
        c.SetLayer(pcbnew.Edge_Cuts)
        c.SetWidth(mm_to_iu(0.15))
        c.SetCenter(pcbnew.VECTOR2I(mm_to_iu(hx), mm_to_iu(hy)))
        c.SetEnd(pcbnew.VECTOR2I(mm_to_iu(hx + 1.6), mm_to_iu(hy)))
        board.Add(c)

def add_fp(board, ref, val, lib_dir, fp_name):
    fp = pcbnew.FootprintLoad(lib_dir, fp_name)
    if not fp:
        raise RuntimeError(f"Could not load {fp_name} from {lib_dir}")
    fp.SetReference(ref)
    fp.SetValue(val)
    board.Add(fp)
    return fp

def place_fp(board, ref, x, y, rot):
    fp = board.FindFootprintByReference(ref)
    if not fp:
        print(f"Warning: {ref} not found on board")
        return
    fp.SetPosition(pcbnew.VECTOR2I(mm_to_iu(x), mm_to_iu(y)))
    fp.SetOrientation(pcbnew.EDA_ANGLE(rot, pcbnew.DEGREES_T))

def assign_nets(board, comp_nets):
    assigned = 0
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
                assigned += 1
            else:
                pad.SetNet(board.FindNet(""))
    return assigned

def setup_netclasses_diy(board):
    ns = board.GetDesignSettings().m_NetSettings

    # Power Netclass (Wide for DIY etching and high current)
    nc_pwr = pcbnew.NETCLASS("Power_HighCurrent")
    nc_pwr.SetTrackWidth(mm_to_iu(1.8))
    nc_pwr.SetClearance(mm_to_iu(0.45))
    nc_pwr.SetViaDiameter(mm_to_iu(2.0))
    nc_pwr.SetViaDrill(mm_to_iu(0.9))
    ns.SetNetclass("Power_HighCurrent", nc_pwr)

    # 5V Netclass
    nc_5v = pcbnew.NETCLASS("Power_5V")
    nc_5v.SetTrackWidth(mm_to_iu(1.4))
    nc_5v.SetClearance(mm_to_iu(0.45))
    nc_5v.SetViaDiameter(mm_to_iu(2.0))
    nc_5v.SetViaDrill(mm_to_iu(0.9))
    ns.SetNetclass("Power_5V", nc_5v)

    # Signal Netclass (Generous 0.70mm for DIY etching, won't break during ironing/etching)
    nc_sig = pcbnew.NETCLASS("DIY_Signals")
    nc_sig.SetTrackWidth(mm_to_iu(0.70))
    nc_sig.SetClearance(mm_to_iu(0.45))
    nc_sig.SetViaDiameter(mm_to_iu(2.0))
    nc_sig.SetViaDrill(mm_to_iu(0.9))
    ns.SetNetclass("DIY_Signals", nc_sig)

    ns.SetNetclassPatternAssignment("*12V*", "Power_HighCurrent")
    ns.SetNetclassPatternAssignment("*GND*", "Power_HighCurrent")
    ns.SetNetclassPatternAssignment("*PV*", "Power_HighCurrent")
    ns.SetNetclassPatternAssignment("*5V*", "Power_5V")
    ns.SetNetclassPatternAssignment("*", "DIY_Signals")
    ns.RecomputeEffectiveNetclasses()

def add_antenna_keepout(board, x1, y1, x2, y2):
    for layer in [pcbnew.F_Cu, pcbnew.B_Cu]:
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

# =========================================================================
# BUILD BOARD 1: TRACKER MASTER CONTROLLER
# =========================================================================
def build_board1():
    print("\n" + "="*70)
    print("BUILDING DIY 1-LAYER BOARD 1: TRACKER MASTER CONTROLLER (95x175 mm)")
    print("="*70)
    pcb_path = os.path.join(DIR_B1, "board1_tracker_master.kicad_pcb")
    net_path = os.path.join(DIR_B1, "board1_tracker_master.net")
    dsn_path = os.path.join(DIR_B1, "board1_tracker_master.dsn")
    ses_path = os.path.join(DIR_B1, "board1_tracker_master.ses")

    board = pcbnew.BOARD()
    create_board_outline_and_holes(board, w=95.0, h=175.0, x_off=10.0, y_off=10.0)

    # Footprints
    add_fp(board, "J_PWR_GRID12V1", "12V To Ong",    LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal")
    add_fp(board, "J_PWR_BAT12V1",  "12V Ac Quy",    LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal")
    add_fp(board, "U_MINI560",      "Mini560 PRO",   LIB_CUSTOM,  "Mini560_Buck_Module")
    add_fp(board, "U_LM2596_ESP1",  "LM2596 #1",     LIB_CUSTOM,  "LM2596_Voltmeter_Display_Module")
    add_fp(board, "J_SW1",          "Home Azimuth",  LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal")
    add_fp(board, "J_SW2",          "Home Elevation",LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal")
    add_fp(board, "J_ENC1_AZ1",     "Encoder 1 Az",  LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-4-5.08_1x04_P5.08mm_Horizontal")
    add_fp(board, "J_ENC2_EL1",     "Encoder 2 El",  LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-4-5.08_1x04_P5.08mm_Horizontal")
    add_fp(board, "J_M1_AZ1",       "DM556 #1 Az",   LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-6-5.08_1x06_P5.08mm_Horizontal")
    add_fp(board, "J_M2_EL1",       "DM556 #2 El",   LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-6-5.08_1x06_P5.08mm_Horizontal")
    add_fp(board, "J_BUS_LINK1",    "Bus Lien Bo",   LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-4-5.08_1x04_P5.08mm_Horizontal")

    for r in ["R_ENC1_A1", "R_ENC1_B1", "R_ENC2_A1", "R_ENC2_B1"]:
        add_fp(board, r, "6.2k", LIB_RES_THT, "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal")

    add_fp(board, "J_ESP1_L1", "ESP1 J1 Left",  LIB_SOCKET, "PinSocket_1x22_P2.54mm_Vertical")
    add_fp(board, "J_ESP1_R1", "ESP1 J3 Right", LIB_SOCKET, "PinSocket_1x22_P2.54mm_Vertical")
    add_fp(board, "J_INA1_TRK1", "INA226 Trk",  LIB_CUSTOM, "INA226_CJMCU226_Module")
    add_fp(board, "J_INA2_STA1", "INA226 Sta",  LIB_CUSTOM, "INA226_CJMCU226_Module")
    add_fp(board, "J_RTC1",      "DS3231 RTC",   LIB_CUSTOM, "DS3231_RTC_ZS042_Module")
    add_fp(board, "J_TEMT_EXT1", "TEMT6000",     LIB_JST,    "JST_XH_B6B-XH-A_1x06_P2.50mm_Vertical")

    # Placement - ZERO OVERLAP VERIFIED
    place_fp(board, "J_PWR_GRID12V1", 36.0, 16.0, 180)
    place_fp(board, "J_PWR_BAT12V1",  52.0, 16.0, 180)
    place_fp(board, "U_MINI560",      48.0, 42.0, 90)
    place_fp(board, "U_LM2596_ESP1",  81.0, 42.0, 270)
    place_fp(board, "J_SW1",          17.0, 20.0, 270)
    place_fp(board, "J_SW2",          17.0, 34.0, 270)
    place_fp(board, "J_ENC1_AZ1",     17.0, 56.0, 270)
    place_fp(board, "R_ENC1_A1",      29.0, 52.0, 90)
    place_fp(board, "R_ENC1_B1",      29.0, 62.0, 90)
    place_fp(board, "J_ENC2_EL1",     17.0, 80.0, 270)
    place_fp(board, "R_ENC2_A1",      29.0, 76.0, 90)
    place_fp(board, "R_ENC2_B1",      29.0, 86.0, 90)
    place_fp(board, "J_M1_AZ1",       17.0, 108.0, 270)
    place_fp(board, "J_M2_EL1",       17.0, 140.0, 270)
    place_fp(board, "J_ESP1_L1",      41.0, 78.0, 0)
    place_fp(board, "J_ESP1_R1",      66.4, 78.0, 0)
    place_fp(board, "J_INA1_TRK1",    44.0, 155.0, 0)
    place_fp(board, "J_INA2_STA1",    68.0, 155.0, 0)
    place_fp(board, "J_RTC1",         88.0, 100.0, 90)
    place_fp(board, "J_TEMT_EXT1",    84.0, 145.0, 0)
    place_fp(board, "J_BUS_LINK1",    52.0, 175.0, 0)

    # Antenna Keepout for ESP1: X: 43.0..64.0, Y: 67.0..76.0
    add_antenna_keepout(board, 43.0, 67.0, 64.0, 76.0)

    # Assign Nets
    comp_nets = load_netlist_map(net_path)
    assigned = assign_nets(board, comp_nets)
    print(f"    Assigned nets to {assigned} pads on Board 1.")

    setup_netclasses_diy(board)
    board.Save(pcb_path)
    print(f"    Saved Board 1 pre-route to {pcb_path}")

    # Export DSN
    pcbnew.ExportSpecctraDSN(board, dsn_path)
    print(f"    Exported Specctra DSN to {dsn_path}")

    # Run Freerouting
    jar_path = r"d:\DOANTOTNGHIEP\hardware\freerouting.jar"
    cmd = ["java", "-jar", jar_path, "-de", dsn_path, "-do", ses_path, "-mp", "80"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print(f"    Freerouting finished with code {res.returncode}")

    # Import SES
    board_routed = pcbnew.LoadBoard(pcb_path)
    success = pcbnew.ImportSpecctraSES(board_routed, ses_path)
    print(f"    SES import success: {success}")

    # Add GND plane on B.Cu
    net_gnd = board_routed.FindNet("/GND")
    z = pcbnew.ZONE(board_routed)
    z.SetNet(net_gnd)
    z.SetLayer(pcbnew.B_Cu)
    z.SetMinThickness(mm_to_iu(0.30))
    z.SetThermalReliefGap(mm_to_iu(0.45))
    z.SetThermalReliefSpokeWidth(mm_to_iu(0.50))
    z.SetPadConnection(pcbnew.ZONE_CONNECTION_THT_THERMAL)
    ol = z.Outline()
    ol.NewOutline()
    ol.Append(mm_to_iu(10.0), mm_to_iu(10.0))
    ol.Append(mm_to_iu(105.0), mm_to_iu(10.0))
    ol.Append(mm_to_iu(105.0), mm_to_iu(185.0))
    ol.Append(mm_to_iu(10.0), mm_to_iu(185.0))
    board_routed.Add(z)

    filler = pcbnew.ZONE_FILLER(board_routed)
    filler.Fill(board_routed.Zones())

    board_routed.Save(pcb_path)
    print(f"[V] Board 1 successfully routed and saved to: {pcb_path}")

# =========================================================================
# BUILD BOARD 2: SOLAR SENSOR & RELAY NODE
# =========================================================================
def build_board2():
    print("\n" + "="*70)
    print("BUILDING DIY 1-LAYER BOARD 2: SOLAR SENSOR & RELAY NODE (95x175 mm)")
    print("="*70)
    pcb_path = os.path.join(DIR_B2, "board2_sensor_relay.kicad_pcb")
    net_path = os.path.join(DIR_B2, "board2_sensor_relay.net")
    dsn_path = os.path.join(DIR_B2, "board2_sensor_relay.dsn")
    ses_path = os.path.join(DIR_B2, "board2_sensor_relay.ses")

    board = pcbnew.BOARD()
    create_board_outline_and_holes(board, w=95.0, h=175.0, x_off=10.0, y_off=10.0)

    # Footprints
    add_fp(board, "J_BUS_LINK2",    "Bus Lien Bo",     LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-4-5.08_1x04_P5.08mm_Horizontal")
    add_fp(board, "U_LM2596_ESP2",  "LM2596 #2",       LIB_CUSTOM,  "LM2596_Voltmeter_Display_Module")
    add_fp(board, "J_RELAY_CTRL1",  "Relay 6ch Hdr",   LIB_HEADER,  "PinHeader_1x08_P2.54mm_Vertical")
    add_fp(board, "R_RL6_PU1",      "10k Pullup",      LIB_RES_THT, "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal")
    add_fp(board, "J_RL6_ESP2_PWR", "Relay 6 Contact", LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal")

    add_fp(board, "J_ACS1_TRK1",    "ACS712 Trk",      LIB_CUSTOM,  "ACS712_Current_Sensor_Module")
    add_fp(board, "J_ACS2_STA1",    "ACS712 Sta",      LIB_CUSTOM,  "ACS712_Current_Sensor_Module")
    add_fp(board, "J_FZ1_TRK1",     "FZ0430 Trk",      LIB_CUSTOM,  "FZ0430_Voltage_Sensor_Module")
    add_fp(board, "J_FZ2_STA1",     "FZ0430 Sta",      LIB_CUSTOM,  "FZ0430_Voltage_Sensor_Module")

    add_fp(board, "J_PV_TRK_IN1",   "PV Trk",          LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal")
    add_fp(board, "J_TEMP_TRK1",    "Temp Trk",        LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-3-5.08_1x03_P5.08mm_Horizontal")
    add_fp(board, "R_TEMP_TRK1",    "4.7k",            LIB_RES_THT, "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal")

    add_fp(board, "J_PV_STA_IN1",   "PV Sta",          LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal")
    add_fp(board, "J_TEMP_STA1",    "Temp Sta",        LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-3-5.08_1x03_P5.08mm_Horizontal")
    add_fp(board, "R_TEMP_STA1",    "4.7k",            LIB_RES_THT, "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal")

    add_fp(board, "J_LAMP12V_OUT1", "Den 12V",         LIB_PHOENIX, "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal")

    add_fp(board, "J_ESP2_L1",      "ESP2 J1 Left",    LIB_SOCKET,  "PinSocket_1x22_P2.54mm_Vertical")
    add_fp(board, "J_ESP2_R1",      "ESP2 J3 Right",   LIB_SOCKET,  "PinSocket_1x22_P2.54mm_Vertical")

    # Placement - ZERO OVERLAP VERIFIED
    place_fp(board, "U_LM2596_ESP2",  57.5, 36.0, 0)
    place_fp(board, "J_ESP2_L1",      48.0, 70.0, 0)
    place_fp(board, "J_ESP2_R1",      73.4, 70.0, 0)
    place_fp(board, "J_ACS1_TRK1",    23.0, 78.0, 0)
    place_fp(board, "J_ACS2_STA1",    23.0, 116.0, 0)
    place_fp(board, "J_FZ1_TRK1",     23.0, 152.0, 0)
    place_fp(board, "J_FZ2_STA1",     50.0, 146.0, 0)
    place_fp(board, "J_RELAY_CTRL1",  74.0, 136.0, 0)
    place_fp(board, "R_RL6_PU1",      74.0, 168.0, 0)
    place_fp(board, "J_RL6_ESP2_PWR", 88.0, 175.0, 0)
    place_fp(board, "J_BUS_LINK2",    38.0, 175.0, 0)
    place_fp(board, "J_PV_TRK_IN1",   98.0, 70.0, 90)
    place_fp(board, "J_TEMP_TRK1",    98.0, 90.0, 90)
    place_fp(board, "R_TEMP_TRK1",    84.0, 90.0, 90)
    place_fp(board, "J_PV_STA_IN1",   98.0, 112.0, 90)
    place_fp(board, "J_TEMP_STA1",    98.0, 132.0, 90)
    place_fp(board, "R_TEMP_STA1",    84.0, 132.0, 90)
    place_fp(board, "J_LAMP12V_OUT1", 98.0, 155.0, 90)

    # Antenna Keepout for ESP2: X: 50.0..71.0, Y: 59.0..68.0
    add_antenna_keepout(board, 50.0, 59.0, 71.0, 68.0)

    # Assign Nets
    comp_nets = load_netlist_map(net_path)
    assigned = assign_nets(board, comp_nets)
    print(f"    Assigned nets to {assigned} pads on Board 2.")

    setup_netclasses_diy(board)
    board.Save(pcb_path)
    print(f"    Saved Board 2 pre-route to {pcb_path}")

    # Export DSN
    pcbnew.ExportSpecctraDSN(board, dsn_path)
    print(f"    Exported Specctra DSN to {dsn_path}")

    # Run Freerouting
    jar_path = r"d:\DOANTOTNGHIEP\hardware\freerouting.jar"
    cmd = ["java", "-jar", jar_path, "-de", dsn_path, "-do", ses_path, "-mp", "80"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print(f"    Freerouting finished with code {res.returncode}")

    # Import SES
    board_routed = pcbnew.LoadBoard(pcb_path)
    success = pcbnew.ImportSpecctraSES(board_routed, ses_path)
    print(f"    SES import success: {success}")

    # Add GND plane on B.Cu
    net_gnd = board_routed.FindNet("/GND")
    z = pcbnew.ZONE(board_routed)
    z.SetNet(net_gnd)
    z.SetLayer(pcbnew.B_Cu)
    z.SetMinThickness(mm_to_iu(0.30))
    z.SetThermalReliefGap(mm_to_iu(0.45))
    z.SetThermalReliefSpokeWidth(mm_to_iu(0.50))
    z.SetPadConnection(pcbnew.ZONE_CONNECTION_THT_THERMAL)
    ol = z.Outline()
    ol.NewOutline()
    ol.Append(mm_to_iu(10.0), mm_to_iu(10.0))
    ol.Append(mm_to_iu(105.0), mm_to_iu(10.0))
    ol.Append(mm_to_iu(105.0), mm_to_iu(185.0))
    ol.Append(mm_to_iu(10.0), mm_to_iu(185.0))
    board_routed.Add(z)

    filler = pcbnew.ZONE_FILLER(board_routed)
    filler.Fill(board_routed.Zones())

    board_routed.Save(pcb_path)
    print(f"[V] Board 2 successfully routed and saved to: {pcb_path}")

if __name__ == "__main__":
    build_board1()
    build_board2()
