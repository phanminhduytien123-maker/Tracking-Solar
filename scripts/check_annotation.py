import re

with open(r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_sch", "r", encoding="utf-8") as f:
    text = f.read()

refs = re.findall(r'\(property "Reference" "([^"]+)"', text)
print("Total refs found:", len(refs))
unannotated = [r for r in refs if "?" in r]
print("Unannotated count:", len(unannotated), unannotated)

# Check instances
instances = re.findall(r'\(path "\/[^"]+" \(reference "([^"]+)"\)', text)
print("Instances count:", len(instances))
missing_instances = [r for r in set(refs) if r != "REF**" and r not in instances]
print("Missing instances count:", len(missing_instances), missing_instances)

