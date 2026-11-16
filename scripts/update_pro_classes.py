import json

pro_path = r"hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pro"
with open(pro_path, "r", encoding="utf-8") as f:
    data = json.load(f)

classes = [
    {
        "name": "Default",
        "clearance": 0.25,
        "track_width": 0.3,
        "via_diameter": 0.8,
        "via_drill": 0.4,
        "priority": 2147483647
    },
    {
        "name": "Power_12V",
        "clearance": 0.35,
        "track_width": 1.8,
        "via_diameter": 1.4,
        "via_drill": 0.7,
        "priority": 1
    },
    {
        "name": "Power_5V",
        "clearance": 0.3,
        "track_width": 1.2,
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
        "clearance": 0.25,
        "track_width": 0.45,
        "via_diameter": 0.9,
        "via_drill": 0.45,
        "priority": 4
    }
]

patterns = [
    {"net_pattern": "*12V*", "netclass": "Power_12V"},
    {"net_pattern": "*GND_PWR*", "netclass": "Power_12V"},
    {"net_pattern": "*PV_*", "netclass": "Power_12V"},
    {"net_pattern": "*LAMP*", "netclass": "Power_12V"},
    {"net_pattern": "*5V*", "netclass": "Power_5V"},
    {"net_pattern": "*3.3V*", "netclass": "Power_3V3"},
    {"net_pattern": "*PUL*", "netclass": "Motor_Signals"},
    {"net_pattern": "*DIR*", "netclass": "Motor_Signals"},
]

data["net_settings"]["classes"] = classes
data["net_settings"]["netclass_patterns"] = patterns

with open(pro_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("Updated kicad_pro!")

