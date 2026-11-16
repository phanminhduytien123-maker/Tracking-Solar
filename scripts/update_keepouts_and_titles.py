import pcbnew
import subprocess
import shutil
import os

def mm_to_iu(val):
    return int(val * 1e6)

pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
board = pcbnew.LoadBoard(pcb_path)

# 1. Remove old keepout zones
for z in list(board.Zones()):
    if z.GetIsRuleArea():
        board.DeleteNative(z)

# 2. Add compact, exact Antenna Keepouts (Y: 18.0 to 27.0 mm)
def add_antenna_keepout(x1, y1, x2, y2, layer):
    z = pcbnew.ZONE(board)
    z.SetIsRuleArea(True)
    z.SetDoNotAllowTracks(True)
    z.SetDoNotAllowVias(True)
    z.SetDoNotAllowZoneFills(True)
    z.SetLayer(layer)
    ol = z.Outline()
    ol.NewOutline()
    ol.Append(mm_to_iu(x1), mm_to_iu(y1))
    ol.Append(mm_to_iu(x2), mm_to_iu(y1))
    ol.Append(mm_to_iu(x2), mm_to_iu(y2))
    ol.Append(mm_to_iu(x1), mm_to_iu(y2))
    board.Add(z)

# ESP1 Antenna (matches DevKit antenna overhang: 47 to 68 mm, Y: 18 to 27 mm)
add_antenna_keepout(47.0, 18.0, 68.0, 27.0, pcbnew.F_Cu)
add_antenna_keepout(47.0, 18.0, 68.0, 27.0, pcbnew.B_Cu)

# ESP2 Antenna (matches DevKit antenna overhang: 177 to 198 mm, Y: 18 to 27 mm)
add_antenna_keepout(177.0, 18.0, 198.0, 27.0, pcbnew.F_Cu)
add_antenna_keepout(177.0, 18.0, 198.0, 27.0, pcbnew.B_Cu)

# 3. Clean and beautifully reposition all title texts at Y=14.0mm
for d in board.GetDrawings():
    if d.GetClass() == "PCB_TEXT":
        txt = d.GetText()
        if "VÙNG A" in txt or "VÙNG 1" in txt or "ESP32 #1" in txt:
            d.SetText("VÙNG 1: BỘ ĐIỀU KHIỂN CHÍNH (ESP32-S3 #1)")
            d.SetPosition(pcbnew.VECTOR2I(mm_to_iu(57.7), mm_to_iu(14.0)))
            d.SetTextWidth(mm_to_iu(1.2))
            d.SetTextHeight(mm_to_iu(1.2))
            d.SetTextThickness(mm_to_iu(0.2))
        elif "VÙNG 2" in txt:
            d.SetText("VÙNG 2: QUẢN LÝ NGUỒN (12V / 5V DC-DC)")
            d.SetPosition(pcbnew.VECTOR2I(mm_to_iu(122.0), mm_to_iu(14.0)))
            d.SetTextWidth(mm_to_iu(1.2))
            d.SetTextHeight(mm_to_iu(1.2))
            d.SetTextThickness(mm_to_iu(0.2))
        elif "12V GRID" in txt:
            d.SetText("12V Tổ Ong / 12V Ắc Quy / Mini560 / 2x LM2596")
            d.SetPosition(pcbnew.VECTOR2I(mm_to_iu(122.0), mm_to_iu(18.0)))
            d.SetTextWidth(mm_to_iu(0.9))
            d.SetTextHeight(mm_to_iu(0.9))
            d.SetTextThickness(mm_to_iu(0.15))
        elif "VÙNG 3" in txt or "ESP32 #2" in txt:
            d.SetText("VÙNG 3: ĐO ĐẠC VOC/ISC & RƠ-LE (ESP32-S3 #2)")
            d.SetPosition(pcbnew.VECTOR2I(mm_to_iu(188.0), mm_to_iu(14.0)))
            d.SetTextWidth(mm_to_iu(1.2))
            d.SetTextHeight(mm_to_iu(1.2))
            d.SetTextThickness(mm_to_iu(0.2))
        elif "2x ACS712" in txt or "FZ0430" in txt:
            d.SetText("2x ACS712 / 2x FZ0430 / Relay 6-Ch / Tải 12V")
            d.SetPosition(pcbnew.VECTOR2I(mm_to_iu(188.0), mm_to_iu(18.0)))
            d.SetTextWidth(mm_to_iu(0.9))
            d.SetTextHeight(mm_to_iu(0.9))
            d.SetTextThickness(mm_to_iu(0.15))

# 4. Fill zones
filler = pcbnew.ZONE_FILLER(board)
filler.Fill(board.Zones())

board.Save(pcb_path)
print("Updated keepouts and silkscreen banner titles!")

