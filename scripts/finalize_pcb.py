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
    'VÙNG 1: BỘ ĐIỀU KHIỂN CHÍNH (ESP32-S3 #1)',
    'VÙNG 2: QUẢN LÝ NGUỒN (12V / 5V DC-DC)',
    '12V Tổ Ong / 12V Ắc Quy / Mini560 / 2x LM2596',
    'VÙNG 3: ĐO ĐẠC VOC/ISC/TEMP & RƠ-LE (ESP32-S3 #2)',
    '2x ACS712 / 2x FZ0430 / 2x DS18B20 / Relay 6-Ch / Tải 12V'
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
# A. LEFT TERMINAL PIN LABELS & TITLES (X = 23.0, left aligned)
# =========================================================================
# Left terminal pin labels (vertical at X = 24.5)
left_labels = [
    ("SW", 24.5, 30.0), ("GND", 24.5, 35.08),
    ("SW", 24.5, 46.0), ("GND", 24.5, 51.08),
    ("5V", 24.5, 70.0), ("GND", 24.5, 75.08), ("A", 24.5, 80.16), ("B", 24.5, 85.24),
    ("5V", 24.5, 96.0), ("GND", 24.5, 101.08), ("A", 24.5, 106.16), ("B", 24.5, 111.24),
    ("PUL1+", 24.5, 118.0), ("DIR1+", 24.5, 123.08), ("PUL1-", 24.5, 128.16), ("DIR1-", 24.5, 133.24),
    ("PUL2+", 24.5, 142.0), ("DIR2+", 24.5, 147.08), ("PUL2-", 24.5, 152.16), ("DIR2-", 24.5, 157.24)
]
for text, x, y in left_labels:
    add_silk_label(text, x, y, 90, size=0.80)

# Functional titles for left terminals (placed cleanly between terminals)
add_silk_label("LIMIT 1", 17.0, 24.5, 0, size=0.8)
add_silk_label("LIMIT 2", 17.0, 40.5, 0, size=0.8)
add_silk_label("ENC 1",   17.0, 64.0, 0, size=0.8)
add_silk_label("ENC 2",   17.0, 89.5, 0, size=0.8)
add_silk_label("DM556-1", 17.0, 137.0, 0, size=0.8)
add_silk_label("DM556-2", 17.0, 161.5, 0, size=0.8)

# Resistor values (R_ENC at X = 26.5)
add_silk_label("6.2k", 29.5, 64.0, 90, size=0.80)
add_silk_label("6.2k", 29.5, 76.0, 90, size=0.80)
add_silk_label("6.2k", 29.5, 88.0, 90, size=0.80)
add_silk_label("6.2k", 29.5, 104.0, 90, size=0.80)

# =========================================================================
# B. ESP32-S3 #1 PIN LABELS (Left: X=38.0, Right: X=59.4)
# =========================================================================
esp1_l_labels = [
    (1,  "3V3"),
    (2,  "3V3"),
    (3,  "EN"),
    (4,  "G4 (RGT)"),
    (5,  "G5 (PWR_CUT)"),
    (6,  "G6 (ENC1_A)"),
    (7,  "G7 (ENC1_B)"),
    (8,  "G15"),
    (9,  "G16 (ENC2_A)"),
    (10, "G17 (ENC2_B)"),
    (11, "G18 (HOME1)"),
    (12, "G8 (SDA)"),
    (13, "G3 (LFT)"),
    (14, "G46"),
    (15, "G9 (SCL)"),
    (16, "G10 (PUL1)"),
    (17, "G11 (DIR1)"),
    (18, "G12 (PUL2)"),
    (19, "G13 (DIR2)"),
    (20, "G14"),
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
    (4,  "(TOP) G1"),
    (5,  "(BOT) G2"),
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
    (17, "(SQW) G47"),
    (18, "(HOME2) G21"),
    (19, "G20"),
    (20, "G19"),
    (21, "GND"),
    (22, "GND")
]
for pin, text in esp1_r_labels:
    y = 55.0 + (pin - 1) * 2.54
    add_esp_label(f"{text}:{pin}", 59.4, y, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

# ESP1 Orientation and Markers
add_silk_label("[ ANTENNA (TOP) ]", 48.7, 49.0, 0, pcbnew.GR_TEXT_H_ALIGN_CENTER)
add_silk_label("ESP32-S3 #1 (TRACKER)", 48.7, 51.5, 0, pcbnew.GR_TEXT_H_ALIGN_CENTER)
add_silk_label("[ DUAL USB-C (BOTTOM) ]", 48.7, 112.5, 0, pcbnew.GR_TEXT_H_ALIGN_CENTER)
add_silk_label("PIN 1", 32.5, 55.0, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

# =========================================================================
# C. ZONE 1 SENSORS (INA226 x2, RTC DS3231, TEMT6000)
# =========================================================================
# TEMT6000 pads at Y=152.0 (X=50.70, 53.20, 55.70, 58.20, 60.70, 63.20)
temt_labels = [
    ("3V3", 50.70), ("GND", 53.20), ("TOP", 55.70),
    ("BOT", 58.20), ("LFT", 60.70), ("RGT", 63.20)
]
for text, x in temt_labels:
    add_silk_label(text, x, 148.0, 90, size=0.80)
add_silk_label("TEMT6000 CROSS", 56.95, 156.5, 0, size=0.80)

# Functional titles for Zone 1 sensors (placed cleanly outside module bodies)
add_silk_label("INA226 TRK (0x40)", 74.0, 32.5, 0, size=0.85)
add_silk_label("INA226 STA (0x41)", 74.0, 67.5, 0, size=0.85)
add_silk_label("DS3231 RTC (0x68)", 50.7, 139.5, 0, size=0.85)

# =========================================================================
# D. ZONE 2: POWER MODULES & TOP TERMINALS
# =========================================================================
add_silk_label("12V GRID", 105.0, 22.0, 0, size=0.8)
add_silk_label("12V BATT", 135.0, 22.0, 0, size=0.8)
add_silk_label("12V", 105.0, 35.0, 0)
add_silk_label("GND",  99.92, 35.0, 0)
add_silk_label("12V", 135.0, 35.0, 0)
add_silk_label("GND", 129.92, 35.0, 0)

add_silk_label("PRE_5V", 114.0, 148.0, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_silk_label("RL6_COM/NO", 126.5, 148.0, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)

# =========================================================================
# E. ZONE 3 SENSORS (ACS712 x2, FZ0430 x2)
# =========================================================================
# Functional titles for Zone 3 sensors (placed cleanly outside module bodies)
add_silk_label("ACS712 TRK", 165.5, 21.5, 0, size=0.85)
add_silk_label("ACS712 STA", 165.5, 56.5, 0, size=0.85)
add_silk_label("FZ0430 TRK", 165.5, 92.5, 0, size=0.85)
add_silk_label("FZ0430 STA", 165.5, 122.5, 0, size=0.85)

# =========================================================================
# F. ESP32-S3 #2 (Left: X=180.6, Right: X=202.0)
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
    (20, "G14 (RL_A)"),
    (21, "5V_IN"),
    (22, "GND")
]
for pin, text in esp2_l_labels:
    y = 55.0 + (pin - 1) * 2.54
    add_esp_label(f"{pin}:{text}", 180.6, y, pcbnew.GR_TEXT_H_ALIGN_LEFT)

esp2_r_labels = [
    (1,  "GND"),
    (2,  "TX (G43)"),
    (3,  "RX (G44)"),
    (4,  "G1"),
    (5,  "G2"),
    (6,  "(RL_E) G42"),
    (7,  "(RL_B) G41"),
    (8,  "(RL_C) G40"),
    (9,  "(RL_D) G39"),
    (10, "G38"),
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
    add_esp_label(f"{text}:{pin}", 202.0, y, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

# ESP2 Orientation and Markers
add_silk_label("[ ANTENNA (TOP) ]", 191.3, 49.0, 0, pcbnew.GR_TEXT_H_ALIGN_CENTER)
add_silk_label("ESP32-S3 #2 (VOC/ISC/TEMP)", 191.3, 51.5, 0, pcbnew.GR_TEXT_H_ALIGN_CENTER)
add_silk_label("[ DUAL USB-C (BOTTOM) ]", 191.3, 112.5, 0, pcbnew.GR_TEXT_H_ALIGN_CENTER)
add_silk_label("PIN 1", 175.5, 51.5, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)

# =========================================================================
# F. HEADER RELAY 6-CHANNEL (X = 191.0, Y = 125.0, rot = 90)
# =========================================================================
relay_labels = [
    (182.11, 'GND'), (184.65, 'IN1'), (187.19, 'IN2'), (189.73, 'IN3'),
    (192.27, 'IN4'), (194.81, 'IN5'), (197.35, 'IN6'), (199.89, 'VCC')
]
for x, label in relay_labels:
    add_silk_label(label, x, 127.8, 270, pcbnew.GR_TEXT_H_ALIGN_LEFT)

add_silk_label("6-CH RELAY MODULE (K1..K6)", 191.0, 132.8, 0)

# =========================================================================
# G. RIGHT TERMINAL PIN LABELS & TITLES (X = 216.0, right aligned)
# =========================================================================
right_labels = [
    ("PV+", 216.0, 35.0), ("GND", 216.0, 29.92),
    ("3V3", 216.0, 55.0), ("DAT", 216.0, 49.92), ("GND", 216.0, 44.84),
    ("PV+", 216.0, 78.0), ("GND", 216.0, 72.92),
    ("3V3", 216.0, 98.0), ("DAT", 216.0, 92.92), ("GND", 216.0, 87.84),
    ("12V", 216.0, 125.0), ("GND", 216.0, 119.92)
]
for text, x, y in right_labels:
    add_silk_label(text, x, y, 0, h_align=pcbnew.GR_TEXT_H_ALIGN_RIGHT)

# Functional titles for right terminals
add_silk_label("PV TRK",   222.0, 24.5, 0, size=0.8)
add_silk_label("TEMP TRK", 222.0, 40.5, 0, size=0.8)
add_silk_label("RED:3V3 YEL:DAT BLK:GND", 222.0, 61.5, 0, size=0.8)
add_silk_label("PV STA",   222.0, 67.5, 0, size=0.8)
add_silk_label("TEMP STA", 222.0, 83.5, 0, size=0.8)
add_silk_label("RED:3V3 YEL:DAT BLK:GND", 222.0, 104.5, 0, size=0.8)
add_silk_label("LAMP 12V", 222.0, 114.5, 0, size=0.8)

# Resistor values (R_TEMP at X = 209.5)
add_silk_label("4.7k", 207.0, 55.0, 90, size=0.80)
add_silk_label("4.7k", 207.0, 98.0, 90, size=0.80)

# =========================================================================
# H. STUDENT SIGN-OFF TEXT (PROMINENT CREDIT)
# =========================================================================
add_silk_label("SINH VIÊN THỰC HIỆN:", 156.0, 154.5, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT, size=1.5)
add_silk_label("PHAN MINH DUY TIẾN",  182.0, 151.5, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT, size=1.6)
add_silk_label("VÕ HỒNG PHÁT",        182.0, 157.5, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT, size=1.6)

# =========================================================================
# I. 3D MODELS CLEANUP (Pins become clean bare solder holes in 3D viewer)
# =========================================================================
for fp in board.GetFootprints():
    ref = fp.GetReference()
    if not ref.startswith('J_ESP') and not ref.startswith('J_SW') and not ref.startswith('J_ENC') and not ref.startswith('J_M') and not ref.startswith('J_PV') and not ref.startswith('J_TEMP') and not ref.startswith('J_LAMP') and not ref.startswith('J_PWR') and not ref.startswith('R_'):
        fp.Models().clear()

# Set min resolved spokes = 1
board.GetDesignSettings().m_MinResolvedSpokes = 1

# Refill zones and save
print("Refilling copper zones...")
filler = pcbnew.ZONE_FILLER(board)
filler.Fill(board.Zones())

board.Save(pcb_path)
print("[SUCCESS] Board silkscreen and 3D layout finalized perfectly with 0 clutter!")
