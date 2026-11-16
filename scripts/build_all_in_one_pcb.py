#!/usr/bin/env python3
"""
Generate PCB outline and zones for 220mm x 160mm All-in-One Dual-ESP Board.
"""

import uuid

def uid():
    return str(uuid.uuid4())

def build_pcb_outline(filepath):
    x1, y1 = 10.0, 10.0
    x2, y2 = 230.0, 170.0
    
    content = f"""(kicad_pcb
\t(version 20240108)
\t(generator "pcbnew")
\t(generator_version "10.0")
\t(general
\t\t(thickness 1.6)
\t\t(legacy_teardrops no)
\t)
\t(paper "A3")
\t(title_block
\t\t(title "SOLAR TRACKER ALL-IN-ONE DUAL ESP32-S3 MOTHERBOARD")
\t\t(date "2026-11-11")
\t\t(rev "v2.0")
\t\t(company "Do An Tot Nghiep 2026")
\t\t(comment 1 "Dual ESP32-S3 + 6-Ch Relay + 2x INA226 + 2x ACS712 + 2x FZ0430 + 2x LM2596 + Mini560")
\t)
\t(layers
\t\t(0 "F.Cu" signal)
\t\t(31 "B.Cu" signal)
\t\t(32 "B.Adhes" user "B.Adhesive")
\t\t(33 "F.Adhes" user "F.Adhesive")
\t\t(34 "B.Paste" user)
\t\t(35 "F.Paste" user)
\t\t(36 "B.SilkS" user "B.Silkscreen")
\t\t(37 "F.SilkS" user "F.Silkscreen")
\t\t(38 "B.Mask" user)
\t\t(39 "F.Mask" user)
\t\t(40 "Dwgs.User" user "User.Drawings")
\t\t(41 "Cmts.User" user "User.Comments")
\t\t(42 "Eco1.User" user "User.Eco1")
\t\t(43 "Eco2.User" user "User.Eco2")
\t\t(44 "Edge.Cuts" user)
\t\t(45 "Margin" user)
\t\t(46 "B.CrtYd" user "B.Courtyard")
\t\t(47 "F.CrtYd" user "F.Courtyard")
\t\t(48 "B.Fab" user)
\t\t(49 "F.Fab" user)
\t)
\t(setup
\t\t(pad_to_mask_clearance 0.05)
\t\t(allow_soldermask_bridges_in_footprints no)
\t)
\t(gr_rect (start {x1} {y1}) (end {x2} {y2}) (stroke (width 0.15) (type solid)) (fill none) (layer "Edge.Cuts") (uuid "{uid()}"))
\t(gr_circle (center 15.0 15.0) (end 16.6 15.0) (stroke (width 0.15) (type solid)) (fill none) (layer "Edge.Cuts") (uuid "{uid()}"))
\t(gr_circle (center 225.0 15.0) (end 226.6 15.0) (stroke (width 0.15) (type solid)) (fill none) (layer "Edge.Cuts") (uuid "{uid()}"))
\t(gr_circle (center 15.0 165.0) (end 16.6 165.0) (stroke (width 0.15) (type solid)) (fill none) (layer "Edge.Cuts") (uuid "{uid()}"))
\t(gr_circle (center 225.0 165.0) (end 226.6 165.0) (stroke (width 0.15) (type solid)) (fill none) (layer "Edge.Cuts") (uuid "{uid()}"))
\t(gr_text "ZONE 1: ESP1 TRACKER MASTER CONTROLLER" (at 45.0 16.0 0) (layer "F.SilkS") (uuid "{uid()}") (effects (font (size 1.8 1.8) (thickness 0.3))))
\t(gr_line (start 85.0 10.0) (end 85.0 170.0) (stroke (width 0.25) (type dash)) (layer "F.SilkS") (uuid "{uid()}"))
\t(gr_text "ZONE 2: POWER MANAGEMENT" (at 115.0 16.0 0) (layer "F.SilkS") (uuid "{uid()}") (effects (font (size 1.8 1.8) (thickness 0.3))))
\t(gr_text "12V GRID / 12V BATT / 2x LM2596 / MINI560" (at 115.0 20.0 0) (layer "F.SilkS") (uuid "{uid()}") (effects (font (size 1.2 1.2) (thickness 0.2))))
\t(gr_line (start 145.0 10.0) (end 145.0 170.0) (stroke (width 0.25) (type dash)) (layer "F.SilkS") (uuid "{uid()}"))
\t(gr_text "ZONE 3: ESP2 VOC/ISC NODE & 6-CH RELAY" (at 185.0 16.0 0) (layer "F.SilkS") (uuid "{uid()}") (effects (font (size 1.8 1.8) (thickness 0.3))))
\t(gr_text "2x ACS712 / 2x FZ0430 / LAMP 12V / 2x PV IN" (at 185.0 20.0 0) (layer "F.SilkS") (uuid "{uid()}") (effects (font (size 1.2 1.2) (thickness 0.2))))
)
"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[V] PCB outline generated: {filepath}")

if __name__ == '__main__':
    build_pcb_outline('d:/DOANTOTNGHIEP/hardware/solar_tracker_mainboard/solar_tracker_mainboard.kicad_pcb')
