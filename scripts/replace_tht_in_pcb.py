import re

pcb_file = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
with open(pcb_file, "r", encoding="utf-8") as f:
    text = f.read()

# Load THT template
mod_file = r"D:\KiCAD\share\kicad\footprints\Resistor_THT.pretty\R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal.kicad_mod"
with open(mod_file, "r", encoding="utf-8") as f:
    mod_text = f.read()

# Strip outer footprint header and closing paren
# mod_text starts with '(footprint "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal"'
# and ends with ')'

res_data = {
    "R_ENC1_A1": {"at": "27 64 90", "net1": "/M1_ENC_A", "net2": "/+3.3V_ESP1", "code1": 21, "code2": 3},
    "R_ENC1_B1": {"at": "27 74 90", "net1": "/M1_ENC_B", "net2": "/+3.3V_ESP1", "code1": 5, "code2": 3},
    "R_ENC2_A1": {"at": "27 89 90", "net1": "/M2_ENC_A", "net2": "/+3.3V_ESP1", "code1": 20, "code2": 3},
    "R_ENC2_B1": {"at": "27 99 90", "net1": "/M2_ENC_B", "net2": "/+3.3V_ESP1", "code1": 19, "code2": 3},
}

for ref, d in res_data.items():
    # Build replacement footprint
    fp_str = f"""\t(footprint "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal"
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
    
    # Regex find old footprint block for ref
    pattern = rf'\t\(footprint "Resistor_SMD:[^\n]+"[\s\S]*?\(property "Reference" "{ref}"[\s\S]*?\n\t\)'
    match = re.search(pattern, text)
    if match:
        text = text[:match.start()] + fp_str + text[match.end():]
        print(f"Replaced {ref} with THT footprint!")
    else:
        # Check if already replaced or alternative pattern
        alt_pattern = rf'\t\(footprint "Resistor_THT:[^\n]+"[\s\S]*?\(property "Reference" "{ref}"[\s\S]*?\n\t\)'
        if re.search(alt_pattern, text):
            text = re.sub(alt_pattern, fp_str, text, count=1)
            print(f"Updated existing THT {ref}!")
        else:
            print(f"WARNING: could not match footprint block for {ref}")

with open(pcb_file, "w", encoding="utf-8") as f:
    f.write(text)

print("Saved updated PCB file with THT resistors!")

