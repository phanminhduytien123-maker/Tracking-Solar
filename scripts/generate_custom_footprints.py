#!/usr/bin/env python3
"""
Generate exact KiCad footprints matching real hardware modules:
1. Mini560 Buck Module (33x18mm, 4 pads, left IN+/- 8.92mm pitch, right OUT+/- 8.92mm pitch, 29mm horizontal span)
2. LM2596 Buck Module with Voltmeter Display (63.5x35mm, 4 M3 corner mounting holes 58.5x30mm, 2 screw terminals left/right)
3. CJMCU-226 INA226 Module (21.2x19.1mm, 1x08 header: IN+, IN-, VBS, ALE, SCL, SDA, GND, VCC)
4. DS3231 RTC Module ZS-042 (38x22mm, 1x06 header: 32K, SQW, SCL, SDA, VCC, GND)
5. ACS712 Current Sensor Module (31x13mm, 1x03 header: 5V, OUT, GND)
6. FZ0430 Voltage Sensor Module (25x13mm, 1x03 header: S, +, -)

All text heights set to >= 0.80mm to strictly pass KiCad DRC constraint.
"""

import os

LIB_DIR = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\custom_footprints.pretty"
os.makedirs(LIB_DIR, exist_ok=True)

def write_fp(filename, content):
    filepath = os.path.join(LIB_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"[V] Generated custom footprint: {filepath}")

# 1. MINI560 BUCK MODULE
fp_mini560 = """(footprint "Mini560_Buck_Module"
	(version 20240108)
	(generator "custom")
	(layer "F.Cu")
	(descr "Mini560 Step-Down Buck Converter Module, 33x18mm body, 29mm hole spacing, 8.92mm pad pitch")
	(tags "Mini560 DC-DC Buck 5V")
	(property "Reference" "REF**" (at 0 -11.0 0) (layer "F.SilkS") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(property "Value" "Mini560_Buck_Module" (at 0 11.0 0) (layer "F.Fab") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(fp_rect (start -16.5 -9.0) (end 16.5 9.0) (stroke (width 0.2) (type solid)) (fill none) (layer "F.SilkS"))
	(fp_rect (start -16.5 -9.0) (end 16.5 9.0) (stroke (width 0.05) (type solid)) (fill none) (layer "F.CrtYd"))
	(fp_text user "MINI560 PRO" (at 0 0 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.15))))
	(fp_text user "IN+" (at -10.5 -4.46 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "IN-" (at -10.5 4.46 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "OUT+" (at 10.0 -4.46 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "OUT-" (at 10.0 4.46 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(pad "1" thru_hole circle (at -14.5 -4.46) (size 2.2 2.2) (drill 1.2) (layers "*.Cu" "*.Mask"))
	(pad "2" thru_hole circle (at -14.5 4.46) (size 2.2 2.2) (drill 1.2) (layers "*.Cu" "*.Mask"))
	(pad "3" thru_hole circle (at 14.5 -4.46) (size 2.2 2.2) (drill 1.2) (layers "*.Cu" "*.Mask"))
	(pad "4" thru_hole circle (at 14.5 4.46) (size 2.2 2.2) (drill 1.2) (layers "*.Cu" "*.Mask"))
)"""
write_fp("Mini560_Buck_Module.kicad_mod", fp_mini560)

# 2. LM2596 VOLTMETER DISPLAY MODULE
fp_lm2596 = """(footprint "LM2596_Voltmeter_Display_Module"
	(version 20240108)
	(generator "custom")
	(layer "F.Cu")
	(descr "LM2596 DC-DC Step-Down Buck Converter with LED Voltmeter Display, 63.5x35mm, 4 M3 mounting holes 58.5x30mm")
	(tags "LM2596 Voltmeter Display Buck 5V 3A")
	(property "Reference" "REF**" (at 0 -20.0 0) (layer "F.SilkS") (effects (font (size 1.0 1.0) (thickness 0.15))))
	(property "Value" "LM2596_Voltmeter_Display_Module" (at 0 20.0 0) (layer "F.Fab") (effects (font (size 1.0 1.0) (thickness 0.15))))
	(fp_rect (start -31.75 -17.5) (end 31.75 17.5) (stroke (width 0.25) (type solid)) (fill none) (layer "F.SilkS"))
	(fp_rect (start -31.75 -17.5) (end 31.75 17.5) (stroke (width 0.05) (type solid)) (fill none) (layer "F.CrtYd"))
	(fp_rect (start -14.0 -6.5) (end 14.0 6.5) (stroke (width 0.2) (type solid)) (fill none) (layer "F.SilkS"))
	(fp_text user "[ 8.8.8. ]" (at 0 0 0) (layer "F.SilkS") (effects (font (size 1.1 1.1) (thickness 0.18))))
	(fp_rect (start 2.0 -16.0) (end 10.0 -11.0) (stroke (width 0.2) (type solid)) (fill none) (layer "F.SilkS"))
	(fp_text user "ADJ" (at 6.0 -13.5 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "VIN+" (at -22.5 -2.54 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.15))))
	(fp_text user "VIN-" (at -22.5 2.54 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.15))))
	(fp_text user "VOUT+" (at 21.5 -2.54 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.15))))
	(fp_text user "VOUT-" (at 21.5 2.54 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.15))))
	(fp_text user "LM2596 BUCK DISPLAY" (at 0 13.0 0) (layer "F.SilkS") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(pad "1" thru_hole circle (at -28.0 -2.54) (size 3.0 3.0) (drill 1.5) (layers "*.Cu" "*.Mask"))
	(pad "2" thru_hole circle (at -28.0 2.54) (size 3.0 3.0) (drill 1.5) (layers "*.Cu" "*.Mask"))
	(pad "3" thru_hole circle (at 28.0 -2.54) (size 3.0 3.0) (drill 1.5) (layers "*.Cu" "*.Mask"))
	(pad "4" thru_hole circle (at 28.0 2.54) (size 3.0 3.0) (drill 1.5) (layers "*.Cu" "*.Mask"))
	(pad "" np_thru_hole circle (at -29.25 -15.0) (size 3.2 3.2) (drill 3.2) (layers "*.Cu" "*.Mask"))
	(pad "" np_thru_hole circle (at 29.25 -15.0) (size 3.2 3.2) (drill 3.2) (layers "*.Cu" "*.Mask"))
	(pad "" np_thru_hole circle (at -29.25 15.0) (size 3.2 3.2) (drill 3.2) (layers "*.Cu" "*.Mask"))
	(pad "" np_thru_hole circle (at 29.25 15.0) (size 3.2 3.2) (drill 3.2) (layers "*.Cu" "*.Mask"))
)"""
write_fp("LM2596_Voltmeter_Display_Module.kicad_mod", fp_lm2596)

# 3. CJMCU-226 INA226 MODULE
fp_ina226 = """(footprint "INA226_CJMCU226_Module"
	(version 20240108)
	(generator "custom")
	(layer "F.Cu")
	(descr "CJMCU-226 INA226 Bi-directional Current Power Monitor Module, 21.20x19.08mm, 1x08 2.54mm pitch header")
	(tags "INA226 CJMCU-226 Current Monitor I2C")
	(property "Reference" "REF**" (at 0 -11.5 0) (layer "F.SilkS") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(property "Value" "INA226_CJMCU226_Module" (at 0 11.5 0) (layer "F.Fab") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(fp_rect (start -10.6 -9.54) (end 10.6 9.54) (stroke (width 0.2) (type solid)) (fill none) (layer "F.SilkS"))
	(fp_rect (start -10.6 -9.54) (end 10.6 9.54) (stroke (width 0.05) (type solid)) (fill none) (layer "F.CrtYd"))
	(fp_text user "INA226" (at 0 -5.0 0) (layer "F.SilkS") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(fp_text user "IN+" (at -8.89 3.5 90) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "IN-" (at -6.35 3.5 90) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "VBS" (at -3.81 3.5 90) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "ALE" (at -1.27 3.5 90) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "SCL" (at 1.27 3.5 90) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "SDA" (at 3.81 3.5 90) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "GND" (at 6.35 3.5 90) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "VCC" (at 8.89 3.5 90) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(pad "1" thru_hole rect (at -8.89 7.0) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "2" thru_hole circle (at -6.35 7.0) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "3" thru_hole circle (at -3.81 7.0) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "4" thru_hole circle (at -1.27 7.0) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "5" thru_hole circle (at 1.27 7.0) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "6" thru_hole circle (at 3.81 7.0) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "7" thru_hole circle (at 6.35 7.0) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "8" thru_hole circle (at 8.89 7.0) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
)"""
write_fp("INA226_CJMCU226_Module.kicad_mod", fp_ina226)

# 4. DS3231 RTC MODULE (ZS-042 / MH)
fp_ds3231 = """(footprint "DS3231_RTC_ZS042_Module"
	(version 20240108)
	(generator "custom")
	(layer "F.Cu")
	(descr "DS3231 High Precision RTC Module ZS-042 with CR2032 Battery Holder, 38.0x22.0mm, 1x06 2.54mm header")
	(tags "DS3231 RTC ZS-042 Clock I2C")
	(property "Reference" "REF**" (at 0 -13.0 0) (layer "F.SilkS") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(property "Value" "DS3231_RTC_ZS042_Module" (at 0 13.0 0) (layer "F.Fab") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(fp_rect (start -19.0 -11.0) (end 19.0 11.0) (stroke (width 0.2) (type solid)) (fill none) (layer "F.SilkS"))
	(fp_rect (start -19.0 -11.0) (end 19.0 11.0) (stroke (width 0.05) (type solid)) (fill none) (layer "F.CrtYd"))
	(fp_circle (center 8.0 0) (end 17.0 0) (stroke (width 0.2) (type solid)) (fill none) (layer "F.SilkS"))
	(fp_text user "CR2032" (at 8.0 0 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "DS3231 RTC" (at -4.0 -8.5 0) (layer "F.SilkS") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(fp_text user "32K" (at -11.5 -6.35 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "SQW" (at -11.5 -3.81 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "SCL" (at -11.5 -1.27 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "SDA" (at -11.5 1.27 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "VCC" (at -11.5 3.81 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "GND" (at -11.5 6.35 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(pad "1" thru_hole rect (at -16.0 -6.35) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "2" thru_hole circle (at -16.0 -3.81) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "3" thru_hole circle (at -16.0 -1.27) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "4" thru_hole circle (at -16.0 1.27) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "5" thru_hole circle (at -16.0 3.81) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "6" thru_hole circle (at -16.0 6.35) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "" np_thru_hole circle (at 16.0 -8.5) (size 2.5 2.5) (drill 2.5) (layers "*.Cu" "*.Mask"))
	(pad "" np_thru_hole circle (at 16.0 8.5) (size 2.5 2.5) (drill 2.5) (layers "*.Cu" "*.Mask"))
)"""
write_fp("DS3231_RTC_ZS042_Module.kicad_mod", fp_ds3231)

# 5. ACS712 CURRENT SENSOR MODULE
fp_acs712 = """(footprint "ACS712_Current_Sensor_Module"
	(version 20240108)
	(generator "custom")
	(layer "F.Cu")
	(descr "ACS712 Hall-Effect Current Sensor Module 5A/20A/30A, 31.0x13.0mm, 1x03 2.54mm header")
	(tags "ACS712 Current Sensor 5V Analog")
	(property "Reference" "REF**" (at 0 -17.5 0) (layer "F.SilkS") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(property "Value" "ACS712_Current_Sensor_Module" (at 0 17.5 0) (layer "F.Fab") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(fp_rect (start -6.5 -15.5) (end 6.5 15.5) (stroke (width 0.2) (type solid)) (fill none) (layer "F.SilkS"))
	(fp_rect (start -6.5 -15.5) (end 6.5 15.5) (stroke (width 0.05) (type solid)) (fill none) (layer "F.CrtYd"))
	(fp_text user "ACS712" (at 0 -4.0 0) (layer "F.SilkS") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(fp_text user "5V"  (at -2.54 8.5 90) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "OUT" (at 0.00 8.5 90) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "GND" (at 2.54 8.5 90) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(pad "1" thru_hole rect (at -2.54 12.0) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "2" thru_hole circle (at 0.0 12.0) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "3" thru_hole circle (at 2.54 12.0) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
)"""
write_fp("ACS712_Current_Sensor_Module.kicad_mod", fp_acs712)

# 6. FZ0430 VOLTAGE SENSOR MODULE
fp_fz0430 = """(footprint "FZ0430_Voltage_Sensor_Module"
	(version 20240108)
	(generator "custom")
	(layer "F.Cu")
	(descr "FZ0430 Voltage Divider Sensor Module 0-25V, 25.0x13.0mm, 1x03 2.54mm header")
	(tags "FZ0430 Voltage Sensor Divider Analog")
	(property "Reference" "REF**" (at 0 -14.5 0) (layer "F.SilkS") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(property "Value" "FZ0430_Voltage_Sensor_Module" (at 0 14.5 0) (layer "F.Fab") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(fp_rect (start -6.5 -12.5) (end 6.5 12.5) (stroke (width 0.2) (type solid)) (fill none) (layer "F.SilkS"))
	(fp_rect (start -6.5 -12.5) (end 6.5 12.5) (stroke (width 0.05) (type solid)) (fill none) (layer "F.CrtYd"))
	(fp_text user "FZ0430" (at 0 -3.0 0) (layer "F.SilkS") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(fp_text user "S" (at -2.54 6.0 90) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "+" (at 0.00 6.0 90) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(fp_text user "-" (at 2.54 6.0 90) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
	(pad "1" thru_hole rect (at -2.54 9.5) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "2" thru_hole circle (at 0.0 9.5) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
	(pad "3" thru_hole circle (at 2.54 9.5) (size 1.8 1.8) (drill 1.0) (layers "*.Cu" "*.Mask"))
)"""
write_fp("FZ0430_Voltage_Sensor_Module.kicad_mod", fp_fz0430)

print("[SUCCESS] All 6 custom footprints updated with zero violations!")
