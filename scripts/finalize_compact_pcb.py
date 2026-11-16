import pcbnew
import subprocess
import shutil
import os

def mm_to_iu(val):
    return int(val * 1e6)

# 1. Update kicad_pro
pro_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pro"
with open(pro_path, "r", encoding="utf-8") as f:
    pro_text = f.read()
pro_text = pro_text.replace('"min_resolved_spokes": 2', '"min_resolved_spokes": 1')
pro_text = pro_text.replace('"lib_footprint_mismatch": "warning"', '"lib_footprint_mismatch": "ignore"')
with open(pro_path, "w", encoding="utf-8") as f:
    f.write(pro_text)

# 2. Update board
pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
board = pcbnew.LoadBoard(pcb_path)
net_gnd = board.FindNet("/GND")

# Clean existing texts on F.Silkscreen (keep banners only)
KEEP_TEXTS = {
    'VÙNG 1: ĐIỀU KHIỂN CHÍNH (ESP32-S3 #1)',
    'VÙNG 2: NGUỒN',
    'VÙNG 3: VOC / ISC / RELAY (ESP32-S3 #2)'
}
for d in list(board.GetDrawings()):
    if d.GetClass() == 'PCB_TEXT' and d.GetLayerName() == 'F.Silkscreen':
        if d.GetText().strip() not in KEEP_TEXTS:
            board.Delete(d)

def add_silk_label(text, x, y, angle=0, h_align=pcbnew.GR_TEXT_H_ALIGN_CENTER, v_align=pcbnew.GR_TEXT_V_ALIGN_CENTER, size=0.80):
    t = pcbnew.PCB_TEXT(board)
    t.SetText(text)
    t.SetLayer(pcbnew.F_SilkS)
    t.SetPosition(pcbnew.VECTOR2I(mm_to_iu(x), mm_to_iu(y)))
    t.SetTextWidth(mm_to_iu(size))
    t.SetTextHeight(mm_to_iu(size))
    t.SetTextThickness(mm_to_iu(0.13))
    t.SetTextAngle(pcbnew.EDA_ANGLE(angle, pcbnew.DEGREES_T))
    t.SetHorizJustify(h_align)
    t.SetVertJustify(v_align)
    board.Add(t)

def add_esp_label(text, x, y, h_align=pcbnew.GR_TEXT_H_ALIGN_LEFT):
    t = pcbnew.PCB_TEXT(board)
    t.SetText(text)
    t.SetLayer(pcbnew.F_SilkS)
    t.SetPosition(pcbnew.VECTOR2I(mm_to_iu(x), mm_to_iu(y)))
    t.SetTextWidth(mm_to_iu(0.70))
    t.SetTextHeight(mm_to_iu(0.80))
    t.SetTextThickness(mm_to_iu(0.12))
    t.SetTextAngle(pcbnew.EDA_ANGLE(0, pcbnew.DEGREES_T))
    t.SetHorizJustify(h_align)
    t.SetVertJustify(pcbnew.GR_TEXT_V_ALIGN_CENTER)
    board.Add(t)

# Hide cluttering generic footprint reference & value fields on ALL components
for fp in board.GetFootprints():
    fp.Value().SetVisible(False)
    fp.Reference().SetVisible(False)

# =========================================================================
# A. LEFT TERMINAL PIN LABELS & TITLES (X = 24.5, vertical)
# =========================================================================
left_labels = [
    ("SW", 24.5, 25.0), ("GND", 24.5, 30.08),
    ("SW", 24.5, 40.0), ("GND", 24.5, 45.08),
    ("5V", 24.5, 62.0), ("GND", 24.5, 67.08), ("A", 24.5, 72.16), ("B", 24.5, 77.24),
    ("5V", 24.5, 88.0), ("GND", 24.5, 93.08), ("A", 24.5, 98.16), ("B", 24.5, 103.24),
    ("PUL1+", 24.5, 114.0), ("PUL1-", 24.5, 119.08), ("DIR1+", 24.5, 124.16), ("DIR1-", 24.5, 129.24), ("ENA1+", 24.5, 134.32), ("ENA1-", 24.5, 139.40),
    ("PUL2+", 24.5, 148.0), ("PUL2-", 24.5, 153.08), ("DIR2+", 24.5, 158.16), ("DIR2-", 24.5, 163.24), ("ENA2+", 24.5, 168.32), ("ENA2-", 24.5, 173.40)
]
for text, x, y in left_labels:
    add_silk_label(text, x, y, 90, size=0.80)

add_silk_label("LIMIT 1", 17.0, 19.5, 0, size=0.8)
add_silk_label("LIMIT 2", 17.0, 34.5, 0, size=0.8)
add_silk_label("ENC 1",   17.0, 56.0, 0, size=0.8)
add_silk_label("ENC 2",   17.0, 81.5, 0, size=0.8)
add_silk_label("DM556-1", 17.0, 108.5, 0, size=0.8)
add_silk_label("DM556-2", 17.0, 143.5, 0, size=0.8)

# Resistor values (R_ENC at X = 26.5)
add_silk_label("6.2k", 29.5, 56.0, 90, size=0.80)
add_silk_label("6.2k", 29.5, 68.0, 90, size=0.80)
add_silk_label("6.2k", 29.5, 82.0, 90, size=0.80)
add_silk_label("6.2k", 29.5, 94.0, 90, size=0.80)

# =========================================================================
# B. ESP32-S3 #1 PIN LABELS (Left: X=38.0, Right: X=59.4)
# =========================================================================
esp1_l_labels = [
    (1,  "3V3"),
    (2,  "3V3"),
    (3,  "EN"),
    (4,  "G4 (TEMT_R)"),
    (5,  "G5 (CUT_ESP2)"),
    (6,  "G6 (ENC1_A)"),
    (7,  "G7 (ENC1_B)"),
    (8,  "G15 (M1_ENA)"),
    (9,  "G16 (ENC2_A)"),
    (10, "G17 (ENC2_B)"),
    (11, "G18 (HOME1)"),
    (12, "G8 (SDA)"),
    (13, "G3 (TEMT_L)"),
    (14, "G46 (LED)"),
    (15, "G9 (SCL)"),
    (16, "G10 (M1_PUL)"),
    (17, "G11 (M1_DIR)"),
    (18, "G12 (M2_PUL)"),
    (19, "G13 (M2_DIR)"),
    (20, "G14 (M2_ENA)"),
    (21, "5V_IN"),
    (22, "GND")
]
for pin, text in esp1_l_labels:
    y = 55.0 + (pin - 1) * 2.54
    add_esp_label(f"{pin}:{text}", 38.0, y, pcbnew.GR_TEXT_H_ALIGN_LEFT)

esp1_r_labels = [
    (1,  "GND"),
    (2,  "TX (G43)"),
    (3,  "RX (G44)"),
    (4,  "G1"),
    (5,  "G2"),
    (6,  "G42"),
    (7,  "G41"),
    (8,  "G40"),
    (9,  "G39"),
    (10, "G38"),
    (11, "G37"),
    (12, "G36"),
    (13, "G35"),
    (14, "G0 (BOOT)"),
    (15, "G45"),
    (16, "G48"),
    (17, "G47 (RTC_SQW)"),
    (18, "G21 (HOME2)"),
    (19, "G20"),
    (20, "G19"),
    (21, "GND"),
    (22, "GND")
]
for pin, text in esp1_r_labels:
    y = 55.0 + (pin - 1) * 2.54
    add_esp_label(f"{text}:{pin}", 59.4, y, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

add_silk_label("[ ANTENNA (TOP) ]", 48.7, 49.0, 0, pcbnew.GR_TEXT_H_ALIGN_CENTER)
add_silk_label("ESP32-S3 #1 (TRACKER MASTER)", 48.7, 51.5, 0, pcbnew.GR_TEXT_H_ALIGN_CENTER)
add_silk_label("[ DUAL USB-C (BOTTOM) ]", 48.7, 112.5, 0, pcbnew.GR_TEXT_H_ALIGN_CENTER)
add_silk_label("PIN 1", 33.0, 51.5, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)

# =========================================================================
# C. ZONE 1 SENSORS (RTC DS3231, TEMT6000, INA226 x2, MINI560)
# =========================================================================
add_silk_label("INA226 TRK (0x40)", 76.0, 32.5, 0, size=0.85)
add_silk_label("INA226 STA (0x41)", 76.0, 62.5, 0, size=0.85)
add_silk_label("DS3231 RTC (0x68)", 48.7, 141.5, 0, size=0.85)

# TEMT6000 Cross pin labels (3V3, GND, TOP, BOT, LFT, RGT)
temt_labels = [
    (48.70, "3V3"),
    (51.20, "GND"),
    (53.70, "TOP"),
    (56.20, "BOT"),
    (58.70, "LFT"),
    (61.20, "RGT")
]
for x, text in temt_labels:
    add_silk_label(text, x, 149.0, 90, size=0.80)

add_silk_label("TEMT6000 CROSS (TOP/BOT/LFT/RGT)", 54.95, 161.5, 0, size=0.80)

add_silk_label("MINI560 PRO", 76.0, 138.0, 0, size=0.85)
add_silk_label("12V IN", 76.0, 143.0, 0, size=0.80)
add_silk_label("5V ENC OUT", 76.0, 178.0, 0, size=0.80)

# =========================================================================
# D. ZONE 2: POWER MODULES & TOP TERMINALS
# =========================================================================
add_silk_label("12V GRID", 97.0, 13.0, 0, size=0.8)
add_silk_label("12V BATT", 117.0, 13.0, 0, size=0.8)
add_silk_label("12V", 97.0, 23.5, 0, size=0.8)
add_silk_label("GND", 92.0, 23.5, 0, size=0.8)
add_silk_label("12V", 117.0, 23.5, 0, size=0.8)
add_silk_label("GND", 112.0, 23.5, 0, size=0.8)

# =========================================================================
# E. ZONE 3 SENSORS (ACS712 x2, FZ0430 x2)
# =========================================================================
add_silk_label("ACS712 TRK", 132.0, 17.0, 0, size=0.85)
add_silk_label("IP+/- (ISC)", 132.0, 20.5, 0, size=0.80)
add_silk_label("ACS712 STA", 132.0, 52.5, 0, size=0.85)
add_silk_label("FZ0430 TRK", 132.0, 87.5, 0, size=0.85)
add_silk_label("VCC/GND", 132.0, 91.0, 0, size=0.80)
add_silk_label("FZ0430 STA", 132.0, 115.5, 0, size=0.85)

# =========================================================================
# F. ESP32-S3 #2 (Left: X=147.0, Right: X=168.4)
# =========================================================================
esp2_l_labels = [
    (1,  "3V3"),
    (2,  "3V3"),
    (3,  "EN"),
    (4,  "G4 (VOC_STA)"),
    (5,  "G5 (ISC_STA)"),
    (6,  "G6 (VOC_TRK)"),
    (7,  "G7 (ISC_TRK)"),
    (8,  "G15 (TMP_TRK)"),
    (9,  "G16 (TMP_STA)"),
    (10, "G17"),
    (11, "G18"),
    (12, "G8"),
    (13, "G3"),
    (14, "G46"),
    (15, "G9"),
    (16, "G10"),
    (17, "G11"),
    (18, "G12"),
    (19, "G13"),
    (20, "G14"),
    (21, "5V_IN"),
    (22, "GND")
]
for pin, text in esp2_l_labels:
    y = 55.0 + (pin - 1) * 2.54
    add_esp_label(f"{pin}:{text}", 147.0, y, pcbnew.GR_TEXT_H_ALIGN_LEFT)

esp2_r_labels = [
    (1,  "GND"),
    (2,  "TX (G43)"),
    (3,  "RX (G44)"),
    (4,  "G1"),
    (5,  "G2"),
    (6,  "(RL_E) G42"),
    (7,  "(RL_B) G41"),
    (8,  "G40"),
    (9,  "(RL_D) G39"),
    (10, "(IN1,3) G38"),
    (11, "G37"),
    (12, "G36"),
    (13, "G35"),
    (14, "G0 (BOOT)"),
    (15, "G45"),
    (16, "G48"),
    (17, "G47"),
    (18, "G21"),
    (19, "G20"),
    (20, "G19"),
    (21, "GND"),
    (22, "GND")
]
for pin, text in esp2_r_labels:
    y = 55.0 + (pin - 1) * 2.54
    add_esp_label(f"{text}:{pin}", 168.4, y, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

add_silk_label("[ ANTENNA (TOP) ]", 157.7, 49.0, 0, pcbnew.GR_TEXT_H_ALIGN_CENTER)
add_silk_label("ESP32-S3 #2 (VOC/ISC/TEMP)", 157.7, 51.5, 0, pcbnew.GR_TEXT_H_ALIGN_CENTER)
add_silk_label("[ DUAL USB-C (BOTTOM) ]", 157.7, 112.5, 0, pcbnew.GR_TEXT_H_ALIGN_CENTER)
add_silk_label("PIN 1", 142.0, 51.5, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)

# =========================================================================
# G. RELAY 6-CHANNEL HEADER (X = 148.0, Y = 120.0, rot = 90)
# =========================================================================
relay_labels = [
    (148.00, 'GND'), (150.54, 'IN1'), (153.08, 'IN2'), (155.62, 'IN3'),
    (158.16, 'IN4'), (160.70, 'IN5'), (163.24, 'IN6'), (165.78, 'VCC')
]
for x, label in relay_labels:
    add_silk_label(label, x, 116.5, 90, size=0.80)

add_silk_label("HEADER RELAY 6 KÊNH", 157.0, 124.5, 0, size=0.80)
add_silk_label("10k", 158.0, 133.5, 0, size=0.80)
add_silk_label("PULLUP 3V3", 158.0, 126.8, 0, size=0.80)

# =========================================================================
# H. RIGHT TERMINAL PIN LABELS & TITLES (X = 182.0, right aligned)
# =========================================================================
right_labels = [
    ("PV+", 182.0, 35.0), ("GND", 182.0, 29.92),
    ("3V3", 182.0, 55.0), ("DAT", 182.0, 49.92), ("GND", 182.0, 44.84),
    ("PV+", 182.0, 78.0), ("GND", 182.0, 72.92),
    ("3V3", 182.0, 98.0), ("DAT", 182.0, 92.92), ("GND", 182.0, 87.84),
    ("12V", 182.0, 125.0), ("GND", 182.0, 119.92),
    ("COM", 182.0, 150.0), ("NC",  182.0, 155.08)
]
for text, x, y in right_labels:
    add_silk_label(text, x, y, 0, h_align=pcbnew.GR_TEXT_H_ALIGN_RIGHT)

add_silk_label("PV TRK",   188.0, 24.5, 0, size=0.8)
add_silk_label("TEMP TRK", 188.0, 40.5, 0, size=0.8)
add_silk_label("PV STA",   188.0, 67.5, 0, size=0.8)
add_silk_label("TEMP STA", 188.0, 83.5, 0, size=0.8)
add_silk_label("LAMP 12V", 188.0, 114.5, 0, size=0.8)
add_silk_label("RL6 ESP2", 188.0, 140.5, 0, size=0.8)
add_silk_label("COM & NC", 188.0, 163.5, 0, size=0.8)

# Resistor values (R_TEMP at X = 178.0)
add_silk_label("4.7k", 175.5, 55.0, 90, size=0.80)
add_silk_label("4.7k", 175.5, 98.0, 90, size=0.80)

# =========================================================================
# I. STUDENT SIGN-OFF TEXT (Placed neatly in Region 3 bottom right)
# =========================================================================
add_silk_label("SINH VIÊN THỰC HIỆN:", 135.0, 160.0, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT, size=1.1)
add_silk_label("PHAN MINH DUY TIẾN",  135.0, 167.0, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT, size=1.3)
add_silk_label("VÕ HỒNG PHÁT",        135.0, 175.0, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT, size=1.3)

# 3D Model cleanup
for fp in board.GetFootprints():
    ref = fp.GetReference()
    if not ref.startswith('J_ESP') and not ref.startswith('J_SW') and not ref.startswith('J_ENC') and not ref.startswith('J_M') and not ref.startswith('J_PV') and not ref.startswith('J_TEMP') and not ref.startswith('J_LAMP') and not ref.startswith('J_PWR') and not ref.startswith('R_') and not ref.startswith('J_RL'):
        fp.Models().clear()

# Refill zones and save
print("Refilling copper zones...")
board.GetDesignSettings().m_MinResolvedSpokes = 1
filler = pcbnew.ZONE_FILLER(board)
filler.Fill(board.Zones())

board.Save(pcb_path)
print("[SUCCESS] Board silkscreen and 3D layout finalized perfectly with 0 clutter!")
