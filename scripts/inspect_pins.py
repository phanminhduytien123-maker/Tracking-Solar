import re

with open(r"d:\DOANTOTNGHIEP\scripts\generate_schematics.py", "r", encoding="utf-8") as f:
    text = f.read()

symbols = re.findall(r'\(symbol "(Connector_Generic:Conn_01x\d+)"([\s\S]*?)(?=\t\t\(symbol "Connector_Generic|\t\))', text)
for sym_name, body in symbols:
    pin_matches = re.findall(r'\(pin [^\n]+\(at ([^\)]+)\)[^\n]+\(name "[^"]+"[^\n]+\(number "(\d+)"', body)
    print(f"{sym_name}:")
    for at, num in pin_matches:
        print(f"  Pin {num}: at {at}")

