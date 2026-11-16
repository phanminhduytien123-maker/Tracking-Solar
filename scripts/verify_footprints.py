import re
import os
import pcbnew

sch_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_sch"
with open(sch_path, "r", encoding="utf-8") as f:
    content = f.read()

fps = re.findall(r'\(property "Footprint" "([^"]+)"', content)
unique_fps = sorted(list(set(fps)))

fp_dir = r"D:\KiCAD\share\kicad\footprints"
print(f"Total unique footprints: {len(unique_fps)}")
for fp in unique_fps:
    if ":" in fp:
        lib, name = fp.split(":", 1)
        lib_path = os.path.join(fp_dir, lib + ".pretty")
        if not os.path.exists(lib_path):
            print(f"MISSING LIB: {lib} ({lib_path})")
            continue
        try:
            loaded = pcbnew.FootprintLoad(lib_path, name)
            if loaded:
                print(f"OK: {fp}")
            else:
                print(f"FAILED TO LOAD: {fp}")
        except Exception as e:
            print(f"ERROR: {fp} -> {e}")
    else:
        print(f"NO COLON: {fp}")

