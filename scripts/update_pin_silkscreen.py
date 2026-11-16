# =========================================================================
# UPDATE PIN SILKSCREEN & EXPORT DELIVERABLES
# Clean text replacement directly in S-expression to avoid SWIG leaks.
# Corrects Mini560 vs LM2596 module definitions and moves B1/B2 labels
# to spacious, empty corners.
# =========================================================================
import os
import re
import uuid
import subprocess
import shutil
import zipfile

BASE_DIR = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer"
DIR_B1 = os.path.join(BASE_DIR, "board1_tracker_master")
DIR_B2 = os.path.join(BASE_DIR, "board2_sensor_relay")
OUT_DIR = os.path.join(BASE_DIR, "deliverables")
ARTIFACT_DIR = r"C:\Users\ADMIN\.gemini\antigravity\brain\b07bdce5-a157-4a15-9f23-20c06a6e411e"
KICAD_CLI = r"D:\KiCAD\bin\kicad-cli.exe"
KICAD_PY = r"D:\KiCAD\bin\python.exe"

os.makedirs(OUT_DIR, exist_ok=True)

def strip_gr_texts(content):
    out = []
    i = 0
    n = len(content)
    while i < n:
        idx = content.find('(gr_text', i)
        if idx == -1:
            out.append(content[i:])
            break
        out.append(content[i:idx])
        depth = 0
        j = idx
        while j < n:
            if content[j] == '(':
                depth += 1
            elif content[j] == ')':
                depth -= 1
                if depth == 0:
                    j += 1
                    while j < n and content[j] in ' \t\r\n':
                        j += 1
                    break
            j += 1
        i = j
    return ''.join(out)

def make_gr_text(text, x, y, layer="F.SilkS", size=0.9, thickness=0.15, mirrored=False):
    u = str(uuid.uuid4())
    justify_str = "\n\t\t\t(justify mirror)" if mirrored else ""
    return f"""\t(gr_text "{text}"
\t\t(at {x:.3f} {y:.3f} 0)
\t\t(layer "{layer}")
\t\t(uuid "{u}")
\t\t(effects
\t\t\t(font
\t\t\t\t(size {size} {size})
\t\t\t\t(thickness {thickness})
\t\t\t){justify_str}
\t\t)
\t)
"""

def build_board1_texts():
    texts = []
    
    def add(t, x, y, s=0.9, th=0.15):
        # Top side
        texts.append(make_gr_text(t, x, y, "F.SilkS", s, th, mirrored=False))
        # Bottom side (for transferring onto back of PCB)
        texts.append(make_gr_text(t, x, y, "B.SilkS", s, th, mirrored=True))

    # Board indicator moved to completely empty bottom-right corner
    add("B1 - TRACKER MASTER", 85.0, 178.0, 1.2, 0.20)

    # 1. Power Terminals (Top edge)
    # J_PWR_GRID12V1 (Pad 1: 36.00, Pad 2: 30.92, Y=16.00)
    add("12V GRID", 33.46, 12.0, 1.0, 0.18)
    add("GND", 30.92, 19.5)
    add("+12V", 36.00, 19.5)

    # J_PWR_BAT12V1 (Pad 1: 52.00, Pad 2: 46.92, Y=16.00)
    add("12V BAT", 49.46, 12.0, 1.0, 0.18)
    add("GND", 46.92, 19.5)
    add("+12V", 52.00, 19.5)

    # 2. Limit Switches (Left edge, placed at X=26.0)
    add("SW_AZ", 26.0, 16.5, 1.0, 0.18)
    add("HOME", 26.0, 20.00)
    add("GND", 26.0, 25.08)

    add("SW_EL", 26.0, 30.0, 1.0, 0.18)
    add("HOME", 26.0, 34.00)
    add("GND", 26.0, 39.08)

    # 3. Encoders (Left edge)
    add("ENC1_AZ", 26.0, 52.0, 1.0, 0.18)
    add("+5V", 26.0, 56.00)
    add("GND", 26.0, 61.08)
    add("A", 26.0, 66.16)
    add("B", 26.0, 71.24)

    add("ENC2_EL", 26.0, 76.0, 1.0, 0.18)
    add("+5V", 26.0, 80.00)
    add("GND", 26.0, 85.08)
    add("A", 26.0, 90.16)
    add("B", 26.0, 95.24)

    # 4. Stepper Driver DM556 Terminals (Left edge)
    add("M1_AZ", 26.0, 103.5, 1.0, 0.18)
    add("PUL+", 26.0, 108.00)
    add("PUL-", 26.0, 113.08)
    add("DIR+", 26.0, 118.16)
    add("DIR-", 26.0, 123.24)
    add("ENA+", 26.0, 128.32)
    add("ENA-", 26.0, 133.40)

    add("M2_EL", 26.0, 135.5, 1.0, 0.18)
    add("PUL+", 26.0, 140.00)
    add("PUL-", 26.0, 145.08)
    add("DIR+", 26.0, 150.16)
    add("DIR-", 26.0, 155.24)
    add("ENA+", 26.0, 160.32)
    add("ENA-", 26.0, 165.40)

    # 5. Bus Link to Board 2 (Bottom edge)
    add("GND", 52.00, 166.5)
    add("+12V", 57.08, 166.5)
    add("CUT", 62.16, 166.5)
    add("3V3", 67.24, 166.5)
    add("LINK TO B2", 59.6, 163.5, 1.0, 0.18)

    # 6. TEMT6000 Light Sensor Header
    add("TEMT6000", 90.25, 141.5, 1.0, 0.18)
    add("3V3", 84.00, 149.0)
    add("GND", 86.50, 149.0)
    add("TOP", 89.00, 149.0)
    add("BOT", 91.50, 149.0)
    add("LFT", 94.00, 149.0)
    add("RGT", 96.50, 149.0)

    # 7. Buck 1: MINI560 PRO (Hạ áp 12V Grid -> 5V nuôi 2 Encoder)
    add("MINI560 (5V ENC)", 48.0, 42.0, 1.0, 0.18)
    # Output 5V ENC (đỉnh module, P3: 43.54, P4: 52.46, Y=27.50)
    add("OUT 5V", 48.0, 24.5, 0.9, 0.16)
    add("+5V", 43.54, 30.5)
    add("GND", 52.46, 30.5)
    # Input 12V GRID (đáy module, P1: 43.54, P2: 52.46, Y=56.50)
    add("+12V", 43.54, 53.0)
    add("GND", 52.46, 53.0)
    add("IN 12V", 48.0, 59.5, 0.9, 0.16)

    # 8. Buck 2: LM2596 Voltmeter (Hạ áp 12V Bat -> 5V nuôi ESP32 Master)
    add("LM2596 (5V ESP1)", 81.0, 42.0, 1.0, 0.18)
    # Input 12V BAT (đỉnh module, P1: 83.54, P2: 78.46, Y=14.00)
    add("IN 12V", 81.0, 12.0, 0.9, 0.16)
    add("+12V", 83.54, 17.5)
    add("GND", 78.46, 17.5)
    # Output 5V ESP1 (đáy module, P3: 83.54, P4: 78.46, Y=70.00)
    add("+5V", 83.54, 66.5)
    add("GND", 78.46, 66.5)
    add("OUT 5V", 81.0, 73.0, 0.9, 0.16)

    # 9. DS3231 RTC Header
    add("DS3231", 88.0, 122.5, 1.0, 0.18)
    add("3V3", 83.0, 126.92)
    add("GND", 83.0, 129.46)
    add("SCL", 83.0, 132.00)
    add("SDA", 83.0, 134.54)

    # 10. INA226 TRK & STA Headers
    add("INA_TRK", 49.0, 157.5, 1.0, 0.18)
    add("SCL", 45.27, 166.0)
    add("SDA", 47.81, 166.0)
    add("GND", 50.35, 166.0)
    add("3V3", 52.89, 166.0)

    add("INA_STA", 73.0, 157.5, 1.0, 0.18)
    add("SCL", 69.27, 166.0)
    add("SDA", 71.81, 166.0)
    add("GND", 74.35, 166.0)
    add("3V3", 76.89, 166.0)

    # 11. ESP32 Master Corner Markers
    add("ESP32 MASTER", 53.7, 74.0, 1.0, 0.18)
    add("3V3", 36.5, 78.0)
    add("GND", 36.5, 131.34)
    add("5V", 36.5, 128.80)

    return texts

def build_board2_texts():
    texts = []
    
    def add(t, x, y, s=0.9, th=0.15):
        texts.append(make_gr_text(t, x, y, "F.SilkS", s, th, mirrored=False))
        texts.append(make_gr_text(t, x, y, "B.SilkS", s, th, mirrored=True))

    # Board indicator moved to completely empty bottom-left corner
    add("B2 - SENSOR & RELAY", 23.0, 178.0, 1.2, 0.20)

    # 1. Bus Link from Board 1 (Bottom edge)
    add("GND", 38.00, 166.5)
    add("+12V", 43.08, 166.5)
    add("CUT", 48.16, 166.5)
    add("3V3", 53.24, 166.5)
    add("LINK FROM B1", 45.6, 163.5, 1.0, 0.18)

    # 2. Relay 6 Contact for ESP2 Power Cut
    add("5V_PRE", 88.00, 166.5)
    add("5V_ESP", 93.08, 166.5)
    add("RL6 CUT", 90.5, 163.5, 1.0, 0.18)

    # 3. Sensors & Lamp Terminals (Right edge)
    add("PV_TRK", 88.5, 60.5, 1.0, 0.18)
    add("PV+", 88.5, 64.92)
    add("GND", 88.5, 70.00)

    add("TEMP_TRK", 88.5, 75.5, 1.0, 0.18)
    add("GND", 88.5, 79.84)
    add("DQ", 88.5, 84.92)
    add("3V3", 88.5, 90.00)

    add("PV_STA", 88.5, 102.5, 1.0, 0.18)
    add("PV+", 88.5, 106.92)
    add("GND", 88.5, 112.00)

    add("TEMP_STA", 88.5, 117.5, 1.0, 0.18)
    add("GND", 88.5, 121.84)
    add("DQ", 88.5, 126.92)
    add("3V3", 88.5, 132.00)

    add("LAMP 12V", 88.5, 145.5, 1.0, 0.18)
    add("+12V", 88.5, 149.92)
    add("GND", 88.5, 155.00)

    # 4. Relay 6ch Header
    add("RELAY 6CH", 79.5, 131.5, 1.0, 0.18)
    add("GND", 79.5, 136.00)
    add("IN1", 79.5, 138.54)
    add("IN2", 79.5, 141.08)
    add("IN3", 79.5, 143.62)
    add("IN4", 79.5, 146.16)
    add("IN5", 79.5, 148.70)
    add("IN6", 79.5, 151.24)
    add("VCC", 79.5, 153.78)

    # 5. Buck LM2596 #2 (Hạ áp 12V Bat -> 5V nuôi ESP32 Node 2)
    add("LM2596 (5V ESP2)", 57.5, 36.0, 1.0, 0.18)
    add("IN 12V", 29.5, 29.0, 0.9, 0.16)
    add("+12V", 34.0, 33.46)
    add("GND", 34.0, 38.54)
    add("OUT 5V", 85.5, 29.0, 0.9, 0.16)
    add("+5V", 81.0, 33.46)
    add("GND", 81.0, 38.54)

    # 6. ACS712 Current Sensors (Left edge)
    add("ACS_TRK", 23.0, 77.0, 1.0, 0.18)
    add("IP+", 20.46, 62.0)
    add("IP-", 25.54, 62.0)
    add("VCC", 20.46, 94.0)
    add("OUT", 23.00, 94.0)
    add("GND", 25.54, 94.0)

    add("ACS_STA", 23.0, 115.0, 1.0, 0.18)
    add("IP+", 20.46, 100.0)
    add("IP-", 25.54, 100.0)
    add("VCC", 20.46, 132.0)
    add("OUT", 23.00, 132.0)
    add("GND", 25.54, 132.0)

    # 7. FZ0430 Voltage Sensors
    add("FZ_TRK", 23.0, 149.0, 1.0, 0.18)
    add("+", 20.46, 138.5)
    add("-", 25.54, 138.5)
    add("-", 20.46, 165.5)
    add("S", 25.54, 165.5)

    add("FZ_STA", 50.0, 143.0, 1.0, 0.18)
    add("+", 47.46, 132.5)
    add("-", 52.54, 132.5)
    add("-", 47.46, 159.5)
    add("S", 52.54, 159.5)

    # 8. ESP32 Node 2 Corner Markers
    add("ESP32 NODE 2", 60.7, 66.0, 1.0, 0.18)
    add("3V3", 43.5, 70.0)
    add("5V", 43.5, 120.80)
    add("GND", 43.5, 123.34)

    return texts

def patch_pcb_file(pcb_path, texts):
    with open(pcb_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    stripped = strip_gr_texts(content)
    last_paren = stripped.rfind(")")
    new_content = stripped[:last_paren] + "\n" + "".join(texts) + "\n)\n"
    
    with open(pcb_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"[V] Updated {os.path.basename(pcb_path)} with {len(texts)} silkscreen text elements.")

def refill_zones():
    print("\n" + "="*60)
    print("REFILLING ZONES VIA KICAD PYTHON")
    print("="*60)
    script = """
import pcbnew
for p in [r"d:\\DOANTOTNGHIEP\\hardware\\solar_tracker_diy_1layer\\board1_tracker_master\\board1_tracker_master.kicad_pcb",
          r"d:\\DOANTOTNGHIEP\\hardware\\solar_tracker_diy_1layer\\board2_sensor_relay\\board2_sensor_relay.kicad_pcb"]:
    b = pcbnew.LoadBoard(p)
    filler = pcbnew.ZONE_FILLER(b)
    filler.Fill(b.Zones())
    b.Save(p)
    print("Zones refilled for:", p)
"""
    cmd = [KICAD_PY, "-c", script]
    subprocess.run(cmd, check=True)

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
        cmd = [KICAD_CLI, "pcb", "drc", "--output", rpt_path, pcb_path]
        subprocess.run(cmd, check=True)
        with open(rpt_path, "r", encoding="utf-8") as f:
            lines = [l.strip() for l in f.readlines() if "found" in l.lower()]
        print(f"    Board {bnum} DRC: {', '.join(lines)}")

def export_pdfs():
    print("\n" + "="*60)
    print("EXPORTING 1:1 PRINTABLE PDFs (INCLUDING B.SILKSCREEN FOR BACK COATING)")
    print("="*60)
    for bnum, dir_name, pcb_file in [
        ('1', 'board1_tracker_master', 'board1_tracker_master.kicad_pcb'),
        ('2', 'board2_sensor_relay', 'board2_sensor_relay.kicad_pcb')
    ]:
        pcb_path = os.path.join(BASE_DIR, dir_name, pcb_file)

        # 1. Mirrored Bottom Copper (B.Cu + Edge.Cuts) for direct toner transfer / photoresist
        pdf_b_cu = os.path.join(OUT_DIR, f"Board{bnum}_B_Cu_Mirrored_1to1.pdf")
        subprocess.run([
            KICAD_CLI, "pcb", "export", "pdf",
            "--layers", "B.Cu,Edge.Cuts",
            "--mirror",
            "--black-and-white",
            "--output", pdf_b_cu,
            pcb_path
        ], check=True)
        print(f"    Exported Mirrored B.Cu PDF (1:1 scale): {pdf_b_cu}")

        # 2. Normal Bottom Copper (for inspection)
        pdf_b_cu_norm = os.path.join(OUT_DIR, f"Board{bnum}_B_Cu_Normal_1to1.pdf")
        subprocess.run([
            KICAD_CLI, "pcb", "export", "pdf",
            "--layers", "B.Cu,Edge.Cuts",
            "--black-and-white",
            "--output", pdf_b_cu_norm,
            pcb_path
        ], check=True)
        print(f"    Exported Normal B.Cu PDF (1:1 scale): {pdf_b_cu_norm}")

        # 3. Mirrored Bottom Silkscreen (B.Silkscreen + Edge.Cuts) for heat-transfer / ironing onto back of PCB
        pdf_b_silk_mirror = os.path.join(OUT_DIR, f"Board{bnum}_B_Silkscreen_Mirrored_1to1.pdf")
        subprocess.run([
            KICAD_CLI, "pcb", "export", "pdf",
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
            KICAD_CLI, "pcb", "export", "pdf",
            "--layers", "B.Silkscreen,Edge.Cuts",
            "--black-and-white",
            "--output", pdf_b_silk_norm,
            pcb_path
        ], check=True)
        print(f"    Exported Normal B.Silkscreen PDF (1:1 scale): {pdf_b_silk_norm}")

        # 5. Top Silkscreen + Jumpers (F.Silkscreen + F.Cu + Edge.Cuts) for assembling top side
        pdf_top = os.path.join(OUT_DIR, f"Board{bnum}_Top_Silkscreen_and_Jumpers_1to1.pdf")
        subprocess.run([
            KICAD_CLI, "pcb", "export", "pdf",
            "--layers", "F.Silkscreen,F.Cu,Edge.Cuts",
            "--output", pdf_top,
            pcb_path
        ], check=True)
        print(f"    Exported Top Assembly / Jumper PDF (1:1 scale): {pdf_top}")

def render_3d():
    print("\n" + "="*60)
    print("GENERATING 3D RENDERS (TOP, BOTTOM, ISO)")
    print("="*60)
    render_script = os.path.join(r"d:\DOANTOTNGHIEP\scripts", "render_diy_3d.py")
    subprocess.run([KICAD_PY, render_script], check=True)

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
    patch_pcb_file(os.path.join(DIR_B1, "board1_tracker_master.kicad_pcb"), build_board1_texts())
    patch_pcb_file(os.path.join(DIR_B2, "board2_sensor_relay.kicad_pcb"), build_board2_texts())
    refill_zones()
    run_drc()
    export_pdfs()
    render_3d()
    copy_to_artifacts()
    package_zip()
