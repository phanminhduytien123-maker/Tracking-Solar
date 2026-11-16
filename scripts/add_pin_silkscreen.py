import pcbnew

def mm_to_iu(v):
    return int(v * 1e6)

board_path = r"hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
board = pcbnew.LoadBoard(board_path)

def add_label(text, x, y, angle=0, h_align=pcbnew.GR_TEXT_H_ALIGN_CENTER, v_align=pcbnew.GR_TEXT_V_ALIGN_CENTER):
    t = pcbnew.PCB_TEXT(board)
    t.SetText(text)
    t.SetLayer(pcbnew.F_SilkS)
    t.SetPosition(pcbnew.VECTOR2I(mm_to_iu(x), mm_to_iu(y)))
    t.SetTextWidth(mm_to_iu(0.85))
    t.SetTextHeight(mm_to_iu(0.85))
    t.SetTextThickness(mm_to_iu(0.15))
    t.SetTextAngle(pcbnew.EDA_ANGLE(angle, pcbnew.DEGREES_T))
    t.SetHorizJustify(h_align)
    t.SetVertJustify(v_align)
    board.Add(t)

# 1. Left Edge Terminals (Labels placed at X = 25.0)
add_label("SW",  25.0, 30.0,  0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("GND", 25.0, 35.08, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)

add_label("SW",  25.0, 46.0,  0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("GND", 25.0, 51.08, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)

add_label("5V",  25.0, 70.0,  0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("GND", 25.0, 75.08, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("A",   25.0, 80.16, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("B",   25.0, 85.24, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)

add_label("5V",  25.0, 96.0,  0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("GND", 25.0, 101.08, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("A",   25.0, 106.16, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("B",   25.0, 111.24, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)

add_label("5V",  25.0, 118.0, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("PUL", 25.0, 123.08, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("DIR", 25.0, 128.16, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("GND", 25.0, 133.24, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)

add_label("5V",  25.0, 142.0, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("PUL", 25.0, 147.08, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("DIR", 25.0, 152.16, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("GND", 25.0, 157.24, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)

# 2. Right Edge Terminals (Labels placed at X = 215.0)
add_label("PV+", 215.0, 35.0,  0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("GND", 215.0, 29.92, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

add_label("3V3", 215.0, 55.0,  0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("DAT", 215.0, 49.92, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("GND", 215.0, 44.84, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

add_label("PV+", 215.0, 78.0,  0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("GND", 215.0, 72.92, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

add_label("3V3", 215.0, 98.0,  0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("DAT", 215.0, 92.92, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("GND", 215.0, 87.84, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

add_label("12V", 215.0, 125.0, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("GND", 215.0, 119.92, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

# 3. Top Edge Terminals (Labels placed at Y = 35.0)
add_label("12V", 106.0, 35.0, 0)
add_label("GND", 100.92, 35.0, 0)

add_label("12V", 132.0, 35.0, 0)
add_label("GND", 126.92, 35.0, 0)

# 4. Internal Headers
# TEMT6000 (Y = 148.0)
add_label("3V3", 57.7, 147.5, 270)
add_label("GND", 60.2, 147.5, 270)
add_label("TOP", 62.7, 147.5, 270)
add_label("BOT", 65.2, 147.5, 270)
add_label("LFT", 67.7, 147.5, 270)
add_label("RGT", 70.2, 147.5, 270)

# INA1 & INA2 & RTC (X = 88.5)
add_label("3V3", 88.5, 40.0, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("GND", 88.5, 42.54, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("SCL", 88.5, 45.08, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("SDA", 88.5, 47.62, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)

add_label("3V3", 88.5, 65.0, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("GND", 88.5, 67.54, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("SCL", 88.5, 70.08, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("SDA", 88.5, 72.62, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)

add_label("3V3", 88.5, 95.0, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("GND", 88.5, 97.54, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("SCL", 88.5, 100.08, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("SDA", 88.5, 102.62, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)
add_label("SQW", 88.5, 105.16, 0, pcbnew.GR_TEXT_H_ALIGN_LEFT)

# ACS1, ACS2, FZ1, FZ2 (X = 153.5)
add_label("5V",  153.5, 35.0, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("OUT", 153.5, 37.54, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("GND", 153.5, 40.08, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

add_label("5V",  153.5, 55.0, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("OUT", 153.5, 57.54, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("GND", 153.5, 60.08, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

add_label("S",   153.5, 75.0, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("-",   153.5, 77.54, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

add_label("S",   153.5, 95.0, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("-",   153.5, 97.54, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

# Power Modules (X = 101.5 & 127.5)
add_label("IN+",  101.5, 62.0, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("GND",  101.5, 64.54, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("OUT+", 101.5, 67.08, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("GND",  101.5, 69.62, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

add_label("IN+",  127.5, 65.0, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("GND",  127.5, 67.54, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("5V",   127.5, 70.08, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("GND",  127.5, 72.62, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

add_label("IN+",  127.5, 115.0, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("GND",  127.5, 117.54, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("5V",   127.5, 120.08, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("GND",  127.5, 122.62, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

# RL6 Contact
add_label("IN",   101.5, 115.0, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("OUT",  101.5, 117.54, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)
add_label("NC",   101.5, 120.08, 0, pcbnew.GR_TEXT_H_ALIGN_RIGHT)

# Refill zones and save
filler = pcbnew.ZONE_FILLER(board)
filler.Fill(board.Zones())

board.Save(board_path)
print("All pin silkscreen labels added successfully!")

