import pcbnew
import os

p_dir = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\custom_footprints.pretty"
os.makedirs(p_dir, exist_ok=True)

mod_content = """(footprint "Mini560"
  (version 20240108)
  (generator "custom")
  (layer "F.Cu")
  (property "Reference" "REF**" (at 0 -11 0) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))
  (property "Value" "Mini560" (at 0 11 0) (layer "F.Fab") (effects (font (size 1 1) (thickness 0.15))))
  (pad "1" thru_hole circle (at -14.5 -4.46) (size 2.2 2.2) (drill 1.2) (layers "*.Cu" "*.Mask"))
  (pad "2" thru_hole circle (at -14.5 4.46) (size 2.2 2.2) (drill 1.2) (layers "*.Cu" "*.Mask"))
  (pad "3" thru_hole circle (at 14.5 -4.46) (size 2.2 2.2) (drill 1.2) (layers "*.Cu" "*.Mask"))
  (pad "4" thru_hole circle (at 14.5 4.46) (size 2.2 2.2) (drill 1.2) (layers "*.Cu" "*.Mask"))
)"""

with open(os.path.join(p_dir, "Mini560.kicad_mod"), "w") as f:
    f.write(mod_content)

fp = pcbnew.FootprintLoad(p_dir, "Mini560")
print("FootprintLoad success:", fp is not None)
if fp:
    print("Pads count:", len(fp.Pads()))
    for pad in fp.Pads():
        print(f"Pad {pad.GetPadName()} at ({pad.GetPosition().x/1e6:.2f}, {pad.GetPosition().y/1e6:.2f})")

