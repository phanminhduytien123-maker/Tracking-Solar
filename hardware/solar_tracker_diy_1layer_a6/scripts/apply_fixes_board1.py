import pcbnew
import os

def apply_fixes_board1():
    pcb_path = r'd:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6\board1_tracker_master\board1_tracker_master.kicad_pcb'
    b = pcbnew.LoadBoard(pcb_path)
    print("=== APPLYING BOARD 1 FIXES ===")

    net_12v_bat = b.FindNet('/+12V_BAT')
    net_gnd = b.FindNet('/GND')

    # 1. Remove the dangerous red jumper of +12V_BAT running through antenna keepout (x=59.08)
    # Remove existing tracks and vias of +12V_BAT
    for t in list(b.GetTracks()):
        if t.GetNetname() == '/+12V_BAT':
            b.Delete(t)

    # 2. Delete redundant GND track on F.Cu that brushed against LM2596 #1 VOUT+
    # Track /GND on F.Cu: (89.34, 71.07) -> (85.39, 71.07) -> (83.46, 73.00)
    for t in list(b.GetTracks()):
        if t.GetNetname() == '/GND' and t.GetLayerName() == 'F.Cu':
            s, e = t.GetStart(), t.GetEnd()
            if 80 <= s.x/1e6 <= 92 and 68 <= s.y/1e6 <= 74:
                print(f"Deleting dangerous GND track near VOUT+: ({s.x/1e6:.2f}, {s.y/1e6:.2f}) -> ({e.x/1e6:.2f}, {e.y/1e6:.2f})")
                b.Delete(t)

    # 3. Route +12V_BAT on B.Cu (1.8mm width):
    # J_PWR_BAT12V1 pad 1 (58.00, 16.00) -> (58.00, 23.00) -> (88.54, 23.00) -> LM2596 #1 pad 1 (88.54, 17.00)
    # And continue to the FAR RIGHT edge at x = 104.00 (completely outside ESP1 and LM2596, >38mm from antenna!)
    pts_bat_bcu = [
        ((58.00, 16.00), (58.00, 23.00)),
        ((58.00, 23.00), (88.54, 23.00)),
        ((88.54, 23.00), (88.54, 17.00)),
        ((88.54, 23.00), (104.00, 23.00)),
        ((104.00, 23.00), (104.00, 145.00))
    ]
    for p1, p2 in pts_bat_bcu:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(1.8 * 1e6))
        seg.SetLayer(pcbnew.B_Cu)
        seg.SetNet(net_12v_bat)
        b.Add(seg)

    # Place via at (104.00, 145.00)
    via_bat = pcbnew.PCB_VIA(b)
    via_bat.SetPosition(pcbnew.VECTOR2I(int(104.00 * 1e6), int(145.00 * 1e6)))
    via_bat.SetWidth(int(1.9 * 1e6))
    via_bat.SetDrill(int(0.8 * 1e6))
    via_bat.SetNet(net_12v_bat)
    b.Add(via_bat)

    # Jumper on F.Cu from (104.00, 145.00) across bottom to J_BUS_LINK1 pad 2 (59.08, 152.00)
    pts_bat_jumper = [
        ((104.00, 145.00), (104.00, 152.00)),
        ((104.00, 152.00), (59.08, 152.00))
    ]
    for p1, p2 in pts_bat_jumper:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(1.5 * 1e6))
        seg.SetLayer(pcbnew.F_Cu)
        seg.SetNet(net_12v_bat)
        b.Add(seg)

    filler = pcbnew.ZONE_FILLER(b)
    filler.Fill(b.Zones())
    b.Save(pcb_path)
    print("Board 1 fixes applied successfully.")

apply_fixes_board1()

