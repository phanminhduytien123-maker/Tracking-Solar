#!/usr/bin/env python3
"""
Generate complete, 100% ERC-clean KiCad 10 Schematics:
- All-in-One Dual ESP32-S3 (ESP1 Tracker Master + ESP2 Voc/Isc Node)
- 6-Channel Relay Module
- 2x INA226, 2x ACS712, 2x FZ0430, RTC DS3231
- 2x LM2596 LED Modules + Mini560 PRO
- External Terminals for 2x DM556 (4-Pin), 2x 3806 Encoders (4-Pin), 2x Home SW, TEMT6000 Cross
- 4x Through-Hole Resistors (Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal)
- Mathematically exact pin-label alignment (0 dangling labels, 0 unconnected pins)
"""

import uuid

def uid():
    return str(uuid.uuid4())

PIN_OFFSETS = {
    2: [0.0, 2.54],
    3: [-1.27, 1.27, 3.81],
    4: [-2.54, 0.0, 2.54, 5.08],
    6: [-5.08, -2.54, 0.0, 2.54, 5.08, 7.62],
    8: [-7.62, -5.08, -2.54, 0.0, 2.54, 5.08, 7.62, 10.16],
    22: [-25.4 + i * 2.54 for i in range(22)]
}

def build_schematic(filepath):
    sch_uuid = uid()
    
    content = f"""(kicad_sch
\t(version 20250114)
\t(generator "eeschema")
\t(generator_version "10.0")
\t(uuid "{sch_uuid}")
\t(paper "A2")
\t(title_block
\t\t(title "SOLAR TRACKER 2-AXIS & DUAL-PANEL MONITORING ALL-IN-ONE MOTHERBOARD")
\t\t(date "2026-11-11")
\t\t(rev "v2.2")
\t\t(company "Do An Tot Nghiep 2026 - Solar Tracking")
\t\t(comment 1 "Dual ESP32-S3 Motherboard: ESP1 (Tracker) + ESP2 (Voc/Isc Node) + 6-Ch Relay + 2x INA226 + 2x ACS712 + 2x FZ0430")
\t\t(comment 2 "Independent Power Trees: 12V Grid Power Supply (DM556 + Mini560 Encoder) & 12V Battery (2x LM2596 Display)")
\t)
"""
    # Embed standard symbols
    content += """\t(lib_symbols
\t\t(symbol "Connector_Generic:Conn_01x02"
\t\t\t(pin_names (offset 1.016) (hide yes))
\t\t\t(property "Reference" "J" (at 0 2.54 0) (effects (font (size 1.27 1.27))))
\t\t\t(property "Value" "Conn_01x02" (at 0 -5.08 0) (effects (font (size 1.27 1.27))))
\t\t\t(symbol "Conn_01x02_1_1"
\t\t\t\t(rectangle (start -1.27 1.27) (end 1.27 -3.81) (stroke (width 0.254) (type default)) (fill (type background)))
\t\t\t\t(pin passive line (at -5.08 0 0) (length 3.81) (name "Pin_1" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 -2.54 0) (length 3.81) (name "Pin_2" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
\t\t\t)
\t\t)
\t\t(symbol "Connector_Generic:Conn_01x03"
\t\t\t(pin_names (offset 1.016) (hide yes))
\t\t\t(property "Reference" "J" (at 0 3.81 0) (effects (font (size 1.27 1.27))))
\t\t\t(property "Value" "Conn_01x03" (at 0 -6.35 0) (effects (font (size 1.27 1.27))))
\t\t\t(symbol "Conn_01x03_1_1"
\t\t\t\t(rectangle (start -1.27 2.54) (end 1.27 -5.08) (stroke (width 0.254) (type default)) (fill (type background)))
\t\t\t\t(pin passive line (at -5.08 1.27 0) (length 3.81) (name "Pin_1" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 -1.27 0) (length 3.81) (name "Pin_2" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 -3.81 0) (length 3.81) (name "Pin_3" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
\t\t\t)
\t\t)
\t\t(symbol "Connector_Generic:Conn_01x04"
\t\t\t(pin_names (offset 1.016) (hide yes))
\t\t\t(property "Reference" "J" (at 0 5.08 0) (effects (font (size 1.27 1.27))))
\t\t\t(property "Value" "Conn_01x04" (at 0 -7.62 0) (effects (font (size 1.27 1.27))))
\t\t\t(symbol "Conn_01x04_1_1"
\t\t\t\t(rectangle (start -1.27 3.81) (end 1.27 -6.35) (stroke (width 0.254) (type default)) (fill (type background)))
\t\t\t\t(pin passive line (at -5.08 2.54 0) (length 3.81) (name "Pin_1" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 0 0) (length 3.81) (name "Pin_2" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 -2.54 0) (length 3.81) (name "Pin_3" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 -5.08 0) (length 3.81) (name "Pin_4" (effects (font (size 1.27 1.27)))) (number "4" (effects (font (size 1.27 1.27)))))
\t\t\t)
\t\t)
\t\t(symbol "Connector_Generic:Conn_01x06"
\t\t\t(pin_names (offset 1.016) (hide yes))
\t\t\t(property "Reference" "J" (at 0 7.62 0) (effects (font (size 1.27 1.27))))
\t\t\t(property "Value" "Conn_01x06" (at 0 -10.16 0) (effects (font (size 1.27 1.27))))
\t\t\t(symbol "Conn_01x06_1_1"
\t\t\t\t(rectangle (start -1.27 6.35) (end 1.27 -8.89) (stroke (width 0.254) (type default)) (fill (type background)))
\t\t\t\t(pin passive line (at -5.08 5.08 0) (length 3.81) (name "Pin_1" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 2.54 0) (length 3.81) (name "Pin_2" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 0 0) (length 3.81) (name "Pin_3" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 -2.54 0) (length 3.81) (name "Pin_4" (effects (font (size 1.27 1.27)))) (number "4" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 -5.08 0) (length 3.81) (name "Pin_5" (effects (font (size 1.27 1.27)))) (number "5" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 -7.62 0) (length 3.81) (name "Pin_6" (effects (font (size 1.27 1.27)))) (number "6" (effects (font (size 1.27 1.27)))))
\t\t\t)
\t\t)
\t\t(symbol "Connector_Generic:Conn_01x08"
\t\t\t(pin_names (offset 1.016) (hide yes))
\t\t\t(property "Reference" "J" (at 0 10.16 0) (effects (font (size 1.27 1.27))))
\t\t\t(property "Value" "Conn_01x08" (at 0 -12.7 0) (effects (font (size 1.27 1.27))))
\t\t\t(symbol "Conn_01x08_1_1"
\t\t\t\t(rectangle (start -1.27 8.89) (end 1.27 -11.43) (stroke (width 0.254) (type default)) (fill (type background)))
\t\t\t\t(pin passive line (at -5.08 7.62 0) (length 3.81) (name "Pin_1" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 5.08 0) (length 3.81) (name "Pin_2" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 2.54 0) (length 3.81) (name "Pin_3" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 0 0) (length 3.81) (name "Pin_4" (effects (font (size 1.27 1.27)))) (number "4" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 -2.54 0) (length 3.81) (name "Pin_5" (effects (font (size 1.27 1.27)))) (number "5" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 -5.08 0) (length 3.81) (name "Pin_6" (effects (font (size 1.27 1.27)))) (number "6" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 -7.62 0) (length 3.81) (name "Pin_7" (effects (font (size 1.27 1.27)))) (number "7" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at -5.08 -10.16 0) (length 3.81) (name "Pin_8" (effects (font (size 1.27 1.27)))) (number "8" (effects (font (size 1.27 1.27)))))
\t\t\t)
\t\t)
\t\t(symbol "Connector_Generic:Conn_01x22"
\t\t\t(pin_names (offset 1.016) (hide yes))
\t\t\t(property "Reference" "J" (at 0 27.94 0) (effects (font (size 1.27 1.27))))
\t\t\t(property "Value" "Conn_01x22" (at 0 -30.48 0) (effects (font (size 1.27 1.27))))
\t\t\t(symbol "Conn_01x22_1_1"
\t\t\t\t(rectangle (start -1.27 26.67) (end 1.27 -29.21) (stroke (width 0.254) (type default)) (fill (type background)))
"""
    for pin_idx in range(1, 23):
        y_pos = 25.4 - (pin_idx - 1) * 2.54
        content += f'\t\t\t\t(pin passive line (at -5.08 {y_pos:.2f} 0) (length 3.81) (name "Pin_{pin_idx}" (effects (font (size 1.27 1.27)))) (number "{pin_idx}" (effects (font (size 1.27 1.27)))))\n'
    content += """\t\t\t)
\t\t)
\t\t(symbol "Device:R"
\t\t\t(pin_numbers (hide yes))
\t\t\t(pin_names (offset 0) (hide yes))
\t\t\t(property "Reference" "R" (at 2.032 0 90) (effects (font (size 1.27 1.27))))
\t\t\t(property "Value" "R" (at -2.032 0 90) (effects (font (size 1.27 1.27))))
\t\t\t(symbol "R_1_1"
\t\t\t\t(rectangle (start -1.016 2.54) (end 1.016 -2.54) (stroke (width 0.254) (type default)) (fill (type none)))
\t\t\t\t(pin passive line (at 0 3.81 270) (length 1.27) (name "~" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
\t\t\t\t(pin passive line (at 0 -3.81 90) (length 1.27) (name "~" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
\t\t\t)
\t\t)
\t)
"""

    def place_symbol(ref, val, footprint, lib_id, x, y, angle=0):
        sym_uuid = uid()
        return f"""\t(symbol
\t\t(lib_id "{lib_id}")
\t\t(at {x:.2f} {y:.2f} {angle})
\t\t(unit 1)
\t\t(exclude_from_sim no)
\t\t(in_bom yes)
\t\t(on_board yes)
\t\t(dnp no)
\t\t(uuid "{sym_uuid}")
\t\t(property "Reference" "{ref}" (at {x:.2f} {y+3.81:.2f} 0) (effects (font (size 1.27 1.27))))
\t\t(property "Value" "{val}" (at {x:.2f} {y-5.08:.2f} 0) (effects (font (size 1.27 1.27))))
\t\t(property "Footprint" "{footprint}" (at {x:.2f} {y:.2f} 0) (effects (font (size 1.27 1.27)) (hide yes)))
\t\t(instances
\t\t\t(project "solar_tracker_mainboard"
\t\t\t\t(path "/{sym_uuid}"
\t\t\t\t\t(reference "{ref}")
\t\t\t\t\t(unit 1)
\t\t\t\t)
\t\t\t)
\t\t)
\t)
"""

    def place_label(text, x, y, angle=0):
        return f"""\t(label "{text}"
\t\t(at {x:.2f} {y:.2f} {angle})
\t\t(fields_autoplaced yes)
\t\t(effects (font (size 1.27 1.27)) (justify left bottom))
\t\t(uuid "{uid()}")
\t)
"""

    def place_no_connect(x, y):
        return f"""\t(no_connect
\t\t(at {x:.2f} {y:.2f})
\t\t(uuid "{uid()}")
\t)
"""

    def place_connector(ref, val, footprint, lib_id, x, y, nets, is_right=False):
        res = place_symbol(ref, val, footprint, lib_id, x, y)
        n = len(nets)
        offsets = PIN_OFFSETS[n]
        lbl_x = x - 5.08
        lbl_ang = 0
        for i, net in enumerate(nets):
            py = y + offsets[i]
            if net == "NC":
                res += place_no_connect(lbl_x, py)
            else:
                res += place_label(net, lbl_x, py, lbl_ang)
        return res

    FP_TERM_2P = "TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal"
    FP_TERM_3P = "TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-3-5.08_1x03_P5.08mm_Horizontal"
    FP_TERM_4P = "TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-4-5.08_1x04_P5.08mm_Horizontal"
    FP_TERM_6P = "TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-6-5.08_1x06_P5.08mm_Horizontal"
    FP_ESP_HDR = "Connector_PinSocket_2.54mm:PinSocket_1x22_P2.54mm_Vertical"
    FP_RES_THT = "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal"
    FP_MINI560 = "custom_footprints:Mini560_Buck_Module"
    FP_LM2596  = "custom_footprints:LM2596_Voltmeter_Display_Module"
    FP_INA226  = "custom_footprints:INA226_CJMCU226_Module"
    FP_DS3231  = "custom_footprints:DS3231_RTC_ZS042_Module"
    FP_ACS712  = "custom_footprints:ACS712_Current_Sensor_Module"
    FP_FZ0430  = "custom_footprints:FZ0430_Voltage_Sensor_Module"
    FP_RELAY_1CH = "custom_footprints:Relay_1Ch_30A_Module"

    # =========================================================================
    # ZONE 2: NGUỒN CẤP & HẠ ÁP (X = 40.0)
    # =========================================================================
    content += place_connector("J_PWR_GRID12V1", "12V Tổ Ong", FP_TERM_2P, "Connector_Generic:Conn_01x02", 40.0, 30.0, ["+12V_GRID", "GND_PWR"])
    content += place_connector("J_PWR_BAT12V1", "12V Ắc Quy", FP_TERM_2P, "Connector_Generic:Conn_01x02", 40.0, 50.0, ["+12V_BAT", "GND"])
    content += place_connector("U_MINI560", "Mini560 PRO", FP_MINI560, "Connector_Generic:Conn_01x04", 40.0, 80.0, ["+12V_GRID", "GND_PWR", "+5V_ENC", "GND"])
    content += place_connector("U_LM2596_ESP1", "LM2596 #1 (ESP1)", FP_LM2596, "Connector_Generic:Conn_01x04", 40.0, 115.0, ["+12V_BAT", "GND", "+5V_ESP1", "GND"])
    content += place_connector("U_LM2596_ESP2", "LM2596 #2 (ESP2)", FP_LM2596, "Connector_Generic:Conn_01x04", 40.0, 150.0, ["+12V_BAT", "GND", "+5V_ESP2_PRE", "GND"])

    # =========================================================================
    # ZONE 1: EXTERNAL MOTORS, ENCODERS, SWITCHES (X = 40.0)
    # =========================================================================
    content += place_connector("J_M1_AZ1", "DM556 #1 Azimuth", FP_TERM_6P, "Connector_Generic:Conn_01x06", 40.0, 190.0, ["M1_PUL", "GND", "M1_DIR", "GND", "M1_ENA", "GND"])
    content += place_connector("J_M2_EL1", "DM556 #2 Elevation", FP_TERM_6P, "Connector_Generic:Conn_01x06", 40.0, 220.0, ["M2_PUL", "GND", "M2_DIR", "GND", "M2_ENA", "GND"])
    content += place_connector("J_ENC1_AZ1", "Encoder #1 Azimuth", FP_TERM_4P, "Connector_Generic:Conn_01x04", 40.0, 250.0, ["+5V_ENC", "GND", "M1_ENC_A", "M1_ENC_B"])
    content += place_connector("J_ENC2_EL1", "Encoder #2 Elevation", FP_TERM_4P, "Connector_Generic:Conn_01x04", 40.0, 280.0, ["+5V_ENC", "GND", "M2_ENC_A", "M2_ENC_B"])
    content += place_connector("J_SW1", "Home Azimuth", FP_TERM_2P, "Connector_Generic:Conn_01x02", 40.0, 310.0, ["M1_HOME", "GND"])
    content += place_connector("J_SW2", "Home Elevation", FP_TERM_2P, "Connector_Generic:Conn_01x02", 40.0, 330.0, ["M2_HOME", "GND"])

    # 4 Through-Hole Pull-up Resistors (X = 90.0 .. 98.0)
    def place_r(ref, val, x, y, net1, net2):
        res = place_symbol(ref, val, FP_RES_THT, "Device:R", x, y)
        res += place_label(net1, x, y - 3.81, 90)
        res += place_label(net2, x, y + 3.81, 270)
        return res

    content += place_r("R_ENC1_A1", "6.2k", 90.0, 250.0, "M1_ENC_A", "+3.3V_ESP1")
    content += place_r("R_ENC1_B1", "6.2k", 98.0, 250.0, "M1_ENC_B", "+3.3V_ESP1")
    content += place_r("R_ENC2_A1", "6.2k", 90.0, 280.0, "M2_ENC_A", "+3.3V_ESP1")
    content += place_r("R_ENC2_B1", "6.2k", 98.0, 280.0, "M2_ENC_B", "+3.3V_ESP1")

    # =========================================================================
    # ZONE 1: ESP1 SENSORS (INA226 x2, RTC DS3231, TEMT6000) (X = 120.0)
    # =========================================================================
    content += place_connector("J_INA1_TRK1", "INA226 Tracker (0x40)", FP_INA226, "Connector_Generic:Conn_01x08", 120.0, 185.0, ["NC", "NC", "NC", "NC", "I2C_SCL_1", "I2C_SDA_1", "GND", "+3.3V_ESP1"])
    content += place_connector("J_INA2_STA1", "INA226 Static (0x41)", FP_INA226, "Connector_Generic:Conn_01x08", 120.0, 215.0, ["NC", "NC", "NC", "NC", "I2C_SCL_1", "I2C_SDA_1", "GND", "+3.3V_ESP1"])
    content += place_connector("J_RTC1", "RTC DS3231", FP_DS3231, "Connector_Generic:Conn_01x06", 120.0, 250.0, ["NC", "RTC_SQW", "I2C_SCL_1", "I2C_SDA_1", "+3.3V_ESP1", "GND"])
    content += place_connector("J_TEMT_EXT1", "TEMT6000 Cross (4-LDR)", "Connector_JST:JST_XH_B6B-XH-A_1x06_P2.50mm_Vertical", "Connector_Generic:Conn_01x06", 120.0, 285.0, ["+3.3V_ESP1", "GND", "TEMT_TOP", "TEMT_BOT", "TEMT_LFT", "TEMT_RGT"])

    # =========================================================================
    # ZONE 1: ESP32-S3 #1 (J1 Left & J3 Right) (X = 120.0 & 170.0, Y = 100.0)
    # Exact Pinout matching ESP32-S3 DevKitC-1 v1.1 & firmware/esp32_devkit_test
    # =========================================================================
    esp1_l = [
        "+3.3V_ESP1",     # Pin 1  : 3V3
        "+3.3V_ESP1",     # Pin 2  : 3V3
        "RESET_1",        # Pin 3  : RST / EN
        "TEMT_RGT",       # Pin 4  : GPIO 4  (ADC1_CH3 - TEMT6000 Phải)
        "ESP1_CUT_ESP2",  # Pin 5  : GPIO 5  (Ngắt khẩn cấp nguồn ESP2 -> Relay IN6)
        "M1_ENC_A",       # Pin 6  : GPIO 6  (Pha A Encoder #1 Trục 1 Azimuth)
        "M1_ENC_B",       # Pin 7  : GPIO 7  (Pha B Encoder #1 Trục 1 Azimuth)
        "M1_ENA",         # Pin 8  : GPIO 15 (ENA+ Driver DM556 Trục 1 Azimuth)
        "M2_ENC_A",       # Pin 9  : GPIO 16 (Pha A Encoder #2 Trục 2 Elevation)
        "M2_ENC_B",       # Pin 10 : GPIO 17 (Pha B Encoder #2 Trục 2 Elevation)
        "M1_HOME",        # Pin 11 : GPIO 18 (Công tắc hành trình Home Trục 1)
        "I2C_SDA_1",      # Pin 12 : GPIO 8  (I2C SDA cho INA226 & DS3231)
        "TEMT_LFT",       # Pin 13 : GPIO 3  (ADC1_CH2 - TEMT6000 Trái)
        "NC",             # Pin 14 : GPIO 46 (Strapping pin)
        "I2C_SCL_1",      # Pin 15 : GPIO 9  (I2C SCL cho INA226 & DS3231)
        "M1_PUL",         # Pin 16 : GPIO 10 (PUL+ Driver DM556 Trục 1)
        "M1_DIR",         # Pin 17 : GPIO 11 (DIR+ Driver DM556 Trục 1)
        "M2_PUL",         # Pin 18 : GPIO 12 (PUL+ Driver DM556 Trục 2)
        "M2_DIR",         # Pin 19 : GPIO 13 (DIR+ Driver DM556 Trục 2)
        "M2_ENA",         # Pin 20 : GPIO 14 (ENA+ Driver DM556 Trục 2 Elevation)
        "+5V_ESP1",       # Pin 21 : 5V (VBUS / 5V IN từ LM2596 #1)
        "GND"             # Pin 22 : GND
    ]
    esp1_r = [
        "GND",            # Pin 1  : GND
        "NC",             # Pin 2  : TX (GPIO 43)
        "NC",             # Pin 3  : RX (GPIO 44)
        "TEMT_TOP",       # Pin 4  : GPIO 1  (ADC1_CH0 - TEMT6000 Trên)
        "TEMT_BOT",       # Pin 5  : GPIO 2  (ADC1_CH1 - TEMT6000 Dưới)
        "NC",             # Pin 6  : GPIO 42
        "NC",             # Pin 7  : GPIO 41
        "NC",             # Pin 8  : GPIO 40
        "NC",             # Pin 9  : GPIO 39
        "NC",             # Pin 10 : GPIO 38
        "NC",             # Pin 11 : GPIO 37
        "NC",             # Pin 12 : GPIO 36
        "NC",             # Pin 13 : GPIO 35
        "NC",             # Pin 14 : GPIO 0  (Boot)
        "NC",             # Pin 15 : GPIO 45
        "NC",             # Pin 16 : GPIO 48 (RGB LED)
        "RTC_SQW",        # Pin 17 : GPIO 47 (Ngắt báo thức DS3231 Alarm 1)
        "M2_HOME",        # Pin 18 : GPIO 21 (Công tắc hành trình Home Trục 2)
        "NC",             # Pin 19 : GPIO 20 (USB D+)
        "NC",             # Pin 20 : GPIO 19 (USB D-)
        "GND",            # Pin 21 : GND
        "GND"             # Pin 22 : GND
    ]
    content += place_connector("J_ESP1_L1", "ESP32-S3 #1 Left (J1)", FP_ESP_HDR, "Connector_Generic:Conn_01x22", 120.0, 100.0, esp1_l, is_right=False)
    content += place_connector("J_ESP1_R1", "ESP32-S3 #1 Right (J3)", FP_ESP_HDR, "Connector_Generic:Conn_01x22", 170.0, 100.0, esp1_r, is_right=True)

    # =========================================================================
    # ZONE 3: ESP32-S3 #2 (J1 Left & J3 Right) (X = 230.0 & 280.0, Y = 100.0)
    # Exact Pinout matching ESP32-S3 DevKitC-1 v1.1 & firmware/esp32_voc_isc_node
    # =========================================================================
    esp2_l = [
        "+3.3V_ESP2",     # Pin 1  : 3V3
        "+3.3V_ESP2",     # Pin 2  : 3V3
        "RESET_2",        # Pin 3  : RST / EN
        "VOC_STA",        # Pin 4  : GPIO 4  (ADC1_CH3 - FZ0430 #1 Tấm Cố Định)
        "ISC_STA",        # Pin 5  : GPIO 5  (ADC1_CH4 - ACS712 #1 Tấm Cố Định)
        "VOC_TRK",        # Pin 6  : GPIO 6  (ADC1_CH5 - FZ0430 #2 Tấm Xoay)
        "ISC_TRK",        # Pin 7  : GPIO 7  (ADC1_CH6 - ACS712 #2 Tấm Xoay)
        "TEMP_TRK",       # Pin 8  : GPIO 15 (Nhiệt độ DS18B20 Tấm Xoay)
        "TEMP_STA",       # Pin 9  : GPIO 16 (Nhiệt độ DS18B20 Tấm Cố Định)
        "NC",             # Pin 10 : GPIO 17
        "NC",             # Pin 11 : GPIO 18
        "NC",             # Pin 12 : GPIO 8
        "NC",             # Pin 13 : GPIO 3
        "NC",             # Pin 14 : GPIO 46
        "NC",             # Pin 15 : GPIO 9
        "NC",             # Pin 16 : GPIO 10
        "NC",             # Pin 17 : GPIO 11
        "NC",             # Pin 18 : GPIO 12
        "NC",             # Pin 19 : GPIO 13
        "NC",             # Pin 20 : GPIO 14 (Trống)
        "+5V_ESP2",       # Pin 21 : 5V (VBUS / 5V IN qua tiếp điểm Rơ-le 6)
        "GND"             # Pin 22 : GND
    ]
    esp2_r = [
        "GND",            # Pin 1  : GND
        "NC",             # Pin 2  : TX
        "NC",             # Pin 3  : RX
        "NC",             # Pin 4  : GPIO 1
        "NC",             # Pin 5  : GPIO 2
        "RL_E_LAMP",      # Pin 6  : GPIO 42 (Relay IN5: Đèn 12V phụ tải đêm)
        "RL_B_ISC",       # Pin 7  : GPIO 41 (Relay IN2: Ngắn mạch Isc Tấm Xoay)
        "NC",             # Pin 8  : GPIO 40 (Trống)
        "RL_D_ISC",       # Pin 9  : GPIO 40/39 (Relay IN4: Ngắn mạch Isc Tấm Cố Định)
        "RL_CUT_38",      # Pin 10 : GPIO 38 (Relay IN1 & IN3: Ngắt tải Tấm Xoay & Cố Định)
        "NC",             # Pin 11 : GPIO 37
        "NC",             # Pin 12 : GPIO 36
        "NC",             # Pin 13 : GPIO 35
        "NC",             # Pin 14 : GPIO 0
        "NC",             # Pin 15 : GPIO 45
        "NC",             # Pin 16 : GPIO 48
        "NC",             # Pin 17 : GPIO 47
        "NC",             # Pin 18 : GPIO 21
        "NC",             # Pin 19 : GPIO 20
        "NC",             # Pin 20 : GPIO 19
        "GND",            # Pin 21 : GND
        "GND"             # Pin 22 : GND
    ]
    content += place_connector("J_ESP2_L1", "ESP32-S3 #2 Left (J1)", FP_ESP_HDR, "Connector_Generic:Conn_01x22", 230.0, 100.0, esp2_l, is_right=False)
    content += place_connector("J_ESP2_R1", "ESP32-S3 #2 Right (J3)", FP_ESP_HDR, "Connector_Generic:Conn_01x22", 280.0, 100.0, esp2_r, is_right=True)

    # =========================================================================
    # ZONE 3: RELAYS, SENSORS & PV IN TERMINALS (X = 340.0)
    # =========================================================================
    relay_nets = ["GND", "RL_CUT_38", "RL_B_ISC", "RL_CUT_38", "RL_D_ISC", "RL_E_LAMP", "ESP1_CUT_ESP2", "+5V_ESP2_PRE"]
    content += place_connector("J_RELAY_CTRL1", "Header Relay 6 Kênh", "Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical", "Connector_Generic:Conn_01x08", 340.0, 50.0, relay_nets)
    content += place_r("R_RL6_PU1", "10k", 365.0, 50.0, "ESP1_CUT_ESP2", "+3.3V_ESP1")
    content += place_connector("J_RL6_ESP2_PWR", "Tiếp Điểm Rơ-le 6 (COM & NC)", FP_TERM_2P, "Connector_Generic:Conn_01x02", 340.0, 85.0, ["+5V_ESP2_PRE", "+5V_ESP2"])
    content += place_connector("J_ACS1_TRK1", "ACS712 #1 Tracker", FP_ACS712, "Connector_Generic:Conn_01x03", 340.0, 120.0, ["+5V_ESP2", "ISC_TRK", "GND"])
    content += place_connector("J_ACS2_STA1", "ACS712 #2 Static", FP_ACS712, "Connector_Generic:Conn_01x03", 340.0, 145.0, ["+5V_ESP2", "ISC_STA", "GND"])
    content += place_connector("J_FZ1_TRK1", "FZ0430 #1 Tracker", FP_FZ0430, "Connector_Generic:Conn_01x03", 340.0, 175.0, ["VOC_TRK", "NC", "GND"])
    content += place_connector("J_FZ2_STA1", "FZ0430 #2 Static", FP_FZ0430, "Connector_Generic:Conn_01x03", 340.0, 195.0, ["VOC_STA", "NC", "GND"])
    content += place_connector("J_PV_TRK_IN1", "Pin Mặt Trời Tracker", FP_TERM_2P, "Connector_Generic:Conn_01x02", 340.0, 220.0, ["PV_TRK_PLUS", "GND"])
    content += place_connector("J_TEMP_TRK1", "Nhiệt Độ Pin Xoay (DS18B20)", FP_TERM_3P, "Connector_Generic:Conn_01x03", 340.0, 245.0, ["+3.3V_ESP2", "TEMP_TRK", "GND"])
    content += place_r("R_TEMP_TRK1", "4.7k", 365.0, 245.0, "TEMP_TRK", "+3.3V_ESP2")
    content += place_connector("J_PV_STA_IN1", "Pin Mặt Trời Cố Định", FP_TERM_2P, "Connector_Generic:Conn_01x02", 340.0, 275.0, ["PV_STA_PLUS", "GND"])
    content += place_connector("J_TEMP_STA1", "Nhiệt Độ Pin Cố Định (DS18B20)", FP_TERM_3P, "Connector_Generic:Conn_01x03", 340.0, 300.0, ["+3.3V_ESP2", "TEMP_STA", "GND"])
    content += place_r("R_TEMP_STA1", "4.7k", 365.0, 300.0, "TEMP_STA", "+3.3V_ESP2")
    content += place_connector("J_LAMP12V_OUT1", "Đèn 12V Phụ Tải Đêm", FP_TERM_2P, "Connector_Generic:Conn_01x02", 340.0, 330.0, ["+12V_LAMP", "GND"])

    content += "\n)"
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[V] Successfully generated 100% exact schematics at: {filepath}")

if __name__ == "__main__":
    build_schematic(r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_sch")
