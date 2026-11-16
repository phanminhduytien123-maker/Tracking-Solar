import subprocess
import os
import shutil

kicad_cli = r"D:\KiCAD\bin\kicad-cli.exe"
base_dir = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer"
deliverables_dir = os.path.join(base_dir, "deliverables")
artifact_dir = r"C:\Users\ADMIN\.gemini\antigravity\brain\b07bdce5-a157-4a15-9f23-20c06a6e411e"

boards = [
    ('board1', 'board1_tracker_master', 'board1_tracker_master.kicad_pcb'),
    ('board2', 'board2_sensor_relay', 'board2_sensor_relay.kicad_pcb')
]

for bprefix, bdir, bpcb in boards:
    pcb_path = os.path.join(base_dir, bdir, bpcb)
    
    # 1. Top render
    top_img = os.path.join(deliverables_dir, f"{bprefix}_render_top.png")
    cmd_top = [
        kicad_cli, "pcb", "render",
        "--output", top_img,
        "--side", "top",
        "--width", "1600", "--height", "1200",
        pcb_path
    ]
    subprocess.run(cmd_top, check=True)
    print(f"Rendered Top: {top_img}")
    
    # 2. Bottom render (shows copper traces on B.Cu)
    bot_img = os.path.join(deliverables_dir, f"{bprefix}_render_bottom.png")
    cmd_bot = [
        kicad_cli, "pcb", "render",
        "--output", bot_img,
        "--side", "bottom",
        "--width", "1600", "--height", "1200",
        pcb_path
    ]
    subprocess.run(cmd_bot, check=True)
    print(f"Rendered Bottom: {bot_img}")

    # 3. Iso render
    iso_img = os.path.join(deliverables_dir, f"{bprefix}_render_iso.png")
    cmd_iso = [
        kicad_cli, "pcb", "render",
        "--output", iso_img,
        "--side", "top",
        "--rotate", "-45,0,45",
        "--width", "1600", "--height", "1200",
        pcb_path
    ]
    subprocess.run(cmd_iso, check=True)
    print(f"Rendered Iso: {iso_img}")

    # Copy to artifacts
    for img in [top_img, bot_img, iso_img]:
        shutil.copy2(img, artifact_dir)

# Update zip package
import zipfile
zip_path = os.path.join(base_dir, "solar_tracker_diy_1layer_deliverables.zip")
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for fn in os.listdir(deliverables_dir):
        fp = os.path.join(deliverables_dir, fn)
        if os.path.isfile(fp):
            z.write(fp, arcname=fn)
shutil.copy2(zip_path, artifact_dir)
print(f"Deliverables ZIP updated and copied to artifacts: {zip_path}")

