import pcbnew

# Footprint for Relay 1-Channel 30A Module (Songle SLA series)
# 50.0 x 34.0 mm, 4 M3 mounting holes at corners (45.0 x 28.0 mm)
fp_relay_1ch = """(footprint "Relay_1Ch_30A_Module"
	(version 20240108)
	(generator "custom")
	(layer "F.Cu")
	(descr "1-Channel 30A High-Power Relay Module with Optocoupler, Songle SLA, 50.0x34.0mm")
	(tags "Relay 1Ch 30A SLA Opto")
	(property "Reference" "REF**" (at 0 -27.0 0) (layer "F.SilkS") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(property "Value" "Relay_1Ch_30A_Module" (at 0 27.0 0) (layer "F.Fab") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(fp_rect (start -17.0 -25.0) (end 17.0 25.0) (stroke (width 0.25) (type solid)) (fill none) (layer "F.SilkS"))
	(fp_rect (start -17.0 -25.0) (end 17.0 25.0) (stroke (width 0.05) (type solid)) (fill none) (layer "F.CrtYd"))
	(fp_rect (start -15.5 -13.5) (end 15.5 13.5) (stroke (width 0.2) (type solid)) (fill none) (layer "F.SilkS"))
	(fp_text user "SONGLE SLA 30A" (at 0 -2.0 0) (layer "F.SilkS") (effects (font (size 0.9 0.9) (thickness 0.15))))
	(fp_text user "RELAY NGẮT ĐÊM" (at 0 2.0 0) (layer "F.SilkS") (effects (font (size 0.85 0.85) (thickness 0.15))))
	(fp_text user "DC+" (at -5.08 -16.5 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.13))))
	(fp_text user "DC-" (at 0.0 -16.5 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.13))))
	(fp_text user "IN" (at 5.08 -16.5 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.13))))
	(fp_text user "NO" (at -5.08 16.5 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.13))))
	(fp_text user "COM" (at 0.0 16.5 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.13))))
	(fp_text user "NC" (at 5.08 16.5 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.13))))
	(pad "1" thru_hole rect (at -5.08 -20.5) (size 2.5 2.5) (drill 1.4) (layers "*.Cu" "*.Mask"))
	(pad "2" thru_hole circle (at 0.0 -20.5) (size 2.5 2.5) (drill 1.4) (layers "*.Cu" "*.Mask"))
	(pad "3" thru_hole circle (at 5.08 -20.5) (size 2.5 2.5) (drill 1.4) (layers "*.Cu" "*.Mask"))
	(pad "4" thru_hole rect (at -5.08 20.5) (size 3.0 3.0) (drill 1.6) (layers "*.Cu" "*.Mask"))
	(pad "5" thru_hole circle (at 0.0 20.5) (size 3.0 3.0) (drill 1.6) (layers "*.Cu" "*.Mask"))
	(pad "6" thru_hole circle (at 5.08 20.5) (size 3.0 3.0) (drill 1.6) (layers "*.Cu" "*.Mask"))
	(pad "" np_thru_hole circle (at -14.0 -22.5) (size 3.2 3.2) (drill 3.2) (layers "*.Cu" "*.Mask"))
	(pad "" np_thru_hole circle (at 14.0 -22.5) (size 3.2 3.2) (drill 3.2) (layers "*.Cu" "*.Mask"))
	(pad "" np_thru_hole circle (at -14.0 22.5) (size 3.2 3.2) (drill 3.2) (layers "*.Cu" "*.Mask"))
	(pad "" np_thru_hole circle (at 14.0 22.5) (size 3.2 3.2) (drill 3.2) (layers "*.Cu" "*.Mask"))
)"""

fp_dir = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\custom_footprints.pretty"
with open(f"{fp_dir}\\Relay_1Ch_30A_Module.kicad_mod", "w", encoding="utf-8") as f:
    f.write(fp_relay_1ch)

print("[SUCCESS] Created Relay_1Ch_30A_Module.kicad_mod footprint successfully!")

