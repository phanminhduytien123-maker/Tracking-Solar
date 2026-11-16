import pcbnew
import os

def apply_fixes_board2():
    pcb_path = r'd:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6\board2_sensor_relay\board2_sensor_relay.kicad_pcb'
    b = pcbnew.LoadBoard(pcb_path)
    print("=== APPLYING BOARD 2 FIXES ===")

    net_12v_bat = b.FindNet('/+12V_BAT')
    net_3v3_esp1 = b.FindNet('/+3.3V_ESP1')
    net_cut = b.FindNet('/ESP1_CUT_ESP2')
    net_3v3_esp2 = b.FindNet('/+3.3V_ESP2')
    net_temp_sta = b.FindNet('/TEMP_STA')
    net_gnd = b.FindNet('/GND')

    # 1. Update J_BUS_LINK2 pin order to match "GND 12V CUT 3V3" top-to-bottom:
    # Pin 1: GND         at (20.00, 15.00)
    # Pin 2: +12V_BAT    at (20.00, 20.08)
    # Pin 3: ESP1_CUT_ESP2 at (20.00, 25.16)
    # Pin 4: +3.3V_ESP1  at (20.00, 30.24)
    fp_bus2 = b.FindFootprintByReference('J_BUS_LINK2')
    fp_bus2.SetPosition(pcbnew.VECTOR2I(int(20.00 * 1e6), int(15.00 * 1e6)))
    fp_bus2.SetOrientationDegrees(270.0) # 270 deg: pin 1 top (15.0), pin 4 bottom (30.24)
    for p in fp_bus2.Pads():
        if p.GetNumber() == '1':
            p.SetNet(net_gnd)
        elif p.GetNumber() == '2':
            p.SetNet(net_12v_bat)
        elif p.GetNumber() == '3':
            p.SetNet(net_cut)
        elif p.GetNumber() == '4':
            p.SetNet(net_3v3_esp1)

    # 2. Fix J_TEMP_STA1 and R_TEMP_STA1 positions:
    # J_PV_STA_IN1 is at y in [90.92, 96.00]
    # Place J_TEMP_STA1 at (98.00, 116.00), rot = 270:
    # Pad 1: (98.00, 116.00) net /+3.3V_ESP2
    # Pad 2: (98.00, 121.08) net /TEMP_STA
    # Pad 3: (98.00, 126.16) net /GND
    fp_jtemp = b.FindFootprintByReference('J_TEMP_STA1')
    fp_jtemp.SetPosition(pcbnew.VECTOR2I(int(98.00 * 1e6), int(116.00 * 1e6)))
    fp_jtemp.SetOrientationDegrees(270.0)

    # Place R_TEMP_STA1 at (86.00, 106.00) horizontal (above ULN2003A):
    # Pad 1: (86.00, 106.00) net /TEMP_STA
    # Pad 2: (93.62, 106.00) net /+3.3V_ESP2
    fp_rtemp = b.FindFootprintByReference('R_TEMP_STA1')
    fp_rtemp.SetPosition(pcbnew.VECTOR2I(int(86.00 * 1e6), int(106.00 * 1e6)))
    fp_rtemp.SetOrientationDegrees(0.0)

    # 3. Place R_RL6_PU1 right next to J_RELAY_CTRL1 at (66.00, 157.78), rot = 90:
    # Pad 1: (66.00, 157.78) net /+3.3V_ESP1 -> directly horizontal to J_RELAY_CTRL1 pad 8 (74.00, 157.78)
    # Pad 2: (66.00, 150.16) or rot so Pad 2 is at (66.00, 155.24) -> directly horizontal to J_RELAY_CTRL1 pad 7 (74.00, 155.24)
    # Let's check pitch of R_RL6_PU1: 7.62mm pitch
    # If rot = 90: Pad 1 is at y, Pad 2 is at y - 7.62 (or y + 7.62)
    # Set position to (66.00, 157.78), rot = 90:
    # Pad 1 at (66.00, 157.78), Pad 2 at (66.00, 150.16)
    fp_rpu = b.FindFootprintByReference('R_RL6_PU1')
    fp_rpu.SetPosition(pcbnew.VECTOR2I(int(66.00 * 1e6), int(157.78 * 1e6)))
    fp_rpu.SetOrientationDegrees(90.0)

    # 4. Clean up old tracks of +12V_BAT, +3.3V_ESP1, +3.3V_ESP2, /ESP1_CUT_ESP2, /TEMP_STA
    for t in list(b.GetTracks()):
        net = t.GetNetname()
        s, e = t.GetStart(), t.GetEnd()
        if net == '/+12V_BAT':
            b.Delete(t)
        elif net == '/+3.3V_ESP1':
            b.Delete(t)
        elif net == '/ESP1_CUT_ESP2':
            b.Delete(t)
        elif net == '/+3.3V_ESP2':
            if s.y < 85*1e6 or e.y < 85*1e6 or s.x > 90*1e6 or e.x > 90*1e6:
                b.Delete(t)
        elif net == '/TEMP_STA':
            b.Delete(t)

    # 5. Route +12V_BAT from J_BUS_LINK2 pin 2 (20.00, 20.08) to LM2596 #2 VIN+ pad 1 (88.00, 16.00):
    # Route on F.Cu jumper (or B.Cu):
    for p1, p2 in [((20.00, 20.08), (28.00, 20.08)),
                   ((28.00, 20.08), (28.00, 16.00)),
                   ((28.00, 16.00), (88.00, 16.00))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(1.5 * 1e6))
        seg.SetLayer(pcbnew.F_Cu)
        seg.SetNet(net_12v_bat)
        b.Add(seg)

    # 6. Route /ESP1_CUT_ESP2 from J_BUS_LINK2 pin 3 (20.00, 25.16) to J_RELAY_CTRL1 pad 7 (74.00, 155.24):
    # (20.00, 25.16) -> (14.00, 25.16) -> (14.00, 148.00) -> (60.00, 148.00) -> (60.00, 155.24) -> (74.00, 155.24)
    # And connects to R_RL6_PU1 pad 2 at (66.00, 150.16) via (60.00, 150.16) -> (66.00, 150.16)
    pts_cut = [
        ((20.00, 25.16), (14.00, 25.16)),
        ((14.00, 25.16), (14.00, 148.00)),
        ((14.00, 148.00), (60.00, 148.00)),
        ((60.00, 148.00), (60.00, 155.24)),
        ((60.00, 155.24), (74.00, 155.24)),
        ((60.00, 150.16), (66.00, 150.16))
    ]
    for p1, p2 in pts_cut:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.8 * 1e6))
        seg.SetLayer(pcbnew.B_Cu)
        seg.SetNet(net_cut)
        b.Add(seg)

    # 7. Route /+3.3V_ESP1 along LEFT EDGE to eliminate 70mm central jumper:
    # J_BUS_LINK2 pin 4 (20.00, 30.24) -> (16.00, 30.24) -> (16.00, 152.00) -> (58.00, 152.00) -> (58.00, 157.78) -> (74.00, 157.78)
    # Passes directly through R_RL6_PU1 pad 1 at (66.00, 157.78) into J_RELAY_CTRL1 pad 8 (74.00, 157.78)
    pts_3v3_esp1 = [
        ((20.00, 30.24), (16.00, 30.24)),
        ((16.00, 30.24), (16.00, 152.00)),
        ((16.00, 152.00), (58.00, 152.00)),
        ((58.00, 152.00), (58.00, 157.78)),
        ((58.00, 157.78), (74.00, 157.78))
    ]
    for p1, p2 in pts_3v3_esp1:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.6 * 1e6))
        seg.SetLayer(pcbnew.F_Cu)
        seg.SetNet(net_3v3_esp1)
        b.Add(seg)

    # 8. Route +3.3V_ESP2 ABOVE header pins (y = 71.00mm):
    # J_ESP2_L1 pad 1 (48.00, 74.00) -> (48.00, 71.00) -> (95.62, 71.00) -> (95.62, 106.00)
    # and to R_TEMP_STA1 pad 2 (93.62, 106.00), J_TEMP_STA1 pad 1 (98.00, 116.00), J_TEMP_TRK1 pad 1 (98.00, 78.00)
    pts_3v3_esp2 = [
        ((48.00, 74.00), (48.00, 71.00)),
        ((48.00, 71.00), (95.62, 71.00)),
        ((95.62, 71.00), (95.62, 106.00)),
        ((95.62, 78.00), (98.00, 78.00)),
        ((95.62, 106.00), (93.62, 106.00)),
        ((95.62, 106.00), (95.62, 116.00)),
        ((95.62, 116.00), (98.00, 116.00))
    ]
    for p1, p2 in pts_3v3_esp2:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.5 * 1e6))
        seg.SetLayer(pcbnew.F_Cu)
        seg.SetNet(net_3v3_esp2)
        b.Add(seg)

    # 9. Route /TEMP_STA cleanly:
    # J_ESP2_L1 pad 9 (48.00, 94.32) -> (60.00, 94.32) -> (60.00, 129.00) -> (77.00, 129.00) -> (77.00, 106.00) -> (86.00, 106.00) on F.Cu
    # and from (86.00, 106.00) to J_TEMP_STA1 pad 2 (98.00, 121.08) on B.Cu
    pts_temp = [
        ((48.00, 94.32), (60.00, 94.32)),
        ((60.00, 94.32), (60.00, 129.00)),
        ((60.00, 129.00), (77.00, 129.00)),
        ((77.00, 129.00), (77.00, 106.00)),
        ((77.00, 106.00), (86.00, 106.00))
    ]
    for p1, p2 in pts_temp:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.4 * 1e6))
        seg.SetLayer(pcbnew.F_Cu)
        seg.SetNet(net_temp_sta)
        b.Add(seg)

    for p1, p2 in [((86.00, 106.00), (92.00, 121.08)), ((92.00, 121.08), (98.00, 121.08))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.4 * 1e6))
        seg.SetLayer(pcbnew.B_Cu)
        seg.SetNet(net_temp_sta)
        b.Add(seg)

    filler = pcbnew.ZONE_FILLER(b)
    filler.Fill(b.Zones())
    b.Save(pcb_path)
    print("Board 2 fixes applied successfully.")

apply_fixes_board2()

