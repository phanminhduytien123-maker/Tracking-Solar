with open(r"d:\DOANTOTNGHIEP\scripts\generate_schematics.py", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update ESP to PinSocket
text = text.replace("Connector_PinHeader_2.54mm:PinHeader_1x22_P2.54mm_Vertical", "Connector_PinSocket_2.54mm:PinSocket_1x22_P2.54mm_Vertical")

# 2. Update Motor Terminals to 4P
old_m1 = """    content += place_symbol("J_M1_AZ", "Terminal Driver DM556 #1 (Azimuth)", FP_TERM_3P, "Connector_Generic:Conn_01x03", 40.0, 190.0)
    content += place_label("M1_PUL", 34.92, 191.27)
    content += place_label("M1_DIR", 34.92, 188.73)
    content += place_label("GND_PWR", 34.92, 186.19)

    content += place_symbol("J_M2_EL", "Terminal Driver DM556 #2 (Elevation)", FP_TERM_3P, "Connector_Generic:Conn_01x03", 40.0, 215.0)
    content += place_label("M2_PUL", 34.92, 216.27)
    content += place_label("M2_DIR", 34.92, 213.73)
    content += place_label("GND_PWR", 34.92, 211.19)"""

new_m1 = """    content += place_symbol("J_M1_AZ", "Terminal Driver DM556 #1 (Azimuth)", FP_TERM_4P, "Connector_Generic:Conn_01x04", 40.0, 190.0)
    content += place_label("+5V_GRID", 34.92, 192.54)
    content += place_label("M1_PUL", 34.92, 190.0)
    content += place_label("M1_DIR", 34.92, 187.46)
    content += place_label("GND_PWR", 34.92, 184.92)

    content += place_symbol("J_M2_EL", "Terminal Driver DM556 #2 (Elevation)", FP_TERM_4P, "Connector_Generic:Conn_01x04", 40.0, 215.0)
    content += place_label("+5V_GRID", 34.92, 217.54)
    content += place_label("M2_PUL", 34.92, 215.0)
    content += place_label("M2_DIR", 34.92, 212.46)
    content += place_label("GND_PWR", 34.92, 209.92)"""

assert old_m1 in text, "old_m1 block not found in file"
text = text.replace(old_m1, new_m1)

with open(r"d:\DOANTOTNGHIEP\scripts\generate_schematics.py", "w", encoding="utf-8") as f:
    f.write(text)

print("Updated generate_schematics.py successfully!")

