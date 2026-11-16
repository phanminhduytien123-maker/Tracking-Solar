# =========================================================================
# FINALIZE DIY 1-LAYER DELIVERABLES (CLEAN PIN-DEFINITION SILKSCREEN)
# Removes unnecessary large titles, project banners, and student names.
# Places clean, compact, unambiguous pin definitions for every connector
# on both F.SilkS and B.SilkS (Bottom Silkscreen for back transfer).
# Exports 1:1 scale printable PDFs (Mirrored and Normal).
# =========================================================================
import pcbnew
import os
import subprocess
import zipfile
import shutil

BASE_DIR = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer"
DIR_B1 = os.path.join(BASE_DIR, "board1_tracker_master")
DIR_B2 = os.path.join(BASE_DIR, "board2_sensor_relay")
OUT_DIR = os.path.join(BASE_DIR, "deliverables")
ARTIFACT_DIR = r"C:\Users\ADMIN\.gemini\antigravity\brain\b07bdce5-a157-4a15-9f23-20c06a6e411e"
os.makedirs(OUT_DIR, exist_ok=True)

def mm_to_iu(val):
    return int(val * 1e6)

def clear_old_texts(board):
    for d in list(board.GetDrawings()):
        if isinstance(d, pcbnew.PCB_TEXT):
            board.Remove(d)

def add_label(board, text, x, y, size=1.0, thickness=0.18, both_sides=True):
    # 1. Top Silkscreen (F.SilkS)
    t_top = pcbnew.PCB_TEXT(board)
    t_top.SetText(text)
    t_top.SetPosition(pcbnew.VECTOR2I(mm_to_iu(x), mm_to_iu(y)))
    t_top.SetLayer(pcbnew.F_SilkS)
    t_top.SetMirrored(False)
    t_top.SetTextSize(pcbnew.VECTOR2I(mm_to_iu(size), mm_to_iu(size)))
    t_top.SetTextThickness(mm_to_iu(thickness))
    t_top.SetHorizJustify(pcbnew.GR_TEXT_H_ALIGN_CENTER)
    t_top.SetVertJustify(pcbnew.GR_TEXT_V_ALIGN_CENTER)
    board.Add(t_top)

    # 2. Bottom Silkscreen (B.SilkS) - mirrored for bottom viewing / transfer
    if both_sides:
        t_bot = pcbnew.PCB_TEXT(board)
        t_bot.SetText(text)
        t_bot.SetPosition(pcbnew.VECTOR2I(mm_to_iu(x), mm_to_iu(y)))
        t_bot.SetLayer(pcbnew.B_SilkS)
        t_bot.SetMirrored(True)
        t_bot.SetTextSize(pcbnew.VECTOR2I(mm_to_iu(size), mm_to_iu(size)))
        t_bot.SetTextThickness(mm_to_iu(thickness))
        t_bot.SetHorizJustify(pcbnew.GR_TEXT_H_ALIGN_CENTER)
        t_bot.SetVertJustify(pcbnew.GR_TEXT_V_ALIGN_CENTER)
        board.Add(t_bot)

def finalize_board1():
    pcb_path = os.path.join(DIR_B1, "board1_tracker_master.kicad_pcb")
    board = pcbnew.LoadBoard(pcb_path)
    clear_old_texts(board)

    # Minimal board indicator in corner
    add_label(board, "B1 - TRACKER MASTER", 57.5, 12.0, size=1.3, thickness=0.22)

    # 1. Power Terminals (Top edge)
    # J_PWR_GRID12V1
    add_label(board, "GRID 12V", 33.46, 13.5, size=1.1, thickness=0.2)
    add_label(board, "GND", 30.92, 21.0)
    add_label(board, "+12V", 36.00, 21.0)

    # J_PWR_BAT12V1
    add_label(board, "BAT 12V", 49.46, 13.5, size=1.1, thickness=0.2)
    add_label(board, "GND", 46.92, 21.0)
    add_label(board, "+12V", 52.00, 21.0)

    # 2. Limit Switches (Left edge)
    # J_SW1 (Home Az)
    add_label(board, "SW_AZ", 17.0, 16.5, size=1.1, thickness=0.2)
    add_label(board, "HOME", 23.5, 20.00)
    add_label(board, "GND", 23.5, 25.08)

    # J_SW2 (Home El)
    add_label(board, "SW_EL", 17.0, 30.5, size=1.1, thickness=0.2)
    add_label(board, "HOME", 23.5, 34.00)
    add_label(board, "GND", 23.5, 39.08)

    # 3. Encoders (Left edge)
    # J_ENC1_AZ1
    add_label(board, "ENC1_AZ", 17.0, 52.0, size=1.1, thickness=0.2)
    add_label(board, "+5V", 23.5, 56.00)
    add_label(board, "GND", 23.5, 61.08)
    add_label(board, "A", 23.5, 66.16)
    add_label(board, "B", 23.5, 71.24)

    # J_ENC2_EL1
    add_label(board, "ENC2_EL", 17.0, 76.0, size=1.1, thickness=0.2)
    add_label(board, "+5V", 23.5, 80.00)
    add_label(board, "GND", 23.5, 85.08)
    add_label(board, "A", 23.5, 90.16)
    add_label(board, "B", 23.5, 95.24)

    # 4. Stepper Driver DM556 Terminals (Left edge)
    # J_M1_AZ1
    add_label(board, "DM556 #1 (AZ)", 24.5, 103.5, size=1.1, thickness=0.2)
    add_label(board, "PUL+", 24.5, 108.00)
    add_label(board, "PUL-", 24.5, 113.08)
    add_label(board, "DIR+", 24.5, 118.16)
    add_label(board, "DIR-", 24.5, 123.24)
    add_label(board, "ENA+", 24.5, 128.32)
    add_label(board, "ENA-", 24.5, 133.40)

    # J_M2_EL1
    add_label(board, "DM556 #2 (EL)", 24.5, 135.5, size=1.1, thickness=0.2)
    add_label(board, "PUL+", 24.5, 140.00)
    add_label(board, "PUL-", 24.5, 145.08)
    add_label(board, "DIR+", 24.5, 150.16)
    add_label(board, "DIR-", 24.5, 155.24)
    add_label(board, "ENA+", 24.5, 160.32)
    add_label(board, "ENA-", 24.5, 165.40)

    # 5. Bus Link to Board 2 (Bottom edge)
    # J_BUS_LINK1
    add_label(board, "GND", 52.00, 169.5)
    add_label(board, "+12V", 57.08, 169.5)
    add_label(board, "CUT", 62.16, 169.5)
    add_label(board, "3V3", 67.24, 169.5)
    add_label(board, "LINK TO B2", 59.6, 180.5, size=1.1, thickness=0.2)

    # 6. TEMT6000 Light Sensor Header
    # J_TEMT_EXT1
    add_label(board, "TEMT6000", 90.25, 141.5, size=1.1, thickness=0.2)
    add_label(board, "3V3", 84.00, 149.0)
    add_label(board, "GND", 86.50, 149.0)
    add_label(board, "TOP", 89.00, 149.0)
    add_label(board, "BOT", 91.50, 149.0)
    add_label(board, "LFT", 94.00, 149.0)
    add_label(board, "RGT", 96.50, 149.0)

    # 7. Buck LM2596 #1
    add_label(board, "LM2596 #1 (12V->5V)", 57.5, 36.0, size=1.1, thickness=0.2)
    add_label(board, "IN +", 24.0, 33.46)
    add_label(board, "IN -", 24.0, 38.54)
    add_label(board, "OUT +", 91.0, 33.46)
    add_label(board, "OUT -", 91.0, 38.54)

    # 8. DS3231 RTC Header
    add_label(board, "DS3231", 88.0, 122.5, size=1.1, thickness=0.2)
    add_label(board, "3V3", 83.0, 126.92)
    add_label(board, "GND", 83.0, 129.46)
    add_label(board, "SCL", 83.0, 132.00)
    add_label(board, "SDA", 83.0, 134.54)

    # 9. INA226 TRK & STA Headers
    add_label(board, "INA_TRK", 49.0, 157.5, size=1.1, thickness=0.2)
    add_label(board, "SCL", 45.27, 165.5)
    add_label(board, "SDA", 47.81, 165.5)
    add_label(board, "GND", 50.35, 165.5)
    add_label(board, "3V3", 52.89, 165.5)

    add_label(board, "INA_STA", 73.0, 157.5, size=1.1, thickness=0.2)
    add_label(board, "SCL", 69.27, 165.5)
    add_label(board, "SDA", 71.81, 165.5)
    add_label(board, "GND", 74.35, 165.5)
    add_label(board, "3V3", 76.89, 165.5)

    # 10. ESP32 Master Corner Markers
    add_label(board, "ESP32 MASTER", 53.7, 74.0, size=1.1, thickness=0.2)
    add_label(board, "3V3", 36.5, 78.0)
    add_label(board, "GND", 36.5, 131.34)
    add_label(board, "5V", 36.5, 128.80)

    # Refill zones
    filler = pcbnew.ZONE_FILLER(board)
    filler.Fill(board.Zones())
    board.Save(pcb_path)
    print("[V] Board 1 updated with clean pin-definition silkscreen on F.SilkS and B.SilkS.")

def finalize_board2():
    pcb_path = os.path.join(DIR_B2, "board2_sensor_relay.kicad_pcb")
    board = pcbnew.LoadBoard(pcb_path)
    clear_old_texts(board)

    # Minimal board indicator in corner
    add_label(board, "B2 - SENSOR & RELAY", 57.5, 12.0, size=1.3, thickness=0.22)

    # 1. Bus Link from Board 1 (Bottom edge)
    # J_BUS_LINK2
    add_label(board, "GND", 38.00, 169.5)
    add_label(board, "+12V", 43.08, 169.5)
    add_label(board, "CUT", 48.16, 169.5)
    add_label(board, "3V3", 53.24, 169.5)
    add_label(board, "LINK FROM B1", 45.6, 180.5, size=1.1, thickness=0.2)

    # 2. Relay 6 Contact for ESP2 Power Cut
    # J_RL6_ESP2_PWR
    add_label(board, "5V_PRE", 88.00, 169.5)
    add_label(board, "5V_ESP", 93.08, 169.5)
    add_label(board, "RL6 CUT", 90.5, 180.5, size=1.1, thickness=0.2)

    # 3. Sensors & Lamp Terminals (Right edge)
    # J_PV_TRK_IN1
    add_label(board, "PV_TRK", 91.5, 60.5, size=1.1, thickness=0.2)
    add_label(board, "PV+", 91.5, 64.92)
    add_label(board, "GND", 91.5, 70.00)

    # J_TEMP_TRK1
    add_label(board, "TEMP_TRK", 91.5, 75.5, size=1.1, thickness=0.2)
    add_label(board, "GND", 91.5, 79.84)
    add_label(board, "DQ", 91.5, 84.92)
    add_label(board, "3V3", 91.5, 90.00)

    # J_PV_STA_IN1
    add_label(board, "PV_STA", 91.5, 102.5, size=1.1, thickness=0.2)
    add_label(board, "PV+", 91.5, 106.92)
    add_label(board, "GND", 91.5, 112.00)

    # J_TEMP_STA1
    add_label(board, "TEMP_STA", 91.5, 117.5, size=1.1, thickness=0.2)
    add_label(board, "GND", 91.5, 121.84)
    add_label(board, "DQ", 91.5, 126.92)
    add_label(board, "3V3", 91.5, 132.00)

    # J_LAMP12V_OUT1
    add_label(board, "LAMP 12V", 91.5, 145.5, size=1.1, thickness=0.2)
    add_label(board, "+12V", 91.5, 149.92)
    add_label(board, "GND", 91.5, 155.00)

    # 4. Relay 6ch Header
    # J_RELAY_CTRL1
    add_label(board, "RELAY 6CH", 80.5, 131.5, size=1.1, thickness=0.2)
    add_label(board, "GND", 80.5, 136.00)
    add_label(board, "IN1", 80.5, 138.54)
    add_label(board, "IN2", 80.5, 141.08)
    add_label(board, "IN3", 80.5, 143.62)
    add_label(board, "IN4", 80.5, 146.16)
    add_label(board, "IN5", 80.5, 148.70)
    add_label(board, "IN6", 80.5, 151.24)
    add_label(board, "VCC", 80.5, 153.78)

    # 5. Buck LM2596 #2
    add_label(board, "LM2596 #2 (12V->5V)", 57.5, 36.0, size=1.1, thickness=0.2)
    add_label(board, "IN +", 24.0, 33.46)
    add_label(board, "IN -", 24.0, 38.54)
    add_label(board, "OUT +", 91.0, 33.46)
    add_label(board, "OUT -", 91.0, 38.54)

    # 6. ACS712 Current Sensors (Left edge)
    add_label(board, "ACS_TRK", 23.0, 77.0, size=1.1, thickness=0.2)
    add_label(board, "IP+", 20.46, 62.0)
    add_label(board, "IP-", 25.54, 62.0)
    add_label(board, "VCC", 20.46, 94.0)
    add_label(board, "OUT", 23.00, 94.0)
    add_label(board, "GND", 25.54, 94.0)

    add_label(board, "ACS_STA", 23.0, 115.0, size=1.1, thickness=0.2)
    add_label(board, "IP+", 20.46, 100.0)
    add_label(board, "IP-", 25.54, 100.0)
    add_label(board, "VCC", 20.46, 132.0)
    add_label(board, "OUT", 23.00, 132.0)
    add_label(board, "GND", 25.54, 132.0)

    # 7. FZ0430 Voltage Sensors
    add_label(board, "FZ_TRK", 23.0, 149.0, size=1.1, thickness=0.2)
    add_label(board, "+", 20.46, 138.5)
    add_label(board, "-", 25.54, 138.5)
    add_label(board, "-", 20.46, 165.5)
    add_label(board, "S", 25.54, 165.5)

    add_label(board, "FZ_STA", 50.0, 143.0, size=1.1, thickness=0.2)
    add_label(board, "+", 47.46, 132.5)
    add_label(board, "-", 52.54, 132.5)
    add_label(board, "-", 47.46, 159.5)
    add_label(board, "S", 52.54, 159.5)

    # 8. ESP32 Node 2 Corner Markers
    add_label(board, "ESP32 NODE 2", 60.7, 66.0, size=1.1, thickness=0.2)
    add_label(board, "3V3", 43.5, 70.0)
    add_label(board, "5V", 43.5, 120.80)
    add_label(board, "GND", 43.5, 123.34)

    # Refill zones
    filler = pcbnew.ZONE_FILLER(board)
    filler.Fill(board.Zones())
    board.Save(pcb_path)
    print("[V] Board 2 updated with clean pin-definition silkscreen on F.SilkS and B.SilkS.")

def export_pdfs():
    print("\n" + "="*60)
    print("EXPORTING 1:1 PRINTABLE PDFs")
    print("="*60)

    for bnum, dir_name, pcb_file in [
        ('1', 'board1_tracker_master', 'board1_tracker_master.kicad_pcb'),
        ('2', 'board2_sensor_relay', 'board2_sensor_relay.kicad_pcb')
    ]:
        pcb_path = os.path.join(BASE_DIR, dir_name, pcb_file)

        # 1. Mirrored Bottom Copper (B.Cu + Edge.Cuts) for direct toner transfer / photoresist
        pdf_b_cu = os.path.join(OUT_DIR, f"Board{bnum}_B_Cu_Mirrored_1to1.pdf")
        subprocess.run([
            "D:\\KiCAD\\bin\\kicad-cli.exe", "pcb", "export", "pdf",
            "--layers", "B.Cu,Edge.Cuts",
            "--mirror",
            "--black-and-white",
            "--output", pdf_b_cu,
            pcb_path
        ], check=True)
        print(f"    Exported Mirrored B.Cu PDF (1:1 scale): {pdf_b_cu}")

        # 2. Normal Bottom Copper (for reference / inspection)
        pdf_b_cu_norm = os.path.join(OUT_DIR, f"Board{bnum}_B_Cu_Normal_1to1.pdf")
        subprocess.run([
            "D:\\KiCAD\\bin\\kicad-cli.exe", "pcb", "export", "pdf",
            "--layers", "B.Cu,Edge.Cuts",
            "--black-and-white",
            "--output", pdf_b_cu_norm,
            pcb_path
        ], check=True)
        print(f"    Exported Normal B.Cu PDF (1:1 scale): {pdf_b_cu_norm}")

        # 3. Mirrored Bottom Silkscreen (B.Silkscreen + Edge.Cuts) for heat-transfer / ironing onto back of PCB
        pdf_b_silk_mirror = os.path.join(OUT_DIR, f"Board{bnum}_B_Silkscreen_Mirrored_1to1.pdf")
        subprocess.run([
            "D:\\KiCAD\\bin\\kicad-cli.exe", "pcb", "export", "pdf",
            "--layers", "B.Silkscreen,Edge.Cuts",
            "--mirror",
            "--black-and-white",
            "--output", pdf_b_silk_mirror,
            pcb_path
        ], check=True)
        print(f"    Exported Mirrored B.Silkscreen PDF (1:1 scale): {pdf_b_silk_mirror}")

        # 4. Normal Bottom Silkscreen (B.Silkscreen + Edge.Cuts) for direct sticker / screen printing / viewing
        pdf_b_silk_norm = os.path.join(OUT_DIR, f"Board{bnum}_B_Silkscreen_Normal_1to1.pdf")
        subprocess.run([
            "D:\\KiCAD\\bin\\kicad-cli.exe", "pcb", "export", "pdf",
            "--layers", "B.Silkscreen,Edge.Cuts",
            "--black-and-white",
            "--output", pdf_b_silk_norm,
            pcb_path
        ], check=True)
        print(f"    Exported Normal B.Silkscreen PDF (1:1 scale): {pdf_b_silk_norm}")

        # 5. Top Silkscreen + Jumpers (F.Silkscreen + F.Cu + Edge.Cuts) for assembling top side
        pdf_top = os.path.join(OUT_DIR, f"Board{bnum}_Top_Silkscreen_and_Jumpers_1to1.pdf")
        subprocess.run([
            "D:\\KiCAD\\bin\\kicad-cli.exe", "pcb", "export", "pdf",
            "--layers", "F.Silkscreen,F.Cu,Edge.Cuts",
            "--output", pdf_top,
            pcb_path
        ], check=True)
        print(f"    Exported Top Assembly / Jumper PDF (1:1 scale): {pdf_top}")

def run_drc():
    print("\n" + "="*60)
    print("RUNNING FINAL DRC ON BOTH BOARDS")
    print("="*60)
    for bnum, dir_name, pcb_file in [
        ('1', 'board1_tracker_master', 'board1_tracker_master.kicad_pcb'),
        ('2', 'board2_sensor_relay', 'board2_sensor_relay.kicad_pcb')
    ]:
        pcb_path = os.path.join(BASE_DIR, dir_name, pcb_file)
        rpt_path = os.path.join(OUT_DIR, f"Board{bnum}_DRC_Report.rpt")
        subprocess.run(["D:\\KiCAD\\bin\\kicad-cli.exe", "pcb", "drc", "--output", rpt_path, pcb_path], check=True)
        with open(rpt_path, "r", encoding="utf-8") as f:
            lines = [l.strip() for l in f.readlines() if "found" in l.lower()]
        print(f"    Board {bnum} DRC: {', '.join(lines)}")

def copy_to_artifacts():
    print("\n" + "="*60)
    print("COPYING DELIVERABLES TO ARTIFACT DIRECTORY")
    print("="*60)
    for fn in os.listdir(OUT_DIR):
        src = os.path.join(OUT_DIR, fn)
        if os.path.isfile(src):
            shutil.copy2(src, ARTIFACT_DIR)
            print(f"    Copied {fn} to artifact directory")

def package_zip():
    zip_path = os.path.join(BASE_DIR, "solar_tracker_diy_1layer_deliverables.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for fn in os.listdir(OUT_DIR):
            fpath = os.path.join(OUT_DIR, fn)
            if os.path.isfile(fpath):
                z.write(fpath, arcname=fn)
    shutil.copy2(zip_path, ARTIFACT_DIR)
    print(f"\n[V] Packaged all deliverables to: {zip_path}")
    print(f"[V] Copied ZIP to artifact directory: {ARTIFACT_DIR}")

if __name__ == "__main__":
    finalize_board1()
    finalize_board2()
    run_drc()
    export_pdfs()
    copy_to_artifacts()
    package_zip()
