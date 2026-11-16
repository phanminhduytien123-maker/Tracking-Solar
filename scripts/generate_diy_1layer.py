# =========================================================================
# GENERATE SCHEMATICS & NETLISTS FOR DIY 1-LAYER DUAL-BOARD EDITION
# Board 1: Tracker Master Controller (ESP1 + Motors + Sensors + Power)
# Board 2: Solar Sensor & Relay Node (ESP2 + ACS712 + FZ0430 + Relays)
# =========================================================================
import os
import uuid
import subprocess

BASE_DIR = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer"
DIR_B1 = os.path.join(BASE_DIR, "board1_tracker_master")
DIR_B2 = os.path.join(BASE_DIR, "board2_sensor_relay")
os.makedirs(DIR_B1, exist_ok=True)
os.makedirs(DIR_B2, exist_ok=True)

def uid():
    return str(uuid.uuid4())

def place_symbol(ref, val, footprint, lib_id, x, y):
    sym_uuid = uid()
    return f"""\t(symbol
\t\t(lib_id "{lib_id}")
\t\t(at {x:.2f} {y:.2f} 0)
\t\t(unit 1)
\t\t(exclude_from_sim no)
\t\t(in_bom yes)
\t\t(on_board yes)
\t\t(dnp no)
\t\t(uuid "{sym_uuid}")
\t\t(property "Reference" "{ref}" (at {x:.2f} {y-5.08:.2f} 0)
\t\t\t(effects (font (size 1.27 1.27)))
\t\t)
\t\t(property "Value" "{val}" (at {x:.2f} {y+5.08:.2f} 0)
\t\t\t(effects (font (size 1.27 1.27)))
\t\t)
\t\t(property "Footprint" "{footprint}" (at {x:.2f} {y:.2f} 0)
\t\t\t(effects (font (size 1.27 1.27)) hide)
\t\t)
\t)
"""

def place_label(name, x, y, angle=0):
    lbl_uuid = uid()
    return f"""\t(label "{name}"
\t\t(at {x:.2f} {y:.2f} {angle})
\t\t(fields_autoplaced yes)
\t\t(effects
\t\t\t(font (size 1.27 1.27))
\t\t\t(justify left bottom)
\t\t)
\t\t(uuid "{lbl_uuid}")
\t)
"""

def place_no_connect(x, y):
    nc_uuid = uid()
    return f"""\t(no_connect
\t\t(at {x:.2f} {y:.2f})
\t\t(uuid "{nc_uuid}")
\t)
"""

PIN_OFFSETS = {
    2: [0.0, 2.54],
    3: [-1.27, 1.27, 3.81],
    4: [-2.54, 0.0, 2.54, 5.08],
    5: [-5.08, -2.54, 0.0, 2.54, 5.08],
    6: [-5.08, -2.54, 0.0, 2.54, 5.08, 7.62],
    8: [-7.62, -5.08, -2.54, 0.0, 2.54, 5.08, 7.62, 10.16],
    22: [-25.4 + i * 2.54 for i in range(22)]
}

def place_connector(ref, val, footprint, lib_id, x, y, nets, is_right=False):
    res = place_symbol(ref, val, footprint, lib_id, x, y)
    n = len(nets)
    offsets = PIN_OFFSETS[n]
    lbl_x = x + 5.08 if is_right else x - 5.08
    lbl_ang = 180 if is_right else 0
    for i, net in enumerate(nets):
        py = y + offsets[i]
        if net == "NC":
            res += place_no_connect(lbl_x, py)
        else:
            res += place_label(net, lbl_x, py, lbl_ang)
    return res

def place_r(ref, val, footprint, x, y, net1, net2):
    res = place_symbol(ref, val, footprint, "Device:R", x, y)
    res += place_label(net1, x, y - 3.81, 90)
    res += place_label(net2, x, y + 3.81, 270)
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

# =========================================================================
# 1. BUILD BOARD 1: TRACKER MASTER CONTROLLER (ESP1)
# =========================================================================
with open(r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_sch", "r", encoding="utf-8") as f:
    orig_sch = f.read()

p1 = orig_sch.find('(lib_symbols')
count = 0
p2 = p1
for idx in range(p1, len(orig_sch)):
    if orig_sch[idx] == '(':
        count += 1
    elif orig_sch[idx] == ')':
        count -= 1
        if count == 0:
            p2 = idx
            break
LIB_SYMBOLS_BLOCK = "\t" + orig_sch[p1:p2+1]

def build_sch_board1():
    sch_path = os.path.join(DIR_B1, "board1_tracker_master.kicad_sch")
    sch_uuid = uid()
    content = f"""(kicad_sch
\t(version 20250114)
\t(generator "eeschema")
\t(generator_version "10.0")
\t(uuid "{sch_uuid}")
\t(paper "A3")
\t(title_block
\t\t(title "DIY 1-LAYER BOARD 1: SOLAR TRACKER MASTER CONTROLLER")
\t\t(date "2026-11-14")
\t\t(rev "DIY-v1.0")
\t\t(company "DO AN TOT NGHIEP - DUY TIEN & HONG PHAT")
\t)
{LIB_SYMBOLS_BLOCK}
"""
    # Power Inputs
    content += place_connector("J_PWR_GRID12V1", "12V To Ong", FP_TERM_2P, "Connector_Generic:Conn_01x02", 40.0, 30.0, ["+12V_GRID", "GND_PWR"])
    content += place_connector("J_PWR_BAT12V1", "12V Ac Quy", FP_TERM_2P, "Connector_Generic:Conn_01x02", 40.0, 50.0, ["+12V_BAT", "GND"])
    content += place_connector("U_MINI560", "Mini560 PRO", FP_MINI560, "Connector_Generic:Conn_01x04", 40.0, 80.0, ["+12V_GRID", "GND_PWR", "+5V_ENC", "GND_PWR"])
    content += place_connector("U_LM2596_ESP1", "LM2596 #1", FP_LM2596, "Connector_Generic:Conn_01x04", 40.0, 115.0, ["+12V_BAT", "GND", "+5V_ESP1", "GND"])

    # Terminals: Motors, Encoders, Homes
    content += place_connector("J_M1_AZ1", "DM556 #1 Azimuth", FP_TERM_6P, "Connector_Generic:Conn_01x06", 40.0, 160.0, ["M1_PUL", "GND", "M1_DIR", "GND", "M1_ENA", "GND"])
    content += place_connector("J_M2_EL1", "DM556 #2 Elevation", FP_TERM_6P, "Connector_Generic:Conn_01x06", 40.0, 190.0, ["M2_PUL", "GND", "M2_DIR", "GND", "M2_ENA", "GND"])
    content += place_connector("J_ENC1_AZ1", "Encoder #1 Azimuth", FP_TERM_4P, "Connector_Generic:Conn_01x04", 40.0, 220.0, ["+5V_ENC", "GND_PWR", "M1_ENC_A", "M1_ENC_B"])
    content += place_connector("J_ENC2_EL1", "Encoder #2 Elevation", FP_TERM_4P, "Connector_Generic:Conn_01x04", 40.0, 250.0, ["+5V_ENC", "GND_PWR", "M2_ENC_A", "M2_ENC_B"])
    content += place_connector("J_SW1", "Home Azimuth", FP_TERM_2P, "Connector_Generic:Conn_01x02", 40.0, 280.0, ["M1_HOME", "GND"])
    content += place_connector("J_SW2", "Home Elevation", FP_TERM_2P, "Connector_Generic:Conn_01x02", 40.0, 300.0, ["M2_HOME", "GND"])

    # Interconnect to Board 2
    content += place_connector("J_BUS_LINK1", "Bus Lien Bo 1->2", FP_TERM_4P, "Connector_Generic:Conn_01x04", 40.0, 330.0, ["GND", "+12V_BAT", "ESP1_CUT_ESP2", "+3.3V_ESP1"])

    # 4 Pull-up resistors for encoders
    content += place_r("R_ENC1_A1", "6.2k", FP_RES_THT, 90.0, 220.0, "M1_ENC_A", "+3.3V_ESP1")
    content += place_r("R_ENC1_B1", "6.2k", FP_RES_THT, 98.0, 220.0, "M1_ENC_B", "+3.3V_ESP1")
    content += place_r("R_ENC2_A1", "6.2k", FP_RES_THT, 90.0, 250.0, "M2_ENC_A", "+3.3V_ESP1")
    content += place_r("R_ENC2_B1", "6.2k", FP_RES_THT, 98.0, 250.0, "M2_ENC_B", "+3.3V_ESP1")

    # Sensors on Board 1
    content += place_connector("J_INA1_TRK1", "INA226 Tracker (0x40)", FP_INA226, "Connector_Generic:Conn_01x08", 140.0, 50.0, ["NC", "NC", "NC", "NC", "I2C_SCL_1", "I2C_SDA_1", "GND", "+3.3V_ESP1"])
    content += place_connector("J_INA2_STA1", "INA226 Static (0x41)", FP_INA226, "Connector_Generic:Conn_01x08", 140.0, 80.0, ["NC", "NC", "NC", "NC", "I2C_SCL_1", "I2C_SDA_1", "GND", "+3.3V_ESP1"])
    content += place_connector("J_RTC1", "RTC DS3231", FP_DS3231, "Connector_Generic:Conn_01x06", 140.0, 115.0, ["NC", "RTC_SQW", "I2C_SCL_1", "I2C_SDA_1", "+3.3V_ESP1", "GND"])
    content += place_connector("J_TEMT_EXT1", "TEMT6000 Cross", "Connector_JST:JST_XH_B6B-XH-A_1x06_P2.50mm_Vertical", "Connector_Generic:Conn_01x06", 140.0, 150.0, ["+3.3V_ESP1", "GND", "TEMT_TOP", "TEMT_BOT", "TEMT_LFT", "TEMT_RGT"])

    # ESP1 DevKit Sockets
    esp1_l = [
        "+3.3V_ESP1",     # Pin 1  : 3V3
        "+3.3V_ESP1",     # Pin 2  : 3V3
        "RESET_1",        # Pin 3  : RST / EN
        "TEMT_RGT",       # Pin 4  : GPIO 4  (ADC1_CH3 - TEMT6000 Phải)
        "ESP1_CUT_ESP2",  # Pin 5  : GPIO 5  (Ngắt khẩn cấp nguồn ESP2 -> Interconnect)
        "M1_ENC_A",       # Pin 6  : GPIO 6  (Pha A Encoder #1)
        "M1_ENC_B",       # Pin 7  : GPIO 7  (Pha B Encoder #1)
        "M1_ENA",         # Pin 8  : GPIO 15 (ENA+ Driver DM556 Trục 1)
        "M2_ENC_A",       # Pin 9  : GPIO 16 (Pha A Encoder #2)
        "M2_ENC_B",       # Pin 10 : GPIO 17 (Pha B Encoder #2)
        "M1_HOME",        # Pin 11 : GPIO 18 (Công tắc hành trình Home Trục 1)
        "I2C_SDA_1",      # Pin 12 : GPIO 8  (I2C SDA cho INA226 & DS3231)
        "TEMT_LFT",       # Pin 13 : GPIO 3  (ADC1_CH2 - TEMT6000 Trái)
        "NC",             # Pin 14 : GPIO 46 (Strapping pin)
        "I2C_SCL_1",      # Pin 15 : GPIO 9  (I2C SCL cho INA226 & DS3231)
        "M1_PUL",         # Pin 16 : GPIO 10 (PUL+ Driver DM556 Trục 1)
        "M1_DIR",         # Pin 17 : GPIO 11 (DIR+ Driver DM556 Trục 1)
        "M2_PUL",         # Pin 18 : GPIO 12 (PUL+ Driver DM556 Trục 2)
        "M2_DIR",         # Pin 19 : GPIO 13 (DIR+ Driver DM556 Trục 2)
        "M2_ENA",         # Pin 20 : GPIO 14 (ENA+ Driver DM556 Trục 2)
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
        "NC",             # Pin 16 : GPIO 48
        "RTC_SQW",        # Pin 17 : GPIO 47 (Ngắt báo thức DS3231)
        "M2_HOME",        # Pin 18 : GPIO 21 (Công tắc hành trình Home Trục 2)
        "NC",             # Pin 19 : GPIO 20 (USB D+)
        "NC",             # Pin 20 : GPIO 19 (USB D-)
        "GND",            # Pin 21 : GND
        "GND"             # Pin 22 : GND
    ]
    content += place_connector("J_ESP1_L1", "ESP32-S3 #1 Left (J1)", FP_ESP_HDR, "Connector_Generic:Conn_01x22", 140.0, 230.0, esp1_l, is_right=False)
    content += place_connector("J_ESP1_R1", "ESP32-S3 #1 Right (J3)", FP_ESP_HDR, "Connector_Generic:Conn_01x22", 190.0, 230.0, esp1_r, is_right=True)

    content += ")\n"
    with open(sch_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[V] Board 1 schematic generated at: {sch_path}")

# =========================================================================
# 2. BUILD BOARD 2: SOLAR SENSOR & RELAY NODE (ESP2)
# =========================================================================
def build_sch_board2():
    sch_path = os.path.join(DIR_B2, "board2_sensor_relay.kicad_sch")
    sch_uuid = uid()
    content = f"""(kicad_sch
\t(version 20250114)
\t(generator "eeschema")
\t(generator_version "10.0")
\t(uuid "{sch_uuid}")
\t(paper "A3")
\t(title_block
\t\t(title "DIY 1-LAYER BOARD 2: SOLAR SENSORS & RELAYS (ESP2)")
\t\t(date "2026-11-14")
\t\t(rev "DIY-v1.0")
\t\t(company "DO AN TOT NGHIEP - DUY TIEN & HONG PHAT")
\t)
{LIB_SYMBOLS_BLOCK}
"""
    # Interconnect from Board 1
    content += place_connector("J_BUS_LINK2", "Bus Lien Bo 1->2", FP_TERM_4P, "Connector_Generic:Conn_01x04", 40.0, 30.0, ["GND", "+12V_BAT", "ESP1_CUT_ESP2", "+3.3V_ESP1"])

    # Power LM2596 #2 (Always ON 24/7)
    content += place_connector("U_LM2596_ESP2", "LM2596 #2", FP_LM2596, "Connector_Generic:Conn_01x04", 40.0, 65.0, ["+12V_BAT", "GND", "+5V_ESP2_PRE", "GND"])

    # Relay 6-Channel Header & Contacts
    content += place_connector("J_RELAY_CTRL1", "Header Relay 6 Kênh", "Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical", "Connector_Generic:Conn_01x08", 40.0, 110.0, ["GND", "RL_CUT_38", "RL_B_ISC", "RL_CUT_38", "RL_D_ISC", "RL_E_LAMP", "ESP1_CUT_ESP2", "+5V_ESP2_PRE"])
    content += place_r("R_RL6_PU1", "10k", FP_RES_THT, 90.0, 110.0, "ESP1_CUT_ESP2", "+3.3V_ESP1")

    # Relay 6 Power Contact Terminal (COM = +5V_ESP2_PRE, NC = +5V_ESP2)
    content += place_connector("J_RL6_ESP2_PWR", "Tiep Diem Relay 6 (COM/NC)", FP_TERM_2P, "Connector_Generic:Conn_01x02", 40.0, 140.0, ["+5V_ESP2_PRE", "+5V_ESP2"])

    # 4 Solar Measurement Modules (ACS712 x2, FZ0430 x2)
    content += place_connector("J_ACS1_TRK1", "ACS712 Tracker (Isc)", FP_ACS712, "Connector_Generic:Conn_01x05", 40.0, 180.0, ["+5V_ESP2", "GND", "ISC_TRK", "NC", "NC"])
    content += place_connector("J_ACS2_STA1", "ACS712 Static (Isc)", FP_ACS712, "Connector_Generic:Conn_01x05", 40.0, 215.0, ["+5V_ESP2", "GND", "ISC_STA", "NC", "NC"])
    content += place_connector("J_FZ1_TRK1", "FZ0430 Tracker (Voc)", FP_FZ0430, "Connector_Generic:Conn_01x03", 40.0, 250.0, ["GND", "NC", "VOC_TRK"])
    content += place_connector("J_FZ2_STA1", "FZ0430 Static (Voc)", FP_FZ0430, "Connector_Generic:Conn_01x03", 40.0, 275.0, ["GND", "NC", "VOC_STA"])

    # External Terminals (PV, Temp, Lamp)
    content += place_connector("J_PV_TRK_IN1", "PV Tracker (+/-)", FP_TERM_2P, "Connector_Generic:Conn_01x02", 140.0, 30.0, ["GND", "+PV_TRK"])
    content += place_connector("J_TEMP_TRK1", "Temp Tracker (DS18B20)", FP_TERM_3P, "Connector_Generic:Conn_01x03", 140.0, 60.0, ["+3.3V_ESP2", "TEMP_TRK", "GND"])
    content += place_connector("J_PV_STA_IN1", "PV Static (+/-)", FP_TERM_2P, "Connector_Generic:Conn_01x02", 140.0, 95.0, ["GND", "+PV_STA"])
    content += place_connector("J_TEMP_STA1", "Temp Static (DS18B20)", FP_TERM_3P, "Connector_Generic:Conn_01x03", 140.0, 125.0, ["+3.3V_ESP2", "TEMP_STA", "GND"])
    content += place_connector("J_LAMP12V_OUT1", "Den 12V (Relay E)", FP_TERM_2P, "Connector_Generic:Conn_01x02", 140.0, 160.0, ["GND", "+12V_LAMP"])

    # 2 Pull-up resistors for DS18B20 (To +3.3V_ESP2, shuts down at night!)
    content += place_r("R_TEMP_TRK1", "4.7k", FP_RES_THT, 90.0, 60.0, "TEMP_TRK", "+3.3V_ESP2")
    content += place_r("R_TEMP_STA1", "4.7k", FP_RES_THT, 90.0, 125.0, "TEMP_STA", "+3.3V_ESP2")

    # ESP2 DevKit Sockets
    esp2_l = [
        "+3.3V_ESP2",     # Pin 1  : 3V3
        "+3.3V_ESP2",     # Pin 2  : 3V3
        "RESET_2",        # Pin 3  : RST / EN
        "VOC_STA",        # Pin 4  : GPIO 4  (ADC1_CH3 - FZ0430 Static)
        "ISC_STA",        # Pin 5  : GPIO 5  (ADC1_CH4 - ACS712 Static)
        "VOC_TRK",        # Pin 6  : GPIO 6  (ADC1_CH5 - FZ0430 Tracker)
        "ISC_TRK",        # Pin 7  : GPIO 7  (ADC1_CH6 - ACS712 Tracker)
        "TEMP_TRK",       # Pin 8  : GPIO 15 (DS18B20 Tracker)
        "TEMP_STA",       # Pin 9  : GPIO 16 (DS18B20 Static)
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
        "NC",             # Pin 20 : GPIO 14
        "+5V_ESP2",       # Pin 21 : 5V (Switched 5V from Relay 6 NC contact)
        "GND"             # Pin 22 : GND
    ]
    esp2_r = [
        "GND",            # Pin 1  : GND
        "NC",             # Pin 2  : TX (GPIO 43)
        "NC",             # Pin 3  : RX (GPIO 44)
        "NC",             # Pin 4  : GPIO 1
        "NC",             # Pin 5  : GPIO 2
        "RL_E_LAMP",      # Pin 6  : GPIO 42 (Relay E - Den 12V)
        "RL_B_ISC",       # Pin 7  : GPIO 41 (Relay B - Ngan mach Isc Tracker)
        "NC",             # Pin 8  : GPIO 40
        "RL_D_ISC",       # Pin 9  : GPIO 39 (Relay D - Ngan mach Isc Static)
        "RL_CUT_38",      # Pin 10 : GPIO 38 (Relay A & C - Cat tai PV)
        "NC",             # Pin 11 : GPIO 37
        "NC",             # Pin 12 : GPIO 36
        "NC",             # Pin 13 : GPIO 35
        "NC",             # Pin 14 : GPIO 0  (Boot)
        "NC",             # Pin 15 : GPIO 45
        "NC",             # Pin 16 : GPIO 48
        "NC",             # Pin 17 : GPIO 47
        "NC",             # Pin 18 : GPIO 21
        "NC",             # Pin 19 : GPIO 20
        "NC",             # Pin 20 : GPIO 19
        "GND",            # Pin 21 : GND
        "GND"             # Pin 22 : GND
    ]
    content += place_connector("J_ESP2_L1", "ESP32-S3 #2 Left (J1)", FP_ESP_HDR, "Connector_Generic:Conn_01x22", 140.0, 230.0, esp2_l, is_right=False)
    content += place_connector("J_ESP2_R1", "ESP32-S3 #2 Right (J3)", FP_ESP_HDR, "Connector_Generic:Conn_01x22", 190.0, 230.0, esp2_r, is_right=True)

    content += ")\n"
    with open(sch_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[V] Board 2 schematic generated at: {sch_path}")

if __name__ == "__main__":
    build_sch_board1()
    build_sch_board2()
