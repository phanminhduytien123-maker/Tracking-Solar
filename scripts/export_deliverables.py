import subprocess
import os
import shutil
import zipfile

pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
output_dir = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\gerbers"
zip_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard_gerber.zip"
pdf_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\All_In_One_PCB_Routed.pdf"
kicad_cli = r"D:\KiCAD\bin\kicad-cli.exe"

# 1. Clean and create gerbers directory
if os.path.exists(output_dir):
    shutil.rmtree(output_dir)
os.makedirs(output_dir, exist_ok=True)

print("[1] Exporting Gerbers...")
cmd_gerber = [
    kicad_cli, "pcb", "export", "gerbers",
    "--output", output_dir,
    "--layers", "F.Cu,B.Cu,F.Paste,B.Paste,F.SilkS,B.SilkS,F.Mask,B.Mask,Edge.Cuts",
    pcb_path
]
subprocess.run(cmd_gerber, check=True)

print("[2] Exporting NC Drill files...")
cmd_drill = [
    kicad_cli, "pcb", "export", "drill",
    "--output", output_dir + "\\",
    pcb_path
]
subprocess.run(cmd_drill, check=True)

print("[3] Creating ZIP archive...")
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, _, files in os.walk(output_dir):
        for file in files:
            file_p = os.path.join(root, file)
            zipf.write(file_p, arcname=file)
print(f"    ZIP saved to {zip_path}")

print("[4] Exporting 1:1 Scale PDF...")
cmd_pdf = [
    kicad_cli, "pcb", "export", "pdf",
    "--output", pdf_path,
    "--layers", "F.SilkS,F.Cu,Edge.Cuts",
    pcb_path
]
subprocess.run(cmd_pdf, check=True)
print(f"    PDF saved to {pdf_path}")

# 5. Render 3D top view and isometric view
render_dir = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard"
top_render = os.path.join(render_dir, "pcb_render_top.png")
iso_render = os.path.join(render_dir, "pcb_render_iso.png")

print("[5] Exporting 3D top view render...")
cmd_3d_top = [
    kicad_cli, "pcb", "render",
    "--output", top_render,
    "--side", "top",
    "--width", "1920",
    "--height", "1440",
    pcb_path
]
subprocess.run(cmd_3d_top, check=True)

print("[6] Exporting 3D isometric view render...")
cmd_3d_iso = [
    kicad_cli, "pcb", "render",
    "--output", iso_render,
    "--side", "top",
    "--rotate", "-45,0,45",
    "--width", "1920",
    "--height", "1440",
    pcb_path
]
subprocess.run(cmd_3d_iso, check=True)

# 7. Export 3D CAD STEP and STL models
step_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.step"
stl_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.stl"
print("[7] Exporting 3D STEP solid model...")
cmd_step = [
    kicad_cli, "pcb", "export", "step",
    "--force", "--subst-models",
    "--output", step_path,
    pcb_path
]
subprocess.run(cmd_step, check=True)

print("[8] Exporting 3D STL mesh model...")
cmd_stl = [
    kicad_cli, "pcb", "export", "stl",
    "--force", "--subst-models",
    "--output", stl_path,
    pcb_path
]
subprocess.run(cmd_stl, check=True)

# Copy renders and deliverables to artifact directory
artifact_dir = r"C:\Users\ADMIN\.gemini\antigravity\brain\b07bdce5-a157-4a15-9f23-20c06a6e411e"
shutil.copy2(top_render, os.path.join(artifact_dir, "pcb_render_top.png"))
shutil.copy2(iso_render, os.path.join(artifact_dir, "pcb_render_iso.png"))
shutil.copy2(zip_path, os.path.join(artifact_dir, "solar_tracker_mainboard_gerber.zip"))
shutil.copy2(pdf_path, os.path.join(artifact_dir, "All_In_One_PCB_Routed.pdf"))
shutil.copy2(step_path, os.path.join(artifact_dir, "solar_tracker_mainboard.step"))
shutil.copy2(stl_path, os.path.join(artifact_dir, "solar_tracker_mainboard.stl"))
print(f"[V] Successfully copied all deliverables to artifact directory!")
