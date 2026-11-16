import os
import shutil
from PIL import Image

ARTIFACTS_DIR = r"C:\Users\ADMIN\.gemini\antigravity\brain\b07bdce5-a157-4a15-9f23-20c06a6e411e"
DELIV_DIR = r"D:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6\deliverables"

img1 = Image.open(os.path.join(DELIV_DIR, "board1_pcb_editor.png"))
img2 = Image.open(os.path.join(DELIV_DIR, "board2_pcb_editor.png"))

w1, h1 = img1.size
w2, h2 = img2.size

# 1. Board 1 Zoom VIN+ Via & Pad 1: showing explicit 2.0mm via and pad 1 connection
crop1 = img1.crop((int(w1 * 0.48), int(h1 * 0.05), int(w1 * 0.98), int(h1 * 0.35)))
p1 = os.path.join(DELIV_DIR, "board1_zoom_vin_via.png")
crop1.save(p1)
shutil.copy2(p1, os.path.join(ARTIFACTS_DIR, "board1_zoom_vin_via.png"))

# 2. Board 1 Zoom Bottom-Right M3 (jumper turning at y=151 & x=100, >5.2mm from corner M3 hole)
crop2 = img1.crop((int(w1 * 0.50), int(h1 * 0.70), int(w1 * 1.0), int(h1 * 1.0)))
p2 = os.path.join(DELIV_DIR, "board1_zoom_12v_m3_bottom.png")
crop2.save(p2)
shutil.copy2(p2, os.path.join(ARTIFACTS_DIR, "board1_zoom_12v_m3_bottom.png"))

# 3. Board 2 Zoom Left & Bottom M3: 3V3 jumper wire at x=12.5, y=153.5 (clear of M3 by >4mm, 8.5mm from bottom edge)
crop3 = img2.crop((int(w2 * 0.02), int(h2 * 0.70), int(w2 * 0.55), int(h2 * 1.0)))
p3 = os.path.join(DELIV_DIR, "board2_zoom_left_bottom_m3.png")
crop3.save(p3)
shutil.copy2(p3, os.path.join(ARTIFACTS_DIR, "board2_zoom_left_bottom_m3.png"))

# 4. Board 2 Zoom ULN2003A & Relay GND: showing B.Cu GND track and solid copper pour around ULN
crop4 = img2.crop((int(w2 * 0.60), int(h2 * 0.65), int(w2 * 0.98), int(h2 * 1.0)))
p4 = os.path.join(DELIV_DIR, "board2_zoom_uln_gnd.png")
crop4.save(p4)
shutil.copy2(p4, os.path.join(ARTIFACTS_DIR, "board2_zoom_uln_gnd.png"))

# 5. Board 2 Zoom Underbelly ESP2: copper pour filling the center between headers
crop5 = img2.crop((int(w2 * 0.35), int(h2 * 0.40), int(w2 * 0.80), int(h2 * 0.80)))
p5 = os.path.join(DELIV_DIR, "board2_zoom_underbelly_gnd.png")
crop5.save(p5)
shutil.copy2(p5, os.path.join(ARTIFACTS_DIR, "board2_zoom_underbelly_gnd.png"))

# 6. Board 2 Zoom Antenna Keepout (showing 0 tracks in keepout box)
crop6 = img2.crop((int(w2 * 0.35), int(h2 * 0.25), int(w2 * 0.75), int(h2 * 0.55)))
p6 = os.path.join(DELIV_DIR, "board2_zoom_antenna_keepout.png")
crop6.save(p6)
shutil.copy2(p6, os.path.join(ARTIFACTS_DIR, "board2_zoom_antenna_keepout.png"))

print("Round 6 Zoom images generated successfully!")
