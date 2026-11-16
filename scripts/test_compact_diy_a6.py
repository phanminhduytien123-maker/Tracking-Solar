# =========================================================================
# TEST A6 SIZE COMPACT LAYOUT FOR DIY 1-LAYER BOARDS
# Size: 100 x 150 mm (or 100 x 152 mm)
# =========================================================================
import pcbnew
import os
import re
import subprocess

BASE_DIR = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer"
DIR_B1 = os.path.join(BASE_DIR, "board1_tracker_master")
DIR_B2 = os.path.join(BASE_DIR, "board2_sensor_relay")

def mm_to_iu(val):
    return int(val * 1e6)

def check_overlaps(board):
    fps = list(board.GetFootprints())
    overlaps = []
    for i in range(len(fps)):
        b1 = fps[i].GetBoundingBox()
        for j in range(i + 1, len(fps)):
            b2 = fps[j].GetBoundingBox()
            if b1.Intersects(b2):
                overlaps.append((fps[i].GetReference(), fps[j].GetReference()))
    return overlaps

print("Testing layout feasibility for 100 x 152 mm (A6)...")

