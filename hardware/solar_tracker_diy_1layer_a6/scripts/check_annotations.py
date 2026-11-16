import re

with open(r'd:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer\board2_sensor_relay\board2_sensor_relay.kicad_sch', 'r', encoding='utf-8') as f:
    text = f.read()

# find each (symbol ... )
pos = 0
while True:
    idx = text.find('(symbol', pos)
    if idx == -1:
        break
    end_sym = text.find('\n\t)', idx)
    chunk = text[idx:end_sym+3 if end_sym != -1 else idx+1000]
    pos = idx + 7
    ref_m = re.search(r'\(property "Reference" "([^"]+)"', chunk)
    val_m = re.search(r'\(property "Value" "([^"]+)"', chunk)
    if ref_m:
        r = ref_m.group(1)
        v = val_m.group(1) if val_m else 'None'
        if r == 'J':
            print(f'Symbol with Ref J: Value={v}')
