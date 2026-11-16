"""
Finalizes a routed board:
- Imports SES file
- Adds front silkscreen labels & bottom silkscreen pin definitions
- Fills GND copper pour on B.Cu
- Exports high-res PCB Editor view (300 DPI PNG)
- Exports 1:1 scale fabrication PDFs
- Runs DRC report
"""
import os
import sys
import subprocess
import pcbnew

BASE_DIR = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6"
DELIVERABLES_DIR = os.path.join(BASE_DIR, "deliverables")
KICAD_CLI = r"D:\KiCAD\bin\kicad-cli.exe"
SYSTEM_PYTHON = r"C:\Users\ADMIN\AppData\Local\Programs\Python\Python312\python.exe"

os.makedirs(DELIVERABLES_DIR, exist_ok=True)

def add_pcb_text(board, text, x, y, layer_id, size_mm=1.1, thickness_mm=0.2, mirror=False):
    t = pcbnew.PCB_TEXT(board)
    t.SetText(text)
    t.SetPosition(pcbnew.VECTOR2I(int(x * 1e6), int(y * 1e6)))
    t.SetLayer(layer_id)
    t.SetTextSize(pcbnew.VECTOR2I(int(size_mm * 1e6), int(size_mm * 1e6)))
    t.SetTextThickness(int(thickness_mm * 1e6))
    if mirror:
        t.SetMirrored(True)
    board.Add(t)

def add_gnd_copper_pour(board, x0=10.0, y0=10.0, w=100.0, h=152.0):
    gnd_net = board.FindNet("/GND") or board.FindNet("GND")
    if not gnd_net:
        print("Warning: Net /GND or GND not found!")
        return

    # Check existing zones and remove any old GND zone
    for z in list(board.Zones()):
        if z.GetNetname() in ["/GND", "GND"] and z.GetLayer() == pcbnew.B_Cu:
            board.Delete(z)

    z = pcbnew.ZONE(board)
    z.SetLayer(pcbnew.B_Cu)
    z.SetNetCode(gnd_net.GetNetCode())
    z.SetAssignedPriority(0)
    z.SetPadConnection(pcbnew.ZONE_CONNECTION_THERMAL)
    z.SetThermalReliefGap(int(0.45 * 1e6))
    z.SetThermalReliefSpokeWidth(int(0.6 * 1e6))
    z.SetLocalClearance(int(0.45 * 1e6))
    z.SetMinThickness(int(0.35 * 1e6))

    pts = pcbnew.SHAPE_LINE_CHAIN()
    pts.Append(int((x0 + 0.6) * 1e6), int((y0 + 0.6) * 1e6))
    pts.Append(int((x0 + w - 0.6) * 1e6), int((y0 + 0.6) * 1e6))
    pts.Append(int((x0 + w - 0.6) * 1e6), int((y0 + h - 0.6) * 1e6))
    pts.Append(int((x0 + 0.6) * 1e6), int((y0 + h - 0.6) * 1e6))
    pts.SetClosed(True)

    poly = pcbnew.SHAPE_POLY_SET()
    poly.AddOutline(pts)
    z.SetOutline(poly)

    board.Add(z)
    filler = pcbnew.ZONE_FILLER(board)
    filler.Fill(board.Zones())
    print("GND copper pour filled on B.Cu successfully.")

def decorate_board1(board):
    print("Adding clean text & pin definitions for Board 1...")
    # FRONT SILKSCREEN
    add_pcb_text(board, "B1 - TRACKER MASTER (A6 1-LAYER)", 20.0, 159.0, pcbnew.F_SilkS, 1.3, 0.22)
    add_pcb_text(board, "12V TO ONG", 36.0, 11.5, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "12V AC QUY", 52.0, 11.5, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "MINI560: 12V GRID -> 5V ENC", 45.0, 28.0, pcbnew.F_SilkS, 1.0, 0.2)
    add_pcb_text(board, "LM2596 #1: 12V BAT -> 5V ESP1", 86.0, 20.0, pcbnew.F_SilkS, 1.0, 0.2)
    add_pcb_text(board, "ESP32 MASTER", 54.7, 72.0, pcbnew.F_SilkS, 1.3, 0.22)
    add_pcb_text(board, "DS3231 RTC", 90.0, 80.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "TEMT6000", 90.0, 115.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "INA226 TRK", 34.0, 134.0, pcbnew.F_SilkS, 1.1, 0.2)
    add_pcb_text(board, "BUS LINK TO B2", 52.0, 158.0, pcbnew.F_SilkS, 1.0, 0.2)
    add_pcb_text(board, "INA226 STA", 88.0, 134.0, pcbnew.F_SilkS, 1.1, 0.2)

    # BOTTOM SILKSCREEN (B.SilkS) - Only pin definitions for manual soldering / wiring
    add_pcb_text(board, "GND  SW_AZ", 23.0, 18.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "GND  SW_EL", 23.0, 30.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "+5V  GND  A  B", 23.0, 48.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "+5V  GND  A  B", 23.0, 72.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "ENA+ ENA- DIR+ DIR- PUL+ PUL-", 24.0, 101.0, pcbnew.B_SilkS, 0.85, 0.16, mirror=True)
    add_pcb_text(board, "ENA+ ENA- DIR+ DIR- PUL+ PUL-", 24.0, 134.0, pcbnew.B_SilkS, 0.85, 0.16, mirror=True)
    add_pcb_text(board, "+12V  GND", 36.0, 20.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "+12V  GND", 52.0, 20.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "+5V GND SDA SCL TX2 RX2", 52.0, 148.0, pcbnew.B_SilkS, 0.85, 0.16, mirror=True)

def decorate_board2(board):
    print("Adding clean text & pin definitions for Board 2...")
    # FRONT SILKSCREEN
    add_pcb_text(board, "B2 - SENSOR & RELAY NODE (A6 1-LAYER)", 20.0, 159.0, pcbnew.F_SilkS, 1.3, 0.22)
    add_pcb_text(board, "LM2596 #2: 12V BAT -> 5V ESP2", 60.0, 14.0, pcbnew.F_SilkS, 1.1, 0.2)
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
    add_pcb_text(board, "BUS LINK TO B1", 46.0, 158.0, pcbnew.F_SilkS, 1.0, 0.2)
    add_pcb_text(board, "RELAY 6 ESP2 PWR", 86.0, 158.0, pcbnew.F_SilkS, 1.0, 0.2)

    # BOTTOM SILKSCREEN (B.SilkS)
    add_pcb_text(board, "+5V GND SDA SCL TX1 RX1", 46.0, 148.0, pcbnew.B_SilkS, 0.85, 0.16, mirror=True)
    add_pcb_text(board, "PWR_IN  PWR_OUT", 86.0, 148.0, pcbnew.B_SilkS, 0.85, 0.16, mirror=True)
    add_pcb_text(board, "PV+  PV-", 92.0, 60.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "3V3 DQ GND", 92.0, 78.0, pcbnew.B_SilkS, 0.9, 0.18, mirror=True)
    add_pcb_text(board, "PV+  PV-", 92.0, 96.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "3V3 DQ GND", 92.0, 114.0, pcbnew.B_SilkS, 0.9, 0.18, mirror=True)
    add_pcb_text(board, "12V+ 12V-", 92.0, 134.0, pcbnew.B_SilkS, 1.0, 0.18, mirror=True)
    add_pcb_text(board, "VCC IN1 IN2 IN3 IN4 IN5 IN6 GND", 78.0, 138.0, pcbnew.B_SilkS, 0.8, 0.16, mirror=True)

def export_renders_and_deliverables(board_num, pcb_path):
    name = f"board{board_num}"
    print(f"\n--- Exporting deliverables for {name} ---")
    
    # 1. PCB Editor High-Res View (PDF then 300 DPI PNG)
    editor_pdf = os.path.join(DELIVERABLES_DIR, f"{name}_pcb_editor.pdf")
    editor_png = os.path.join(DELIVERABLES_DIR, f"{name}_pcb_editor.png")
    subprocess.run([
        KICAD_CLI, "pcb", "export", "pdf",
        "--layers", "F.Cu,B.Cu,F.Silkscreen,B.Silkscreen,Edge.Cuts",
        "--output", editor_pdf,
        pcb_path
    ], check=True)
    
    render_code = f"""
import fitz
doc = fitz.open(r'{editor_pdf}')
page = doc.load_page(0)
pix = page.get_pixmap(dpi=300)
pix.save(r'{editor_png}')
print(f'Rendered {{pix.width}}x{{pix.height}}')
"""
    subprocess.run([SYSTEM_PYTHON, "-c", render_code], check=True)
    print(f"Generated PCB Editor image: {editor_png}")

    # 2. 1:1 Scale B.Cu Mirrored (for DIY etching iron-on transfer)
    bcu_pdf = os.path.join(DELIVERABLES_DIR, f"Board{board_num}_B_Cu_Mirrored_1to1.pdf")
    subprocess.run([
        KICAD_CLI, "pcb", "export", "pdf",
        "--layers", "B.Cu,Edge.Cuts",
        "--mirror",
        "--output", bcu_pdf,
        pcb_path
    ], check=True)

    # 3. 1:1 Scale B.SilkS Mirrored (for DIY back silkscreen iron-on)
    bsilk_pdf = os.path.join(DELIVERABLES_DIR, f"Board{board_num}_B_Silkscreen_Mirrored_1to1.pdf")
    subprocess.run([
        KICAD_CLI, "pcb", "export", "pdf",
        "--layers", "B.Silkscreen,Edge.Cuts",
        "--mirror",
        "--output", bsilk_pdf,
        pcb_path
    ], check=True)

    # 4. 1:1 Scale Top Assembly & Jumpers
    top_pdf = os.path.join(DELIVERABLES_DIR, f"Board{board_num}_Top_Silkscreen_and_Jumpers_1to1.pdf")
    subprocess.run([
        KICAD_CLI, "pcb", "export", "pdf",
        "--layers", "F.Cu,F.Silkscreen,Edge.Cuts",
        "--output", top_pdf,
        pcb_path
    ], check=True)

    # 5. DRC Report
    drc_rpt = os.path.join(DELIVERABLES_DIR, f"Board{board_num}_DRC_Report.rpt")
    subprocess.run([
        KICAD_CLI, "pcb", "drc",
        "--output", drc_rpt,
        pcb_path
    ])
    print(f"Generated DRC report: {drc_rpt}")

if __name__ == '__main__':
    b_num = sys.argv[1] if len(sys.argv) > 1 else "1"
    if b_num == "1":
        p = os.path.join(BASE_DIR, "board1_tracker_master", "board1_tracker_master.kicad_pcb")
        ses = p.replace(".kicad_pcb", ".ses")
        b = pcbnew.LoadBoard(p)
        print("Importing SES for Board 1:", ses)
        pcbnew.ImportSpecctraSES(b, ses)
        decorate_board1(b)
        add_gnd_copper_pour(b)
        b.Save(p)
        export_renders_and_deliverables(1, p)
    elif b_num == "2":
        p = os.path.join(BASE_DIR, "board2_sensor_relay", "board2_sensor_relay.kicad_pcb")
        ses = p.replace(".kicad_pcb", ".ses")
        b = pcbnew.LoadBoard(p)
        print("Importing SES for Board 2:", ses)
        pcbnew.ImportSpecctraSES(b, ses)
        decorate_board2(b)
        add_gnd_copper_pour(b)
        b.Save(p)
        export_renders_and_deliverables(2, p)
