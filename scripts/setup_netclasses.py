import json

pro_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pro"
with open(pro_path, "r", encoding="utf-8") as f:
    data = json.load(f)

classes = [
    {
        "name": "Default",
        "clearance": 0.25,
        "track_width": 0.35,
        "via_diameter": 0.8,
        "via_drill": 0.4,
        "priority": 2147483647
    },
    {
        "name": "Power_HighCurrent_2mm",
        "clearance": 0.5,
        "track_width": 2.0,
        "via_diameter": 1.5,
        "via_drill": 0.8,
        "priority": 1
    },
    {
        "name": "Power_5V_1mm",
        "clearance": 0.35,
        "track_width": 1.0,
        "via_diameter": 1.2,
        "via_drill": 0.6,
        "priority": 2
    },
    {
        "name": "Power_3V3",
        "clearance": 0.25,
        "track_width": 0.6,
        "via_diameter": 1.0,
        "via_drill": 0.5,
        "priority": 3
    },
    {
        "name": "Motor_Signals",
        "clearance": 0.35,
        "track_width": 0.5,
        "via_diameter": 1.0,
        "via_drill": 0.5,
        "priority": 4
    }
]

patterns = [
    {"net_pattern": "*12V*", "netclass": "Power_HighCurrent_2mm"},
    {"net_pattern": "*GND_PWR*", "netclass": "Power_HighCurrent_2mm"},
    {"net_pattern": "*PV_*", "netclass": "Power_HighCurrent_2mm"},
    {"net_pattern": "*LAMP_*", "netclass": "Power_HighCurrent_2mm"},
    {"net_pattern": "*5V*", "netclass": "Power_5V_1mm"},
    {"net_pattern": "*3.3V*", "netclass": "Power_3V3"},
    {"net_pattern": "*PUL*", "netclass": "Motor_Signals"},
    {"net_pattern": "*DIR*", "netclass": "Motor_Signals"},
]

data["net_settings"]["classes"] = classes
data["net_settings"]["netclass_patterns"] = patterns

with open(pro_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("Updated net classes and patterns in solar_tracker_mainboard.kicad_pro!")

