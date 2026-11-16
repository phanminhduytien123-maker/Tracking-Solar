import pcbnew
import sys

def get_fp_box(fp, x, y, rot):
    fp.SetPosition(pcbnew.VECTOR2I(int(x*1e6), int(y*1e6)))
    fp.SetOrientation(pcbnew.EDA_ANGLE(rot, pcbnew.DEGREES_T))
    bb = fp.GetBoundingBox()
    return (bb.GetX()/1e6, bb.GetY()/1e6, bb.GetRight()/1e6, bb.GetBottom()/1e6)

def check_layout(pcb_path, layout):
    board = pcbnew.LoadBoard(pcb_path)
    boxes = {}
    for ref, (x, y, rot) in layout.items():
        fp = board.FindFootprintByReference(ref)
        if not fp:
            print(f"ERROR: {ref} not found")
            return
        boxes[ref] = get_fp_box(fp, x, y, rot)
    
    overlaps = []
    refs = list(boxes.keys())
    for i in range(len(refs)):
        for j in range(i+1, len(refs)):
            r1, r2 = refs[i], refs[j]
            b1, b2 = boxes[r1], boxes[r2]
            if not (b1[2] <= b2[0] or b1[0] >= b2[2] or b1[3] <= b2[1] or b1[1] >= b2[3]):
                overlaps.append((r1, r2))
    return overlaps, boxes

b2_layout = {
    'U_LM2596_ESP2':  (57.5, 36.0, 0),
    'J_ESP2_L1':      (48.0, 75.0, 0),
    'J_ESP2_R1':      (73.4, 75.0, 0),
    'J_ACS1_TRK1':    (23.0, 78.0, 0),
    'J_ACS2_STA1':    (23.0, 116.0, 0),
    'J_FZ1_TRK1':     (23.0, 152.0, 0),
    'J_FZ2_STA1':     (50.0, 142.0, 0),
    'J_RELAY_CTRL1':  (74.0, 136.0, 0),
    'R_RL6_PU1':      (74.0, 168.0, 0),
    'J_RL6_ESP2_PWR': (88.0, 175.0, 0),
    'J_BUS_LINK2':    (38.0, 175.0, 0),
    'J_PV_TRK_IN1':   (98.0, 70.0, 90),
    'J_TEMP_TRK1':    (98.0, 90.0, 90),
    'R_TEMP_TRK1':    (84.0, 90.0, 90),
    'J_PV_STA_IN1':   (98.0, 112.0, 90),
    'J_TEMP_STA1':    (98.0, 132.0, 90),
    'R_TEMP_STA1':    (84.0, 132.0, 90),
    'J_LAMP12V_OUT1': (98.0, 155.0, 90)
}

ov2, bx2 = check_layout(r'd:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer\board2_sensor_relay\board2_sensor_relay.kicad_pcb', b2_layout)
print("Board 2 Overlaps:", len(ov2), ov2)
