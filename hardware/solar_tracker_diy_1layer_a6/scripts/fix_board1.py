import pcbnew
import os

def fix_board1():
    pcb_path = r'd:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6\board1_tracker_master\board1_tracker_master.kicad_pcb'
    b = pcbnew.LoadBoard(pcb_path)
    print("=== RE-ROUTING BOARD 1 CLEANLY ===")
    
    net_12v_bat = b.FindNet('/+12V_BAT')
    net_3v3_esp1 = b.FindNet('/+3.3V_ESP1')
    net_m1_a = b.FindNet('/M1_ENC_A')
    net_m1_b = b.FindNet('/M1_ENC_B')
    net_m2_a = b.FindNet('/M2_ENC_A')
    net_m2_b = b.FindNet('/M2_ENC_B')
    net_5v_enc = b.FindNet('/+5V_ENC')

    # 1. Clean up old tracks and vias of +12V_BAT
    for t in list(b.GetTracks()):
        if t.GetNetname() == '/+12V_BAT':
            b.Delete(t)

    # 2. Add via at (58.00, 23.00) for +12V_BAT
    via_bat = pcbnew.PCB_VIA(b)
    via_bat.SetPosition(pcbnew.VECTOR2I(int(58.00 * 1e6), int(23.00 * 1e6)))
    via_bat.SetWidth(int(1.9 * 1e6))
    via_bat.SetDrill(int(0.8 * 1e6))
    via_bat.SetNet(net_12v_bat)
    b.Add(via_bat)

    # 3. Route +12V_BAT on B.Cu (1.8mm width)
    # J_PWR_BAT12V1 pad 1 (58.00, 16.00) -> (58.00, 23.00) -> (82.54, 23.00) -> LM2596 #1 pad 1 (88.54, 17.00)
    for p1, p2 in [((58.00, 16.00), (58.00, 23.00)),
                   ((58.00, 23.00), (82.54, 23.00)),
                   ((82.54, 23.00), (88.54, 17.00))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(1.8 * 1e6))
        seg.SetLayer(pcbnew.B_Cu)
        seg.SetNet(net_12v_bat)
        b.Add(seg)

    # Route jumper on F.Cu from (58.00, 23.00) to J_BUS_LINK1 pad 2 (59.08, 152.00)
    for p1, p2 in [((58.00, 23.00), (59.08, 24.08)),
                   ((59.08, 24.08), (59.08, 152.00))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(1.5 * 1e6))
        seg.SetLayer(pcbnew.F_Cu)
        seg.SetNet(net_12v_bat)
        b.Add(seg)

    # 4. Clean up all tracks of encoder pull-ups and 3V3 stubs
    for t in list(b.GetTracks()):
        s, e = t.GetStart(), t.GetEnd()
        netname = t.GetNetname()
        # Delete old 3.3V tracks in x < 40 and y < 80
        if netname == '/+3.3V_ESP1' and (s.x < 42*1e6 and e.x < 42*1e6 and s.y < 80*1e6 and e.y < 80*1e6):
            b.Delete(t)
        # Delete old encoder stub tracks on F.Cu
        if netname in ['/M1_ENC_A', '/M1_ENC_B', '/M2_ENC_A', '/M2_ENC_B']:
            if t.GetLayerName() == 'F.Cu':
                b.Delete(t)
            elif t.GetLayerName() == 'B.Cu' and (s.x > 18*1e6 and s.x < 36*1e6 and s.y < 75*1e6):
                b.Delete(t)

    # Resistor layout: horizontal at x = 32.00, Pad 1 at 32.00, Pad 2 at 39.62
    res_configs = [
        ('R_ENC1_A1', 58.00, net_m1_a, 58.16),
        ('R_ENC1_B1', 62.00, net_m1_b, 63.24),
        ('R_ENC2_A1', 66.00, net_m2_a, 82.16),
        ('R_ENC2_B1', 70.00, net_m2_b, 87.24),
    ]
    for ref, ypos, net_sig, y_enc in res_configs:
        fp = b.FindFootprintByReference(ref)
        if fp:
            fp.SetPosition(pcbnew.VECTOR2I(int(32.00 * 1e6), int(ypos * 1e6)))
            fp.SetOrientationDegrees(0.0)

    # Connect Pad 2 (x = 39.62) of all 4 resistors to +3.3V_ESP1
    for y1, y2 in [(58.00, 62.00), (62.00, 66.00), (66.00, 70.00)]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(39.62 * 1e6), int(y1 * 1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(39.62 * 1e6), int(y2 * 1e6)))
        seg.SetWidth(int(0.5 * 1e6))
        seg.SetLayer(pcbnew.F_Cu)
        seg.SetNet(net_3v3_esp1)
        b.Add(seg)
    # Connect from (39.62, 70.00) to J_ESP1_L1 pin 1 (42.00, 78.00)
    for p1, p2 in [((39.62, 70.00), (39.62, 78.00)), ((39.62, 78.00), (42.00, 78.00))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0] * 1e6), int(p1[1] * 1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0] * 1e6), int(p2[1] * 1e6)))
        seg.SetWidth(int(0.5 * 1e6))
        seg.SetLayer(pcbnew.F_Cu)
        seg.SetNet(net_3v3_esp1)
        b.Add(seg)

    # Connect Pad 1 (x = 32.00) of each resistor to its encoder line
    # M1_ENC_A: (32.00, 58.00) -> (17.00, 58.16)
    seg = pcbnew.PCB_TRACK(b)
    seg.SetStart(pcbnew.VECTOR2I(int(32.00 * 1e6), int(58.00 * 1e6)))
    seg.SetEnd(pcbnew.VECTOR2I(int(17.00 * 1e6), int(58.16 * 1e6)))
    seg.SetWidth(int(0.4 * 1e6))
    seg.SetLayer(pcbnew.B_Cu)
    seg.SetNet(net_m1_a)
    b.Add(seg)

    # M1_ENC_B: (32.00, 62.00) -> (17.00, 63.24)
    seg = pcbnew.PCB_TRACK(b)
    seg.SetStart(pcbnew.VECTOR2I(int(32.00 * 1e6), int(62.00 * 1e6)))
    seg.SetEnd(pcbnew.VECTOR2I(int(17.00 * 1e6), int(63.24 * 1e6)))
    seg.SetWidth(int(0.4 * 1e6))
    seg.SetLayer(pcbnew.B_Cu)
    seg.SetNet(net_m1_b)
    b.Add(seg)

    # M2_ENC_A: (32.00, 66.00) -> (24.00, 66.00) -> (24.00, 82.16) -> (17.00, 82.16)
    for p1, p2 in [((32.00, 66.00), (24.00, 66.00)), ((24.00, 66.00), (24.00, 82.16)), ((24.00, 82.16), (17.00, 82.16))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0] * 1e6), int(p1[1] * 1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0] * 1e6), int(p2[1] * 1e6)))
        seg.SetWidth(int(0.4 * 1e6))
        seg.SetLayer(pcbnew.B_Cu)
        seg.SetNet(net_m2_a)
        b.Add(seg)

    # M2_ENC_B: (32.00, 70.00) -> (22.00, 70.00) -> (22.00, 87.24) -> (17.00, 87.24)
    for p1, p2 in [((32.00, 70.00), (22.00, 70.00)), ((22.00, 70.00), (22.00, 87.24)), ((22.00, 87.24), (17.00, 87.24))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0] * 1e6), int(p1[1] * 1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0] * 1e6), int(p2[1] * 1e6)))
        seg.SetWidth(int(0.4 * 1e6))
        seg.SetLayer(pcbnew.B_Cu)
        seg.SetNet(net_m2_b)
        b.Add(seg)

    # 5. Route +5V_ENC cleanly from U_MINI560 pad 3 (42.46, 52.50)
    # -> (37.96, 48.00) -> (17.00, 48.00) -> (15.23, 49.77)
    for t in list(b.GetTracks()):
        if t.GetNetname() == '/+5V_ENC':
            b.Delete(t)
    for p1, p2 in [((42.46, 52.50), (37.96, 48.00)),
                   ((37.96, 48.00), (17.00, 48.00)),
                   ((17.00, 48.00), (15.23, 49.77)),
                   ((15.23, 49.77), (15.23, 70.23)),
                   ((15.23, 70.23), (17.00, 72.00))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0] * 1e6), int(p1[1] * 1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0] * 1e6), int(p2[1] * 1e6)))
        seg.SetWidth(int(0.8 * 1e6))
        seg.SetLayer(pcbnew.B_Cu)
        seg.SetNet(net_5v_enc)
        b.Add(seg)

    # Refill zones and save
    filler = pcbnew.ZONE_FILLER(b)
    filler.Fill(b.Zones())
    b.Save(pcb_path)
    print("Board 1 re-routed and saved.")

fix_board1()
