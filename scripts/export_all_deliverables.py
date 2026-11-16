import subprocess
import os
import shutil
import zipfile
import fitz  # PyMuPDF
from PIL import Image

KICAD_CLI = r"D:\KiCad\bin\kicad-cli.exe"
BASE_DIR = r"D:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6"
DELIV_DIR = os.path.join(BASE_DIR, "deliverables")
ARTIFACTS_DIR = r"C:\Users\ADMIN\.gemini\antigravity\brain\b07bdce5-a157-4a15-9f23-20c06a6e411e"

os.makedirs(DELIV_DIR, exist_ok=True)

B1_PCB = os.path.join(BASE_DIR, "board1_tracker_master", "board1_tracker_master.kicad_pcb")
B2_PCB = os.path.join(BASE_DIR, "board2_sensor_relay", "board2_sensor_relay.kicad_pcb")

print("1. Exporting Pure Black & White PDFs (100% Solid Monochrome #000000 / #FFFFFF)...")

# 1. Board 1 B.Cu Mirrored 1:1 (Pure B&W)
subprocess.run([
    KICAD_CLI, "pcb", "export", "pdf",
    "-o", os.path.join(DELIV_DIR, "Board1_B_Cu_Mirrored_1to1.pdf"),
    "--layers", "B.Cu,Edge.Cuts",
    "--mirror",
    "--black-and-white",
    B1_PCB
], check=True)

# 2. Board 1 Top Silkscreen and Jumpers 1:1 (Pure B&W)
subprocess.run([
    KICAD_CLI, "pcb", "export", "pdf",
    "-o", os.path.join(DELIV_DIR, "Board1_Top_Silkscreen_and_Jumpers_1to1.pdf"),
    "--layers", "F.SilkS,F.Cu,Edge.Cuts",
    "--black-and-white",
    B1_PCB
], check=True)

# 3. Board 2 B.Cu Mirrored 1:1 (Pure B&W)
subprocess.run([
    KICAD_CLI, "pcb", "export", "pdf",
    "-o", os.path.join(DELIV_DIR, "Board2_B_Cu_Mirrored_1to1.pdf"),
    "--layers", "B.Cu,Edge.Cuts",
    "--mirror",
    "--black-and-white",
    B2_PCB
], check=True)

# 4. Board 2 Top Silkscreen and Jumpers 1:1 (Pure B&W)
subprocess.run([
    KICAD_CLI, "pcb", "export", "pdf",
    "-o", os.path.join(DELIV_DIR, "Board2_Top_Silkscreen_and_Jumpers_1to1.pdf"),
    "--layers", "F.SilkS,F.Cu,Edge.Cuts",
    "--black-and-white",
    B2_PCB
], check=True)

# Complete PCB Editor view for Board 1 (Color reference)
subprocess.run([
    KICAD_CLI, "pcb", "export", "pdf",
    "-o", os.path.join(DELIV_DIR, "board1_pcb_editor.pdf"),
    "--layers", "B.Cu,F.Cu,F.SilkS,Edge.Cuts",
    B1_PCB
], check=True)

# Complete PCB Editor view for Board 2 (Color reference)
subprocess.run([
    KICAD_CLI, "pcb", "export", "pdf",
    "-o", os.path.join(DELIV_DIR, "board2_pcb_editor.pdf"),
    "--layers", "B.Cu,F.Cu,F.SilkS,Edge.Cuts",
    B2_PCB
], check=True)

print("2. Rendering high-res 300 DPI PNGs...")

# Render 300 DPI PNGs of the 4 Black & White files for direct inspection / printing
def render_pdf_to_png(pdf_name, png_name, dpi=300):
    pdf_path = os.path.join(DELIV_DIR, pdf_name)
    png_path = os.path.join(DELIV_DIR, png_name)
    doc = fitz.open(pdf_path)
    page = doc[0]
    pix = page.get_pixmap(dpi=dpi)
    pix.save(png_path)
    print(f"Rendered {png_name} at {dpi} DPI, size: {pix.width}x{pix.height}")

render_pdf_to_png("Board1_B_Cu_Mirrored_1to1.pdf", "Board1_B_Cu_Mirrored_1to1.png")
render_pdf_to_png("Board1_Top_Silkscreen_and_Jumpers_1to1.pdf", "Board1_Top_Silkscreen_and_Jumpers_1to1.png")
render_pdf_to_png("Board2_B_Cu_Mirrored_1to1.pdf", "Board2_B_Cu_Mirrored_1to1.png")
render_pdf_to_png("Board2_Top_Silkscreen_and_Jumpers_1to1.pdf", "Board2_Top_Silkscreen_and_Jumpers_1to1.png")

# Board 1 PCB editor color
doc1 = fitz.open(os.path.join(DELIV_DIR, "board1_pcb_editor.pdf"))
pix1 = doc1[0].get_pixmap(dpi=300)
b1_png = os.path.join(DELIV_DIR, "board1_pcb_editor.png")
pix1.save(b1_png)
img1 = Image.open(b1_png)

# Board 2 PCB editor color
doc2 = fitz.open(os.path.join(DELIV_DIR, "board2_pcb_editor.pdf"))
pix2 = doc2[0].get_pixmap(dpi=300)
b2_png = os.path.join(DELIV_DIR, "board2_pcb_editor.png")
pix2.save(b2_png)
img2 = Image.open(b2_png)

# Generate Zoom crops requested by Claude:
w1, h1 = img1.size
crop_b1_12v = img1.crop((int(w1 * 0.35), int(h1 * 0.05), int(w1 * 1.0), int(h1 * 0.55)))
crop_b1_12v.save(os.path.join(DELIV_DIR, "board1_zoom_12v.png"))

w2, h2 = img2.size
crop_b2_terminals = img2.crop((int(w2 * 0.65), int(h2 * 0.52), int(w2 * 1.0), int(h2 * 0.92)))
crop_b2_terminals.save(os.path.join(DELIV_DIR, "board2_zoom_terminals_right.png"))

crop_b2_pu_relay = img2.crop((int(w2 * 0.50), int(h2 * 0.82), int(w2 * 0.85), int(h2 * 1.0)))
crop_b2_pu_relay.save(os.path.join(DELIV_DIR, "board2_zoom_pu_relay.png"))

crop_b2_bus_link = img2.crop((int(w2 * 0.05), int(h2 * 0.05), int(w2 * 0.45), int(h2 * 0.30)))
crop_b2_bus_link.save(os.path.join(DELIV_DIR, "board2_zoom_bus_link.png"))

print("3. Copying DRC reports...")
shutil.copy2(os.path.join(BASE_DIR, "board1_tracker_master", "drc_final.rpt"), os.path.join(DELIV_DIR, "Board1_DRC_Report.rpt"))
shutil.copy2(os.path.join(BASE_DIR, "board2_sensor_relay", "drc_final.rpt"), os.path.join(DELIV_DIR, "Board2_DRC_Report.rpt"))

print("4. Creating deliverables zip...")
zip_path = os.path.join(DELIV_DIR, "solar_tracker_diy_1layer_a6_deliverables.zip")
if os.path.exists(zip_path):
    os.remove(zip_path)

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(DELIV_DIR):
        for f in files:
            if not f.endswith('.zip') and not f.endswith('.svg'):
                fp = os.path.join(root, f)
                arcname = os.path.relpath(fp, DELIV_DIR)
                z.write(fp, arcname)

print("5. Syncing to artifacts directory...")
for f in os.listdir(DELIV_DIR):
    src = os.path.join(DELIV_DIR, f)
    dst = os.path.join(ARTIFACTS_DIR, f)
    if os.path.isfile(src):
        shutil.copy2(src, dst)

print("ALL DELIVERABLES EXPORTED IN PURE BLACK & WHITE AND SYNCED SUCCESSFULLY!")
