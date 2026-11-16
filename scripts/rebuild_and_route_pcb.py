import pcbnew
import os
import re
import subprocess

def run_sync():
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
    
    # Footprint library paths
    LIB_RES_THT  = r"D:\KiCAD\share\kicad\footprints\Resistor_THT.pretty"
    LIB_PHOENIX  = r"D:\KiCAD\share\kicad\footprints\TerminalBlock_Phoenix.pretty"
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

    # Ensure Resistors are THT Axial
    for r_ref in ["R_ENC1_A1", "R_ENC1_B1", "R_ENC2_A1", "R_ENC2_B1"]:
        replace_or_add_fp(r_ref, "6.2k", LIB_RES_THT, "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal")

    for r_ref in ["R_TEMP_TRK1", "R_TEMP_STA1"]:
        replace_or_add_fp(r_ref, "4.7k", LIB_RES_THT, "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal")

    # Clear old tracks, vias, and zones to route cleanly
    print("    Clearing old tracks, vias, and zones...")
    for track in list(board.GetTracks()):
        board.DeleteNative(track)
    for zone in list(board.Zones()):
        board.DeleteNative(zone)

    # Update Silkscreen Divider lines
    for d in list(board.GetDrawings()):
        if d.GetLayerName() == "F.Silkscreen" and d.GetClass() == "PCB_SHAPE":
            board.DeleteNative(d)

    def add_silk_line(x1, y1, x2, y2):
        shape = pcbnew.PCB_SHAPE(board)
        shape.SetShape(pcbnew.SHAPE_T_SEGMENT)
        shape.SetLayer(pcbnew.F_SilkS)
        shape.SetWidth(mm_to_iu(0.2))
        shape.SetStart(pcbnew.VECTOR2I(mm_to_iu(x1), mm_to_iu(y1)))
        shape.SetEnd(pcbnew.VECTOR2I(mm_to_iu(x2), mm_to_iu(y2)))
        board.Add(shape)

    # Clean divider lines separating Region 1, 2, 3
    add_silk_line(87.0, 16.0, 87.0, 164.0)
    add_silk_line(153.0, 16.0, 153.0, 164.0)

    # Reposition Silkscreen Banner Titles at Y=14.0mm
    for d in board.GetDrawings():
        if d.GetClass() == "PCB_TEXT":
            txt = d.GetText()
            if "VÙNG A" in txt or "VÙNG 1" in txt or "ESP32 #1" in txt:
                d.SetText("VÙNG 1: BỘ ĐIỀU KHIỂN CHÍNH (ESP32-S3 #1)")
                d.SetPosition(pcbnew.VECTOR2I(mm_to_iu(48.5), mm_to_iu(14.0)))
                d.SetTextWidth(mm_to_iu(1.1))
                d.SetTextHeight(mm_to_iu(1.1))
                d.SetTextThickness(mm_to_iu(0.18))
            elif "VÙNG 2" in txt:
                d.SetText("VÙNG 2: QUẢN LÝ NGUỒN (12V / 5V DC-DC)")
                d.SetPosition(pcbnew.VECTOR2I(mm_to_iu(120.0), mm_to_iu(14.0)))
                d.SetTextWidth(mm_to_iu(1.1))
                d.SetTextHeight(mm_to_iu(1.1))
                d.SetTextThickness(mm_to_iu(0.18))
            elif "12V GRID" in txt or "12V Tổ Ong" in txt:
                d.SetText("12V Tổ Ong / 12V Ắc Quy / Mini560 / 2x LM2596")
                d.SetPosition(pcbnew.VECTOR2I(mm_to_iu(120.0), mm_to_iu(18.0)))
                d.SetTextWidth(mm_to_iu(0.85))
                d.SetTextHeight(mm_to_iu(0.85))
                d.SetTextThickness(mm_to_iu(0.14))
            elif "VÙNG 3" in txt or "ESP32 #2" in txt:
                d.SetText("VÙNG 3: ĐO ĐẠC VOC/ISC/TEMP & RƠ-LE (ESP32-S3 #2)")
                d.SetPosition(pcbnew.VECTOR2I(mm_to_iu(191.5), mm_to_iu(14.0)))
                d.SetTextWidth(mm_to_iu(1.1))
                d.SetTextHeight(mm_to_iu(1.1))
                d.SetTextThickness(mm_to_iu(0.18))
            elif "2x ACS712" in txt or "FZ0430" in txt or "DS18B20" in txt:
                d.SetText("2x ACS712 / 2x FZ0430 / 2x DS18B20 / Relay 6-Ch / Tải 12V")
                d.SetPosition(pcbnew.VECTOR2I(mm_to_iu(191.5), mm_to_iu(18.0)))
                d.SetTextWidth(mm_to_iu(0.85))
                d.SetTextHeight(mm_to_iu(0.85))
                d.SetTextThickness(mm_to_iu(0.14))

    print("[3] Positioning all 34 components with exact clearances...")
    def place_fp(ref, x, y, rot):
        fp = board.FindFootprintByReference(ref)
        if fp is None:
            print(f"    ERROR: {ref} missing from board!")
            return
        fp.SetPosition(pcbnew.VECTOR2I(mm_to_iu(x), mm_to_iu(y)))
        fp.SetOrientation(pcbnew.EDA_ANGLE(rot, pcbnew.DEGREES_T))

    # Zone 1: Terminals (X=17.0) - facing OUTWARDS to the LEFT (Rot = 270 deg)
    place_fp("J_SW1",          17.0, 30.0, 270)
    place_fp("J_SW2",          17.0, 46.0, 270)
    place_fp("J_ENC1_AZ1",     17.0, 70.0, 270)
    place_fp("J_ENC2_EL1",     17.0, 96.0, 270)
    place_fp("J_M1_AZ1",       17.0, 118.0, 270)
    place_fp("J_M2_EL1",       17.0, 142.0, 270)

    # 4 THT Resistors placed neatly at X=26.5
    place_fp("R_ENC1_A1",      26.5, 64.0, 90)
    place_fp("R_ENC1_B1",      26.5, 76.0, 90)
    place_fp("R_ENC2_A1",      26.5, 88.0, 90)
    place_fp("R_ENC2_B1",      26.5, 104.0, 90)

    # ESP1 sockets (X=36.0 & 61.4)
    place_fp("J_ESP1_L1",      36.0, 55.0, 0)
    place_fp("J_ESP1_R1",      61.4, 55.0, 0)

    # Zone 1 INA226 modules at X=74.0 (21.2x19.1mm)
    place_fp("J_INA1_TRK1",    74.0, 45.0, 0)
    place_fp("J_INA2_STA1",    74.0, 80.0, 0)

    # Zone 1 RTC DS3231 (38x22mm) & TEMT6000 connector
    place_fp("J_RTC1",         50.7, 126.0, 0)
    place_fp("J_TEMT_EXT1",    50.7, 152.0, 0)

    # Zone 2: Power Modules (centered at X=120.0)
    place_fp("J_PWR_GRID12V1", 105.0, 28.0, 180)  # Top terminal (rot 180 = faces UP)
    place_fp("J_PWR_BAT12V1",  135.0, 28.0, 180)  # Top terminal (rot 180 = faces UP)
    place_fp("U_MINI560",      120.0, 46.0, 0)    # Mini560 (33x18mm)
    place_fp("U_LM2596_ESP1",  120.0, 78.0, 0)    # LM2596 #1 (63.5x35mm)
    place_fp("U_LM2596_ESP2",  120.0, 120.0, 0)   # LM2596 #2 (63.5x35mm)
    place_fp("J_RL6_CONTACT1", 120.0, 148.0, 0)   # Relay 6 contact

    # Zone 3: Sensors column at X=165.5 (13mm wide)
    place_fp("J_ACS1_TRK1",    165.5, 40.0, 0)    # ACS712 #1 (31x13mm)
    place_fp("J_ACS2_STA1",    165.5, 75.0, 0)    # ACS712 #2 (31x13mm)
    place_fp("J_FZ1_TRK1",     165.5, 108.0, 0)   # FZ0430 #1 (25x13mm)
    place_fp("J_FZ2_STA1",     165.5, 138.0, 0)   # FZ0430 #2 (25x13mm)

    # ESP2 sockets (X=178.6 & 204.0)
    place_fp("J_ESP2_L1",      178.6, 55.0, 0)
    place_fp("J_ESP2_R1",      204.0, 55.0, 0)

    # Relay 6-Channel Header (X=191.0, Y=125.0)
    place_fp("J_RELAY_CTRL1",  191.0, 125.0, 90)

    # Zone 3: Terminals (X=222.0) - facing OUTWARDS to the RIGHT (Rot = 90 deg)
    place_fp("J_PV_TRK_IN1",   222.0, 35.0, 90)
    place_fp("J_TEMP_TRK1",    222.0, 55.0, 90)
    place_fp("R_TEMP_TRK1",    209.5, 55.0, 90)
    place_fp("J_PV_STA_IN1",   222.0, 78.0, 90)
    place_fp("J_TEMP_STA1",    222.0, 98.0, 90)
    place_fp("R_TEMP_STA1",    209.5, 98.0, 90)
    place_fp("J_LAMP12V_OUT1", 222.0, 125.0, 90)

    print("[4] Cleaning Silkscreen and Text on all footprints...")
    for fp in board.GetFootprints():
        fp.Value().SetVisible(False)
        ref_text = fp.Reference()
        ref_text.SetVisible(True)
        ref_text.SetTextWidth(mm_to_iu(0.85))
        ref_text.SetTextHeight(mm_to_iu(0.85))
        ref_text.SetTextThickness(mm_to_iu(0.14))
        ref_text.SetLayer(pcbnew.F_SilkS)
        
        ref = fp.GetReference()
        if ref.startswith("R_ENC"):
            ref_text.SetFPRelativePosition(pcbnew.VECTOR2I(mm_to_iu(0.0), mm_to_iu(-4.0)))
            ref_text.SetTextAngle(pcbnew.EDA_ANGLE(270, pcbnew.DEGREES_T))
        elif ref.startswith("J_ESP"):
            ref_text.SetFPRelativePosition(pcbnew.VECTOR2I(mm_to_iu(0.0), mm_to_iu(-29.0)))
            ref_text.SetTextAngle(pcbnew.EDA_ANGLE(0, pcbnew.DEGREES_T))
        elif ref.startswith("J_SW") or ref.startswith("J_ENC") or ref.startswith("J_M"):
            ref_text.SetFPRelativePosition(pcbnew.VECTOR2I(mm_to_iu(0.0), mm_to_iu(-7.5)))
            ref_text.SetTextAngle(pcbnew.EDA_ANGLE(90, pcbnew.DEGREES_T))
        elif ref.startswith("J_PV") or ref.startswith("J_TEMP") or ref.startswith("J_LAMP"):
            ref_text.SetFPRelativePosition(pcbnew.VECTOR2I(mm_to_iu(0.0), mm_to_iu(-7.5)))
            ref_text.SetTextAngle(pcbnew.EDA_ANGLE(270, pcbnew.DEGREES_T))
        elif ref.startswith("J_PWR"):
            ref_text.SetFPRelativePosition(pcbnew.VECTOR2I(mm_to_iu(0.0), mm_to_iu(7.0)))
            ref_text.SetTextAngle(pcbnew.EDA_ANGLE(180, pcbnew.DEGREES_T))
        elif ref.startswith("U_LM2596"):
            ref_text.SetFPRelativePosition(pcbnew.VECTOR2I(mm_to_iu(0.0), mm_to_iu(-19.5)))
            ref_text.SetTextAngle(pcbnew.EDA_ANGLE(0, pcbnew.DEGREES_T))
        elif ref.startswith("U_MINI"):
            ref_text.SetFPRelativePosition(pcbnew.VECTOR2I(mm_to_iu(0.0), mm_to_iu(-11.0)))
            ref_text.SetTextAngle(pcbnew.EDA_ANGLE(0, pcbnew.DEGREES_T))
        else:
            ref_text.SetFPRelativePosition(pcbnew.VECTOR2I(mm_to_iu(0.0), mm_to_iu(-7.0)))
            ref_text.SetTextAngle(pcbnew.EDA_ANGLE(0, pcbnew.DEGREES_T))

    print("[5] Connecting pad nets from netlist...")
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
                pad.SetNet(board.FindNet(""))  # Unconnected
    print(f"    Successfully assigned nets to {total_assigned} pads.")

    print("[6] Setting up Net Classes & Patterns...")
    ns = board.GetDesignSettings().m_NetSettings

    # Power_HighCurrent: 12V Grid, Batt, Lamp, PV, GND_PWR (1.8mm width, 0.35mm clearance)
    nc_pwr = pcbnew.NETCLASS("Power_HighCurrent")
    nc_pwr.SetTrackWidth(mm_to_iu(1.8))
    nc_pwr.SetClearance(mm_to_iu(0.35))
    nc_pwr.SetViaDiameter(mm_to_iu(1.4))
    nc_pwr.SetViaDrill(mm_to_iu(0.7))
    ns.SetNetclass("Power_HighCurrent", nc_pwr)

    # Power_5V: +5V_ESP1, +5V_ESP2, +5V_ENC (1.2mm width, 0.3mm clearance)
    nc_5v = pcbnew.NETCLASS("Power_5V")
    nc_5v.SetTrackWidth(mm_to_iu(1.2))
    nc_5v.SetClearance(mm_to_iu(0.3))
    nc_5v.SetViaDiameter(mm_to_iu(1.2))
    nc_5v.SetViaDrill(mm_to_iu(0.6))
    ns.SetNetclass("Power_5V", nc_5v)

    # Power_3V3: +3.3V_ESP1, +3.3V_ESP2 (0.6mm width, 0.25mm clearance)
    nc_3v3 = pcbnew.NETCLASS("Power_3V3")
    nc_3v3.SetTrackWidth(mm_to_iu(0.6))
    nc_3v3.SetClearance(mm_to_iu(0.25))
    nc_3v3.SetViaDiameter(mm_to_iu(1.0))
    nc_3v3.SetViaDrill(mm_to_iu(0.5))
    ns.SetNetclass("Power_3V3", nc_3v3)

    # Motor_Signals: PUL, DIR (0.45mm width, 0.25mm clearance)
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

    ns.RecomputeEffectiveNetclasses()
    board.GetDesignSettings().m_MinResolvedSpokes = 1

    print("[7] Adding Compact Antenna Keepout Zones for ESP1 & ESP2...")
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

    # ESP1 Antenna Keepout: exact position under ESP1 antenna overhang (X: 38.0 to 59.0, Y: 44.0 to 51.0 mm)
    add_antenna_keepout(38.0, 44.0, 59.0, 51.0, pcbnew.F_Cu)
    add_antenna_keepout(38.0, 44.0, 59.0, 51.0, pcbnew.B_Cu)

    # ESP2 Antenna Keepout: exact position under ESP2 antenna overhang (X: 180.0 to 202.0, Y: 44.0 to 51.0 mm)
    add_antenna_keepout(180.0, 44.0, 202.0, 51.0, pcbnew.F_Cu)
    add_antenna_keepout(180.0, 44.0, 202.0, 51.0, pcbnew.B_Cu)

    # Save board before routing
    board.Save(pcb_path)
    print(f"[8] Saved pre-route board to {pcb_path}.")

    # Export DSN
    print("[9] Exporting Specctra DSN...")
    pcbnew.ExportSpecctraDSN(board, dsn_path)
    print(f"    DSN exported to {dsn_path}")

    # Run Freerouting
    print("[10] Running Freerouting auto-router (80 passes)...")
    jar_path = r"d:\DOANTOTNGHIEP\hardware\freerouting.jar"
    cmd = ["java", "-jar", jar_path, "-de", dsn_path, "-do", ses_path, "-mp", "80"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print(f"    Freerouting finished with code {res.returncode}")

    # Import SES
    print("[11] Importing Specctra SES...")
    board_routed = pcbnew.LoadBoard(pcb_path)
    success = pcbnew.ImportSpecctraSES(board_routed, ses_path)
    print(f"    SES import success: {success}")
    tracks = board_routed.GetTracks()
    print(f"    Total tracks and vias routed: {len(tracks)}")

    # Add GND Copper Pour on Top and Bottom
    print("[12] Adding GND Copper Planes on F.Cu and B.Cu...")
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
        ol.Append(mm_to_iu(230.0), mm_to_iu(10.0))
        ol.Append(mm_to_iu(230.0), mm_to_iu(170.0))
        ol.Append(mm_to_iu(10.0), mm_to_iu(170.0))
        board_routed.Add(z)
        return z

    make_zone(pcbnew.F_Cu)
    make_zone(pcbnew.B_Cu)

    board_routed.GetDesignSettings().m_MinResolvedSpokes = 1

    # Fill zones
    print("[13] Filling copper zones...")
    filler = pcbnew.ZONE_FILLER(board_routed)
    filler.Fill(board_routed.Zones())

    # Save final board
    board_routed.Save(pcb_path)
    print(f"[V] Master routing and copper pour completed and saved to {pcb_path}!")

if __name__ == "__main__":
    run_sync()
