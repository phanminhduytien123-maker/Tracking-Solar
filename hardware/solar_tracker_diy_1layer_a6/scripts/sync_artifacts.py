import os
import shutil
import zipfile

deliv = r'd:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6\deliverables'
artifact = r'C:\Users\ADMIN\.gemini\antigravity\brain\b07bdce5-a157-4a15-9f23-20c06a6e411e'
zip_path = os.path.join(deliv, 'solar_tracker_diy_1layer_a6_deliverables.zip')

# Remove old zip if present
if os.path.exists(zip_path):
    os.remove(zip_path)

# Create zip with all files except .zip
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for fname in os.listdir(deliv):
        if not fname.endswith('.zip'):
            fpath = os.path.join(deliv, fname)
            z.write(fpath, arcname=fname)

print(f"Created zip archive: {os.path.getsize(zip_path)} bytes")

# Copy to artifact dir
shutil.copy2(zip_path, os.path.join(artifact, 'solar_tracker_diy_1layer_a6_deliverables.zip'))

file_mappings = [
    ('board1_pcb_editor.png', 'board1_pcb_editor_a6.png'),
    ('board1_zoom_12v.png', 'board1_zoom_12v.png'),
    ('board2_pcb_editor.png', 'board2_pcb_editor_a6.png'),
    ('board2_zoom_relay_m3.png', 'board2_zoom_relay_m3.png'),
    ('board2_zoom_relay_pwr.png', 'board2_zoom_relay_pwr.png'),
    ('board2_zoom_m3_uln.png', 'board2_zoom_m3_uln.png'),
    ('Board1_B_Cu_Mirrored_1to1.pdf', 'Board1_B_Cu_Mirrored_1to1_a6.pdf'),
    ('Board1_Top_Silkscreen_and_Jumpers_1to1.pdf', 'Board1_Top_Silkscreen_and_Jumpers_1to1_a6.pdf'),
    ('Board1_DRC_Report.rpt', 'Board1_DRC_Report_a6.rpt'),
    ('Board2_B_Cu_Mirrored_1to1.pdf', 'Board2_B_Cu_Mirrored_1to1_a6.pdf'),
    ('Board2_Top_Silkscreen_and_Jumpers_1to1.pdf', 'Board2_Top_Silkscreen_and_Jumpers_1to1_a6.pdf'),
    ('Board2_DRC_Report.rpt', 'Board2_DRC_Report_a6.rpt'),
]

for src_name, dst_name in file_mappings:
    src_file = os.path.join(deliv, src_name)
    if os.path.exists(src_file):
        shutil.copy2(src_file, os.path.join(artifact, dst_name))
        print(f"Copied {src_name} -> {dst_name}")

print("Sync completed successfully!")

