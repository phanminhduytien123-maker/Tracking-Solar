import sys

# Test all bounding boxes with new proposed coordinates
components = {
    # Left terminals (pads at X=17.0, size ~10xH)
    "J_SW1": {"x": 17.0, "y": 25.0, "w": 10.0, "h": 10.0},
    "J_SW2": {"x": 17.0, "y": 40.0, "w": 10.0, "h": 10.0},
    "J_ENC1_AZ1": {"x": 17.0, "y": 62.0, "w": 10.0, "h": 20.0},
    "J_ENC2_EL1": {"x": 17.0, "y": 88.0, "w": 10.0, "h": 20.0},
    "J_M1_AZ1": {"x": 17.0, "y": 120.0, "w": 10.0, "h": 20.0},
    "J_M2_EL1": {"x": 17.0, "y": 150.0, "w": 10.0, "h": 20.0},
    
    # Resistors left
    "R_ENC1_A1": {"x": 26.5, "y": 56.0, "w": 3.0, "h": 10.0},
    "R_ENC1_B1": {"x": 26.5, "y": 68.0, "w": 3.0, "h": 10.0},
    "R_ENC2_A1": {"x": 26.5, "y": 82.0, "w": 3.0, "h": 10.0},
    "R_ENC2_B1": {"x": 26.5, "y": 94.0, "w": 3.0, "h": 10.0},

    # ESP1 (pins at X=36.0 and X=61.4, Y=55.0 to 108.3)
    "ESP1_MODULE": {"x": 48.7, "y": 82.0, "w": 28.5, "h": 58.0},
    "J_RTC1": {"x": 48.7, "y": 128.0, "w": 38.0, "h": 22.0},
    "J_TEMT_EXT1": {"x": 48.7, "y": 155.0, "w": 18.0, "h": 8.0},

    # INA226 & Mini560
    "J_INA1_TRK1": {"x": 76.0, "y": 45.0, "w": 21.2, "h": 19.1},
    "J_INA2_STA1": {"x": 76.0, "y": 75.0, "w": 21.2, "h": 19.1},
    "U_MINI560": {"x": 76.0, "y": 158.0, "w": 18.0, "h": 33.0},

    # Power modules (Vertical LM2596 rotated 90 deg: W=35, H=63.5)
    "U_LM2596_ESP1": {"x": 106.0, "y": 58.0, "w": 35.0, "h": 63.5},
    "U_LM2596_ESP2": {"x": 106.0, "y": 126.0, "w": 35.0, "h": 63.5},
    "J_PWR_GRID12V1": {"x": 95.0, "y": 18.0, "w": 10.0, "h": 10.0},
    "J_PWR_BAT12V1": {"x": 115.0, "y": 18.0, "w": 10.0, "h": 10.0},
    "J_RL6_CONTACT1": {"x": 106.0, "y": 168.0, "w": 8.0, "h": 4.0},

    # Sensors (ACS712 W=13, H=31; FZ0430 W=13, H=25)
    "J_ACS1_TRK1": {"x": 132.0, "y": 35.0, "w": 13.0, "h": 31.0},
    "J_ACS2_STA1": {"x": 132.0, "y": 70.0, "w": 13.0, "h": 31.0},
    "J_FZ1_TRK1": {"x": 132.0, "y": 102.0, "w": 13.0, "h": 25.0},
    "J_FZ2_STA1": {"x": 132.0, "y": 130.0, "w": 13.0, "h": 25.0},

    # ESP2 (pins at X=145.0 and X=170.4, Y=55.0 to 108.3)
    "ESP2_MODULE": {"x": 157.7, "y": 82.0, "w": 28.5, "h": 58.0},
    "J_RELAY_CTRL1": {"x": 157.7, "y": 126.0, "w": 22.0, "h": 4.0},

    # Right resistors
    "R_TEMP_TRK1": {"x": 178.0, "y": 55.0, "w": 3.0, "h": 10.0},
    "R_TEMP_STA1": {"x": 178.0, "y": 98.0, "w": 3.0, "h": 10.0},

    # Right terminals (pads at X=188.0, size ~10xH)
    "J_PV_TRK_IN1": {"x": 188.0, "y": 35.0, "w": 10.0, "h": 10.0},
    "J_TEMP_TRK1": {"x": 188.0, "y": 55.0, "w": 10.0, "h": 15.0},
    "J_PV_STA_IN1": {"x": 188.0, "y": 78.0, "w": 10.0, "h": 10.0},
    "J_TEMP_STA1": {"x": 188.0, "y": 98.0, "w": 10.0, "h": 15.0},
    "J_LAMP12V_OUT1": {"x": 188.0, "y": 125.0, "w": 10.0, "h": 10.0},
}

# Check all pairwise bounding box overlaps
names = list(components.keys())
overlaps = []
for i in range(len(names)):
    for j in range(i + 1, len(names)):
        n1, n2 = names[i], names[j]
        c1, c2 = components[n1], components[n2]
        
        # Bounding box 1
        min_x1, max_x1 = c1["x"] - c1["w"]/2, c1["x"] + c1["w"]/2
        min_y1, max_y1 = c1["y"] - c1["h"]/2, c1["y"] + c1["h"]/2
        
        # Bounding box 2
        min_x2, max_x2 = c2["x"] - c2["w"]/2, c2["x"] + c2["w"]/2
        min_y2, max_y2 = c2["y"] - c2["h"]/2, c2["y"] + c2["h"]/2
        
        # Check overlap
        if not (max_x1 < min_x2 or min_x1 > max_x2 or max_y1 < min_y2 or min_y1 > max_y2):
            overlaps.append((n1, n2))

print(f"Total components checked: {len(names)}")
print(f"Total overlaps: {len(overlaps)}")
for o in overlaps:
    print(f"  OVERLAP: {o[0]} <-> {o[1]}")
if len(overlaps) == 0:
    print("[SUCCESS] Zero overlaps! Everything fits cleanly!")
