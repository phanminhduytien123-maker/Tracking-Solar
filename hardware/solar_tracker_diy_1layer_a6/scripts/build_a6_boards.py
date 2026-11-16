"""
Comprehensive builder for Solar Tracker DIY 1-Layer PCBs on standard A6 copper clad (100 x 152 mm).
Eliminates all SWIG memory leaks by using S-expression manipulation for structure,
then uses pcbnew for placement, DSN export, and SES import.
"""
import os
import re
import sys
import subprocess
import pcbnew

A6_WIDTH = 100.0
A6_HEIGHT = 152.0
ORIGIN_X = 10.0
ORIGIN_Y = 10.0

BASE_DIR = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6"
BOARD1_DIR = os.path.join(BASE_DIR, "board1_tracker_master")
BOARD2_DIR = os.path.join(BASE_DIR, "board2_sensor_relay")
FREEROUTING_JAR = r"d:\DOANTOTNGHIEP\hardware\freerouting.jar"

def clean_and_prepare_pcb(pcb_path, w=100.0, h=152.0, x0=10.0, y0=10.0):
    """
    Cleans old tracks, vias, zones, edge cuts, and gr_texts via regex/S-expression.
    Injects new Edge.Cuts rectangle and 4 mounting holes.
    """
    with open(pcb_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove all tracks and vias
    content = re.sub(r'\(segment\s+[^\)]+\)', '', content)
    content = re.sub(r'\(via\s+[^\)]+\)', '', content)

    # 2. Line by line parsing to remove zones and Edge.Cuts and gr_texts
    lines = content.splitlines(True)
    out = []
    in_zone = False
    zone_paren = 0
    in_text = False
    text_paren = 0
    
    for line in lines:
        # Zone tracking
        if '(zone' in line and not in_zone:
            in_zone = True
            zone_paren = line.count('(') - line.count(')')
            if zone_paren <= 0:
                in_zone = False
            continue
        if in_zone:
            zone_paren += line.count('(') - line.count(')')
            if zone_paren <= 0:
                in_zone = False
            continue

        # gr_text tracking (remove old standalone texts)
        if '(gr_text' in line and not in_text:
            in_text = True
            text_paren = line.count('(') - line.count(')')
            if text_paren <= 0:
                in_text = False
            continue
        if in_text:
            text_paren += line.count('(') - line.count(')')
            if text_paren <= 0:
                in_text = False
            continue

        # Skip any line mentioning Edge.Cuts
        if 'Edge.Cuts' in line or '"Edge.Cuts"' in line:
            continue

        out.append(line)

    cleaned = "".join(out)

    # Generate new Edge.Cuts S-expression elements
    x1 = x0 + w
    y1 = y0 + h
    edge_cuts_sexpr = f"""
  (gr_line (start {x0} {y0}) (end {x1} {y0}) (stroke (width 0.15) (type solid)) (layer "Edge.Cuts"))
  (gr_line (start {x1} {y0}) (end {x1} {y1}) (stroke (width 0.15) (type solid)) (layer "Edge.Cuts"))
  (gr_line (start {x1} {y1}) (end {x0} {y1}) (stroke (width 0.15) (type solid)) (layer "Edge.Cuts"))
  (gr_line (start {x0} {y1}) (end {x0} {y0}) (stroke (width 0.15) (type solid)) (layer "Edge.Cuts"))
  (gr_circle (center {x0+5.0} {y0+5.0}) (end {x0+6.6} {y0+5.0}) (stroke (width 0.15) (type solid)) (fill none) (layer "Edge.Cuts"))
  (gr_circle (center {x1-5.0} {y0+5.0}) (end {x1-3.4} {y0+5.0}) (stroke (width 0.15) (type solid)) (fill none) (layer "Edge.Cuts"))
  (gr_circle (center {x0+5.0} {y1-5.0}) (end {x0+6.6} {y1-5.0}) (stroke (width 0.15) (type solid)) (fill none) (layer "Edge.Cuts"))
  (gr_circle (center {x1-5.0} {y1-5.0}) (end {x1-3.4} {y1-5.0}) (stroke (width 0.15) (type solid)) (fill none) (layer "Edge.Cuts"))
"""
    # Insert before the last closing parenthesis
    last_paren = cleaned.rfind(')')
    if last_paren != -1:
        new_content = cleaned[:last_paren] + edge_cuts_sexpr + cleaned[last_paren:]
    else:
        new_content = cleaned + edge_cuts_sexpr

    with open(pcb_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Cleaned and injected A6 outline for: {pcb_path}")

def place_component(board, ref, x, y, rot=0):
    fp = board.FindFootprintByReference(ref)
    if fp:
        fp.SetPosition(pcbnew.VECTOR2I(int(x * 1e6), int(y * 1e6)))
        fp.SetOrientationDegrees(rot)
        return True
    else:
        print(f"WARNING: Footprint {ref} not found on board!")
        return False

def add_pcb_text(board, text, x, y, layer_id, size_mm=1.2, thickness_mm=0.2, mirror=False):
    t = pcbnew.PCB_TEXT(board)
    t.SetText(text)
    t.SetPosition(pcbnew.VECTOR2I(int(x * 1e6), int(y * 1e6)))
    t.SetLayer(layer_id)
    t.SetTextSize(pcbnew.VECTOR2I(int(size_mm * 1e6), int(size_mm * 1e6)))
    t.SetTextThickness(int(thickness_mm * 1e6))
    if mirror:
        t.SetMirrored(True)
    board.Add(t)

def apply_board1_layout(board):
    print("Applying Board 1 placement...")
    # Left edge: limit switches, encoders, steppers
    place_component(board, 'J_SW1',          17.0, 18.0, 270)
    place_component(board, 'J_SW2',          17.0, 30.0, 270)
    place_component(board, 'J_ENC1_AZ1',     17.0, 48.0, 270)
    place_component(board, 'J_ENC2_EL1',     17.0, 72.0, 270)
    place_component(board, 'J_M1_AZ1',       17.0, 101.0, 270)
    place_component(board, 'J_M2_EL1',       17.0, 134.0, 270)

    # Resistors for encoders (horizontal rot=0)
    place_component(board, 'R_ENC1_A1',      28.0, 44.0, 0)
    place_component(board, 'R_ENC1_B1',      28.0, 50.0, 0)
    place_component(board, 'R_ENC2_A1',      28.0, 68.0, 0)
    place_component(board, 'R_ENC2_B1',      28.0, 74.0, 0)

    # Top power terminals
    place_component(board, 'J_PWR_GRID12V1', 36.0, 16.0, 180)
    place_component(board, 'J_PWR_BAT12V1',  52.0, 16.0, 180)

    # Top modules: Mini560 and LM2596
    place_component(board, 'U_MINI560',      45.0, 42.0, 90)
    place_component(board, 'U_LM2596_ESP1',  86.0, 45.0, 270)

    # ESP32 Master (Center)
    place_component(board, 'J_ESP1_L1',      42.0, 78.0, 0)
    place_component(board, 'J_ESP1_R1',      67.4, 78.0, 0)

    # Right side: DS3231 and TEMT6000
    place_component(board, 'J_RTC1',         90.0, 96.0, 90)
    place_component(board, 'J_TEMT_EXT1',    90.0, 122.0, 0)

    # Bottom row: INA sensors and Bus Link
    place_component(board, 'J_INA1_TRK1',    34.0, 142.0, 0)
    place_component(board, 'J_BUS_LINK1',    52.0, 152.0, 0)
    place_component(board, 'J_INA2_STA1',    88.0, 142.0, 0)

    # FRONT SILKSCREEN (F.SilkS)
    add_pcb_text(board, "B1 - TRACKER MASTER (A6 1-LAYER)", 20.0, 159.0, pcbnew.F_SilkS, 1.4, 0.25)
    add_pcb_text(board, "12V TO ONG", 36.0, 11.5, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "12V AC QUY", 52.0, 11.5, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "MINI560: 12V GRID -> 5V ENC", 45.0, 28.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "LM2596 #1: 12V BAT -> 5V ESP1", 86.0, 20.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "ESP32 MASTER", 54.7, 72.0, pcbnew.F_SilkS, 1.3, 0.22)
    add_pcb_text(board, "DS3231 RTC", 90.0, 80.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "TEMT6000", 90.0, 115.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "INA226 TRK", 34.0, 134.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "BUS LINK TO B2", 52.0, 158.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "INA226 STA", 88.0, 134.0, pcbnew.F_SilkS, 1.1, 0.2)

    # BOTTOM SILKSCREEN (B.SilkS) - Only pin definitions for manual soldering / wiring
    # Left edge: J_SW1, J_SW2, J_ENC1, J_ENC2, J_M1, J_M2
    add_pcb_text(board, "GND  SW_AZ", 23.0, 18.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "GND  SW_EL", 23.0, 30.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "+5V  GND  A  B", 23.0, 48.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "+5V  GND  A  B", 23.0, 72.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "ENA+ ENA- DIR+ DIR- PUL+ PUL-", 24.0, 101.0, pcbnew.B_SilkS, 0.9, 0.18, mirror=True)
    add_pcb_text(board, "ENA+ ENA- DIR+ DIR- PUL+ PUL-", 24.0, 134.0, pcbnew.B_SilkS, 0.9, 0.18, mirror=True)
    # Top power
    add_pcb_text(board, "+12V  GND", 36.0, 20.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "+12V  GND", 52.0, 20.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    # Bottom bus & INA
    add_pcb_text(board, "+5V GND SDA SCL TX2 RX2", 52.0, 148.0, pcbnew.B_SilkS, 0.9, 0.18, mirror=True)

def apply_board2_layout(board):
    print("Applying Board 2 placement...")
    # Top LM2596 buck module
    place_component(board, 'U_LM2596_ESP2',   60.0, 32.0, 0)
    
    # ESP32 Node 2 (Center)
    place_component(board, 'J_ESP2_L1',       48.0, 68.0, 0)
    place_component(board, 'J_ESP2_R1',       73.4, 68.0, 0)

    # Left side: Current sensors & Voltage sensors
    place_component(board, 'J_ACS1_TRK1',     23.0, 60.0, 0)
    place_component(board, 'J_ACS2_STA1',     23.0, 92.0, 0)
    place_component(board, 'J_FZ1_TRK1',      23.0, 122.0, 0)
    place_component(board, 'J_FZ2_STA1',      23.0, 146.0, 0)

    # Right side: PV inputs, Temperature sensors, 12V Lamp, Relay control header
    place_component(board, 'J_PV_TRK_IN1',    98.0, 60.0, 90)
    place_component(board, 'J_TEMP_TRK1',     98.0, 78.0, 90)
    place_component(board, 'R_TEMP_TRK1',     84.0, 78.0, 0)
    place_component(board, 'J_PV_STA_IN1',    98.0, 96.0, 90)
    place_component(board, 'J_TEMP_STA1',     98.0, 114.0, 90)
    place_component(board, 'R_TEMP_STA1',     84.0, 114.0, 0)
    place_component(board, 'J_LAMP12V_OUT1',  98.0, 134.0, 90)
    place_component(board, 'J_RELAY_CTRL1',   74.0, 130.0, 0)

    # Bottom row: Bus link, Pullup, Relay power latch contact
    place_component(board, 'J_BUS_LINK2',     46.0, 152.0, 0)
    place_component(board, 'R_RL6_PU1',       62.0, 148.0, 0)
    place_component(board, 'J_RL6_ESP2_PWR',  86.0, 152.0, 0)

    # FRONT SILKSCREEN (F.SilkS)
    add_pcb_text(board, "B2 - SENSOR & RELAY NODE (A6 1-LAYER)", 20.0, 159.0, pcbnew.F_SilkS, 1.4, 0.25)
    add_pcb_text(board, "LM2596 #2: 12V BAT -> 5V ESP2", 60.0, 14.0, pcbnew.F_SilkS, 1.2, 0.22)
    add_pcb_text(board, "ESP32 SENSOR NODE", 60.7, 62.0, pcbnew.F_SilkS, 1.3, 0.22)
    add_pcb_text(board, "ACS712 TRK", 23.0, 50.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "ACS712 STA", 23.0, 82.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "FZ0430 TRK", 23.0, 114.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "FZ0430 STA", 23.0, 138.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "PV TRK IN", 98.0, 53.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "DS18B20 TRK", 98.0, 72.0, pcbnew.F_SilkS, 1.0, 0.2)
    add_pcb_text(board, "PV STA IN", 98.0, 89.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "DS18B20 STA", 98.0, 107.0, pcbnew.F_SilkS, 1.0, 0.2)
    add_pcb_text(board, "DEN 12V", 98.0, 127.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "RELAY 6CH", 74.0, 122.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "BUS LINK TO B1", 46.0, 158.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "RELAY 6 ESP2 PWR", 86.0, 158.0, pcbnew.F_SilkS, 1.0, 0.2)

    # BOTTOM SILKSCREEN (B.SilkS) - Only pin definitions for manual soldering / wiring
    add_pcb_text(board, "+5V GND SDA SCL TX1 RX1", 46.0, 148.0, pcbnew.B_SilkS, 0.9, 0.18, mirror=True)
    add_pcb_text(board, "PWR_IN  PWR_OUT", 86.0, 148.0, pcbnew.B_SilkS, 0.9, 0.18, mirror=True)
    add_pcb_text(board, "PV+  PV-", 92.0, 60.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "3V3 DQ GND", 92.0, 78.0, pcbnew.B_SilkS, 0.9, 0.18, mirror=True)
    add_pcb_text(board, "PV+  PV-", 92.0, 96.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "3V3 DQ GND", 92.0, 114.0, pcbnew.B_SilkS, 0.9, 0.18, mirror=True)
    add_pcb_text(board, "12V+ 12V-", 92.0, 134.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "VCC IN1 IN2 IN3 IN4 IN5 IN6 GND", 78.0, 138.0, pcbnew.B_SilkS, 0.8, 0.16, mirror=True)

def run_freerouting(dsn_path, ses_path):
    print(f"Launching Freerouting for {dsn_path}...")
    cmd = [
        "java",
        "-Djava.awt.headless=true",
        "-jar", FREEROUTING_JAR,
        "-de", dsn_path,
        "-do", ses_path,
        "-mp", "25"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("Freerouting STDOUT:", res.stdout[-400:] if res.stdout else "None")
    if res.returncode != 0:
        print("Freerouting STDERR:", res.stderr)
        raise RuntimeError("Freerouting failed!")
    print(f"Freerouting generated {ses_path} successfully!")

def add_gnd_copper_pour(board, x0=10.0, y0=10.0, w=100.0, h=152.0):
    """
    Adds a solid GND copper pour on B.Cu layer to minimize DIY etching area and provide shielding.
    """
    gnd_net = board.FindNet("GND")
    if not gnd_net:
        print("Warning: Net GND not found for copper pour!")
        return

    zone = board.AddArea(None, gnd_net.GetNetCode(), pcbnew.B_Cu, pcbnew.VECTOR2I(int(x0 * 1e6), int(y0 * 1e6)), pcbnew.CPolyLine.DIAGONAL_EDGE)
    outline = zone.Outline()
    outline.Clear()
    
    # Margin of 0.5mm inside edge cuts
    pts = [
        (x0 + 0.5, y0 + 0.5),
        (x0 + w - 0.5, y0 + 0.5),
        (x0 + w - 0.5, y0 + h - 0.5),
        (x0 + 0.5, y0 + h - 0.5)
    ]
    for px, py in pts:
        outline.Append(int(px * 1e6), int(py * 1e6))
        
    zone.SetZoneClearance(int(0.5 * 1e6))
    zone.SetMinThickness(int(0.4 * 1e6))
    zone.SetPadConnection(pcbnew.ZONE_CONNECTION_THERMAL)
    zone.SetThermalReliefGap(int(0.5 * 1e6))
    zone.SetThermalReliefCopperBridge(int(0.6 * 1e6))
    
    filler = pcbnew.ZONE_FILLER(board)
    filler.Fill(board.Zones())
    print("GND copper pour filled on B.Cu successfully.")

def build_board(board_dir, pcb_filename, apply_layout_func):
    pcb_path = os.path.join(board_dir, pcb_filename)
    dsn_path = pcb_path.replace(".kicad_pcb", ".dsn")
    ses_path = pcb_path.replace(".kicad_pcb", ".ses")
    
    # 1. Clean file structure
    clean_and_prepare_pcb(pcb_path)
    
    # 2. Load board and apply placement
    board = pcbnew.LoadBoard(pcb_path)
    apply_layout_func(board)
    board.Save(pcb_path)
    
    # 3. Export DSN
    pcbnew.ExportSpecctraDSN(board, dsn_path)
    print("Exported DSN:", dsn_path)
    
    # 4. Route with Freerouting
    run_freerouting(dsn_path, ses_path)
    
    # 5. Import SES
    board = pcbnew.LoadBoard(pcb_path)
    success = pcbnew.ImportSpecctraSES(board, ses_path)
    print("Imported SES:", success)
    
    # 6. Add GND plane
    add_gnd_copper_pour(board)
    board.Save(pcb_path)
    print(f"Finished {pcb_filename} successfully!\n")

if __name__ == '__main__':
    print("=== BUILDING BOARD 1 (TRACKER MASTER) A6 ===")
    build_board(BOARD1_DIR, "board1_tracker_master.kicad_pcb", apply_board1_layout)
    
    print("=== BUILDING BOARD 2 (SENSOR & RELAY NODE) A6 ===")
    build_board(BOARD2_DIR, "board2_sensor_relay.kicad_pcb", apply_board2_layout)
    print("=== ALL BOARDS BUILT ON A6 (100x152 mm) ===")
