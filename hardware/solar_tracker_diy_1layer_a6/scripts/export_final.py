import os
import shutil
import subprocess
import zipfile
from PIL import Image
import fitz # PyMuPDF

DELIV_DIR = r'd:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6\deliverables'
ARTIFACT_DIR = r'C:\Users\ADMIN\.gemini\antigravity\brain\b07bdce5-a157-4a15-9f23-20c06a6e411e'
KICAD_CLI = r'D:\KiCAD\bin\kicad-cli.exe'

B1_PCB = r'd:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6\board1_tracker_master\board1_tracker_master.kicad_pcb'
B2_PCB = r'd:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6\board2_sensor_relay\board2_sensor_relay.kicad_pcb'

os.makedirs(DELIV_DIR, exist_ok=True)

# 1. Export Board 1 PDFs
print("Exporting Board 1 plots...")
subprocess.run([KICAD_CLI, 'pcb', 'export', 'pdf',
                '--output', os.path.join(DELIV_DIR, 'board1_pcb_editor.pdf'),
                '--layers', 'B.Cu,F.Cu,Edge.Cuts,F.Silkscreen,B.Silkscreen',
                '--theme', 'kicad_default',
                B1_PCB], check=True)

subprocess.run([KICAD_CLI, 'pcb', 'export', 'pdf',
                '--output', os.path.join(DELIV_DIR, 'Board1_B_Cu_Mirrored_1to1.pdf'),
                '--layers', 'B.Cu,Edge.Cuts',
                '--mirror',
                '--black-and-white',
                B1_PCB], check=True)

subprocess.run([KICAD_CLI, 'pcb', 'export', 'pdf',
                '--output', os.path.join(DELIV_DIR, 'Board1_Top_Silkscreen_and_Jumpers_1to1.pdf'),
                '--layers', 'F.Silkscreen,F.Cu,Edge.Cuts',
                B1_PCB], check=True)

subprocess.run([KICAD_CLI, 'pcb', 'drc',
                '--output', os.path.join(DELIV_DIR, 'Board1_DRC_Report.rpt'),
                B1_PCB], check=True)

# 2. Export Board 2 PDFs
print("Exporting Board 2 plots...")
subprocess.run([KICAD_CLI, 'pcb', 'export', 'pdf',
                '--output', os.path.join(DELIV_DIR, 'board2_pcb_editor.pdf'),
                '--layers', 'B.Cu,F.Cu,Edge.Cuts,F.Silkscreen,B.Silkscreen',
                '--theme', 'kicad_default',
                B2_PCB], check=True)

subprocess.run([KICAD_CLI, 'pcb', 'export', 'pdf',
                '--output', os.path.join(DELIV_DIR, 'Board2_B_Cu_Mirrored_1to1.pdf'),
                '--layers', 'B.Cu,Edge.Cuts',
                '--mirror',
                '--black-and-white',
                B2_PCB], check=True)

subprocess.run([KICAD_CLI, 'pcb', 'export', 'pdf',
                '--output', os.path.join(DELIV_DIR, 'Board2_Top_Silkscreen_and_Jumpers_1to1.pdf'),
                '--layers', 'F.Silkscreen,F.Cu,Edge.Cuts',
                B2_PCB], check=True)

subprocess.run([KICAD_CLI, 'pcb', 'drc',
                '--output', os.path.join(DELIV_DIR, 'Board2_DRC_Report.rpt'),
                B2_PCB], check=True)

# 3. Render High-Res PNGs from PDFs using PyMuPDF (fitz)
print("Rendering High-Res PNGs at 300 DPI...")
def render_pdf_page(pdf_path, png_path, dpi=300):
    doc = fitz.open(pdf_path)
    page = doc.load_page(0)
    pix = page.get_pixmap(dpi=dpi)
    pix.save(png_path)
    doc.close()

b1_png = os.path.join(DELIV_DIR, 'board1_pcb_editor.png')
b2_png = os.path.join(DELIV_DIR, 'board2_pcb_editor.png')
render_pdf_page(os.path.join(DELIV_DIR, 'board1_pcb_editor.pdf'), b1_png, dpi=300)
render_pdf_page(os.path.join(DELIV_DIR, 'board2_pcb_editor.pdf'), b2_png, dpi=300)

# 4. Generate Zoomed Crop Views
print("Generating Zoomed Crop Views...")
# Board 1: Zoom in on J_PWR_BAT12V1, LM2596 #1, M3 hole, Mini560, and R_ENC
img1 = Image.open(b1_png)
w1, h1 = img1.size
crop_b1 = img1.crop((int(w1 * 0.12), int(h1 * 0.05), int(w1 * 0.95), int(h1 * 0.52)))
b1_zoom_png = os.path.join(DELIV_DIR, 'board1_zoom_12v.png')
crop_b1.save(b1_zoom_png)

# Board 2:
img2 = Image.open(b2_png)
w2, h2 = img2.size

# Detailed zoom for J_RELAY_PWR (top right: LM2596 #2 to J_RELAY_PWR pins 1, 2, 3)
crop_b2_pwr = img2.crop((int(w2 * 0.55), int(h2 * 0.08), int(w2 * 0.98), int(h2 * 0.42)))
crop_b2_pwr.save(os.path.join(DELIV_DIR, 'board2_zoom_relay_pwr.png'))

# Detailed zoom for Bottom-Left M3 hole + CUT track + ULN2003A + Relay header
crop_b2_bot = img2.crop((int(w2 * 0.08), int(h2 * 0.65), int(w2 * 0.95), int(h2 * 0.98)))
crop_b2_bot.save(os.path.join(DELIV_DIR, 'board2_zoom_m3_uln.png'))

# Combined Board 2 detail
crop_b2 = img2.crop((int(w2 * 0.08), int(h2 * 0.10), int(w2 * 0.98), int(h2 * 0.98)))
b2_zoom_png = os.path.join(DELIV_DIR, 'board2_zoom_relay_m3.png')
crop_b2.save(b2_zoom_png)

# 5. Create zip archive safely without self-inclusion
print("Creating zip archive...")
zip_path = os.path.join(DELIV_DIR, 'solar_tracker_diy_1layer_a6_deliverables.zip')
if os.path.exists(zip_path):
    os.remove(zip_path)

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for fname in os.listdir(DELIV_DIR):
        if not fname.endswith('.zip'):
            fpath = os.path.join(DELIV_DIR, fname)
            z.write(fpath, arcname=fname)

# 6. Copy deliverables to Artifact Directory
print("Copying deliverables to Artifact Directory...")
artifacts_to_copy = [
    (b1_png, 'board1_pcb_editor_a6.png'),
    (b1_zoom_png, 'board1_zoom_12v.png'),
    (b2_png, 'board2_pcb_editor_a6.png'),
    (b2_zoom_png, 'board2_zoom_relay_m3.png'),
    (os.path.join(DELIV_DIR, 'board2_zoom_relay_pwr.png'), 'board2_zoom_relay_pwr.png'),
    (os.path.join(DELIV_DIR, 'board2_zoom_m3_uln.png'), 'board2_zoom_m3_uln.png'),
    (os.path.join(DELIV_DIR, 'Board1_B_Cu_Mirrored_1to1.pdf'), 'Board1_B_Cu_Mirrored_1to1_a6.pdf'),
    (os.path.join(DELIV_DIR, 'Board1_Top_Silkscreen_and_Jumpers_1to1.pdf'), 'Board1_Top_Silkscreen_and_Jumpers_1to1_a6.pdf'),
    (os.path.join(DELIV_DIR, 'Board1_DRC_Report.rpt'), 'Board1_DRC_Report_a6.rpt'),
    (os.path.join(DELIV_DIR, 'Board2_B_Cu_Mirrored_1to1.pdf'), 'Board2_B_Cu_Mirrored_1to1_a6.pdf'),
    (os.path.join(DELIV_DIR, 'Board2_Top_Silkscreen_and_Jumpers_1to1.pdf'), 'Board2_Top_Silkscreen_and_Jumpers_1to1_a6.pdf'),
    (os.path.join(DELIV_DIR, 'Board2_DRC_Report.rpt'), 'Board2_DRC_Report_a6.rpt'),
    (zip_path, 'solar_tracker_diy_1layer_a6_deliverables.zip')
]

for src, dst_name in artifacts_to_copy:
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(ARTIFACT_DIR, dst_name))
        print(f"Copied -> {dst_name}")

print("All deliverables generated and synchronized cleanly!")
