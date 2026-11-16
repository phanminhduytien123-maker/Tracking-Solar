import pcbnew
import subprocess

def mm_to_iu(val):
    return int(val * 1e6)

pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
board = pcbnew.LoadBoard(pcb_path)
net_gnd = board.FindNet("/GND")

# 1. Adjust J_M1_AZ1 and J_M2_EL1 Y positions away from bottom-left M3 mounting hole
# J_M1_AZ1: Y=118, J_M2_EL1: Y=142
fp_m1 = board.FindFootprintByReference("J_M1_AZ1")
if fp_m1:
    fp_m1.SetPosition(pcbnew.VECTOR2I(mm_to_iu(18.0), mm_to_iu(118.0)))

fp_m2 = board.FindFootprintByReference("J_M2_EL1")
if fp_m2:
    fp_m2.SetPosition(pcbnew.VECTOR2I(mm_to_iu(18.0), mm_to_iu(142.0)))

# 2. Fix reference positions for all terminals to sit cleanly ABOVE footprint
for ref in ["J_SW1", "J_SW2", "J_ENC1_AZ1", "J_ENC2_EL1", "J_M1_AZ1", "J_M2_EL1"]:
    fp = board.FindFootprintByReference(ref)
    if fp:
        ref_text = fp.Reference()
        ref_text.SetVisible(True)
        ref_text.SetTextWidth(mm_to_iu(0.9))
        ref_text.SetTextHeight(mm_to_iu(0.9))
        ref_text.SetTextThickness(mm_to_iu(0.15))
        ref_text.SetFPRelativePosition(pcbnew.VECTOR2I(mm_to_iu(-6.5), mm_to_iu(0.0)))
        ref_text.SetTextAngle(pcbnew.EDA_ANGLE(90, pcbnew.DEGREES_T))

for ref in ["J_PV_TRK_IN1", "J_PV_STA_IN1", "J_LAMP12V_OUT1"]:
    fp = board.FindFootprintByReference(ref)
    if fp:
        ref_text = fp.Reference()
        ref_text.SetVisible(True)
        ref_text.SetTextWidth(mm_to_iu(0.9))
        ref_text.SetTextHeight(mm_to_iu(0.9))
        ref_text.SetTextThickness(mm_to_iu(0.15))
        ref_text.SetFPRelativePosition(pcbnew.VECTOR2I(mm_to_iu(6.5), mm_to_iu(0.0)))
        ref_text.SetTextAngle(pcbnew.EDA_ANGLE(270, pcbnew.DEGREES_T))

# 3. Add GND via near J_TEMT_EXT1 to tie the B.Cu island
via_temt = pcbnew.PCB_VIA(board)
via_temt.SetPosition(pcbnew.VECTOR2I(mm_to_iu(60.2), mm_to_iu(155.0)))
via_temt.SetWidth(mm_to_iu(0.8))
via_temt.SetDrill(mm_to_iu(0.4))
via_temt.SetViaType(pcbnew.VIATYPE_THROUGH)
via_temt.SetNet(net_gnd)
board.Add(via_temt)

# 4. Set min resolved spokes = 1
board.GetDesignSettings().m_MinResolvedSpokes = 1

# Re-fill zones
filler = pcbnew.ZONE_FILLER(board)
filler.Fill(board.Zones())

board.Save(pcb_path)
print("Applied fine polishes!")

