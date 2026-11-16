import pcbnew

def mm_to_iu(val):
    return int(val * 1e6)

pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
board = pcbnew.LoadBoard(pcb_path)
net_gnd = board.FindNet("/GND")

# 1. Fix resistor reference positions (to the right of resistor body, centered, horizontal)
for r_ref in ["R_ENC1_A1", "R_ENC1_B1", "R_ENC2_A1", "R_ENC2_B1"]:
    fp = board.FindFootprintByReference(r_ref)
    if fp:
        ref_text = fp.Reference()
        ref_text.SetVisible(True)
        ref_text.SetTextWidth(mm_to_iu(0.9))
        ref_text.SetTextHeight(mm_to_iu(0.9))
        ref_text.SetTextThickness(mm_to_iu(0.15))
        # local y = -5.0mm gives global X = +5.0mm (to the right)
        ref_text.SetFPRelativePosition(pcbnew.VECTOR2I(mm_to_iu(0.0), mm_to_iu(-5.0)))
        ref_text.SetTextAngle(pcbnew.EDA_ANGLE(270, pcbnew.DEGREES_T))

# 2. Fix ESP sockets reference positions (above pin 1)
for esp_ref in ["J_ESP1_L1", "J_ESP1_R1", "J_ESP2_L1", "J_ESP2_R1"]:
    fp = board.FindFootprintByReference(esp_ref)
    if fp:
        ref_text = fp.Reference()
        ref_text.SetVisible(True)
        ref_text.SetTextWidth(mm_to_iu(1.0))
        ref_text.SetTextHeight(mm_to_iu(1.0))
        ref_text.SetTextThickness(mm_to_iu(0.15))
        ref_text.SetFPRelativePosition(pcbnew.VECTOR2I(mm_to_iu(0.0), mm_to_iu(-29.0)))
        ref_text.SetTextAngle(pcbnew.EDA_ANGLE(0, pcbnew.DEGREES_T))

# 3. Add via at (132.0, 77.0) to ground the B.Cu island near LM2596 #1
# Only add if not already present
has_via = False
for t in board.GetTracks():
    if t.GetClass() == "PCB_VIA" and (t.GetPosition() - pcbnew.VECTOR2I(mm_to_iu(132.0), mm_to_iu(77.0))).EuclideanNorm() < mm_to_iu(1.0):
        has_via = True
        break

if not has_via:
    via1 = pcbnew.PCB_VIA(board)
    via1.SetPosition(pcbnew.VECTOR2I(mm_to_iu(132.0), mm_to_iu(77.0)))
    via1.SetWidth(mm_to_iu(0.8))
    via1.SetDrill(mm_to_iu(0.4))
    via1.SetViaType(pcbnew.VIATYPE_THROUGH)
    via1.SetNet(net_gnd)
    board.Add(via1)

# Remove any via near (81.0, 97.54) if added
for t in list(board.GetTracks()):
    if t.GetClass() == "PCB_VIA" and (t.GetPosition() - pcbnew.VECTOR2I(mm_to_iu(81.0), mm_to_iu(97.54))).EuclideanNorm() < mm_to_iu(1.0):
        board.DeleteNative(t)

# 5. Fix board text overlapping divider line
for d in board.GetDrawings():
    if d.GetClass() == "PCB_TEXT":
        txt = d.GetText()
        if "12V GRID" in txt:
            d.SetPosition(pcbnew.VECTOR2I(mm_to_iu(122.0), mm_to_iu(20.0)))

# 6. Set min resolved spokes to 1
board.GetDesignSettings().m_MinResolvedSpokes = 1

# Re-fill zones
filler = pcbnew.ZONE_FILLER(board)
filler.Fill(board.Zones())

board.Save(pcb_path)
print("Applied targeted fixes and saved board!")
