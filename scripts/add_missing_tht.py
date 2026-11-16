pcb_file = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
with open(pcb_file, "r", encoding="utf-8") as f:
    text = f.read()

missing_res = {
    "R_ENC1_B1": {"at": "27 74 90", "net1": "/M1_ENC_B", "net2": "/+3.3V_ESP1", "code1": 5, "code2": 3},
    "R_ENC2_B1": {"at": "27 99 90", "net1": "/M2_ENC_B", "net2": "/+3.3V_ESP1", "code1": 19, "code2": 3},
}

to_add = ""
for ref, d in missing_res.items():
    to_add += f"""
\t(footprint "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal"
\t\t(layer "F.Cu")
\t\t(uuid "{ref}_tht_uuid")
\t\t(at {d['at']})
\t\t(descr "Resistor, Axial_DIN0207 series, Axial, Horizontal, pin pitch=7.62mm, 0.25W = 1/4W, length*diameter=6.3*2.5mm^2")
\t\t(tags "Resistor Axial_DIN0207 series Axial Horizontal pin pitch 7.62mm 0.25W = 1/4W length 6.3mm diameter 2.5mm")
\t\t(property "Reference" "{ref}"
\t\t\t(at 3.81 -2.37 90)
\t\t\t(layer "F.SilkS")
\t\t\t(effects (font (size 1 1) (thickness 0.15)))
\t\t)
\t\t(property "Value" "6.2k"
\t\t\t(at 3.81 2.37 90)
\t\t\t(layer "F.Fab")
\t\t\t(effects (font (size 1 1) (thickness 0.15)))
\t\t)
\t\t(fp_line (start 0.66 -1.25) (end 6.96 -1.25) (stroke (width 0.12) (type solid)) (layer "F.SilkS"))
\t\t(fp_line (start 6.96 -1.25) (end 6.96 1.25) (stroke (width 0.12) (type solid)) (layer "F.SilkS"))
\t\t(fp_line (start 6.96 1.25) (end 0.66 1.25) (stroke (width 0.12) (type solid)) (layer "F.SilkS"))
\t\t(fp_line (start 0.66 1.25) (end 0.66 -1.25) (stroke (width 0.12) (type solid)) (layer "F.SilkS"))
\t\t(pad "1" thru_hole circle (at 0 0 90) (size 1.6 1.6) (drill 0.8) (layers "*.Cu" "*.Mask") (net {d['code1']} "{d['net1']}"))
\t\t(pad "2" thru_hole oval (at 7.62 0 90) (size 1.6 1.6) (drill 0.8) (layers "*.Cu" "*.Mask") (net {d['code2']} "{d['net2']}"))
\t\t(model "${{KICAD10_3DMODEL_DIR}}/Resistor_THT.3dshapes/R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal.step"
\t\t\t(offset (xyz 0 0 0))
\t\t\t(scale (xyz 1 1 1))
\t\t\t(rotate (xyz 0 0 0))
\t\t)
\t)"""

# Insert before the last ')'
last_paren = text.rfind(")")
text = text[:last_paren] + to_add + "\n)"

with open(pcb_file, "w", encoding="utf-8") as f:
    f.write(text)

print("Added R_ENC1_B1 and R_ENC2_B1 to pcb successfully!")

