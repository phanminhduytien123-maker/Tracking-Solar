import pcbnew
import os

def fix_board2():
    pcb_path = r'd:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6\board2_sensor_relay\board2_sensor_relay.kicad_pcb'
    b = pcbnew.LoadBoard(pcb_path)
    print("=== RE-ROUTING BOARD 2 WITH PRECISION ===")

    net_5v_pre = b.FindNet('/+5V_ESP2_PRE')
    net_5v_esp2 = b.FindNet('/+5V_ESP2')
    net_cut = b.FindNet('/ESP1_CUT_ESP2')
    net_gnd = b.FindNet('/GND')
    net_3v3_esp1 = b.FindNet('/+3.3V_ESP1')
    net_raw_voc = b.FindNet('/RAW_VOC_STA')
    net_temp_sta = b.FindNet('/TEMP_STA')
    net_3v3_esp2 = b.FindNet('/+3.3V_ESP2')
    
    net_in1 = b.FindNet('/RL_DRV_IN1')
    net_in2 = b.FindNet('/RL_DRV_IN2')
    net_in4 = b.FindNet('/RL_DRV_IN4')
    net_in5 = b.FindNet('/RL_DRV_IN5')
    net_cut_38 = b.FindNet('/RL_CUT_38')
    net_b_isc = b.FindNet('/RL_B_ISC')
    net_d_isc = b.FindNet('/RL_D_ISC')
    net_e_lamp = b.FindNet('/RL_E_LAMP')

    # 1. Update J_RELAY_PWR pins:
    # Pad 1: +5V_ESP2_PRE (100.0, 28.0)
    # Pad 2: +5V_ESP2_PRE (100.0, 33.08)
    # Pad 3: +5V_ESP2     (100.0, 38.16)
    fp_pwr = b.FindFootprintByReference('J_RELAY_PWR')
    for p in fp_pwr.Pads():
        if p.GetNumber() == '1':
            p.SetNet(net_5v_pre)
        elif p.GetNumber() == '2':
            p.SetNet(net_5v_pre)
        elif p.GetNumber() == '3':
            p.SetNet(net_5v_esp2)

    # 2. Update ULN2003A (U_ULN1):
    # Shift right to x = 81.00 (from 76.00)
    fp_uln = b.FindFootprintByReference('U_ULN1')
    fp_uln.SetPosition(pcbnew.VECTOR2I(int(81.00 * 1e6), int(114.00 * 1e6)))
    fp_uln.SetOrientationDegrees(0.0)

    # Pin 9 (COM) must be UNCONNECTED (No Net)
    net_empty = b.FindNet('')
    for p in fp_uln.Pads():
        if p.GetNumber() == '9':
            p.SetNet(net_empty)

    # Place R_TEMP_STA1 horizontally above ULN:
    # x = 86.00, y = 104.00, rot = 0
    # Pad 1 at (82.19, 104.00) net /TEMP_STA
    # Pad 2 at (89.81, 104.00) net /+3.3V_ESP2
    fp_rtemp = b.FindFootprintByReference('R_TEMP_STA1')
    fp_rtemp.SetPosition(pcbnew.VECTOR2I(int(86.00 * 1e6), int(104.00 * 1e6)))
    fp_rtemp.SetOrientationDegrees(0.0)

    # Place J_TEMP_STA1 at (98.00, 104.00)
    fp_jtemp = b.FindFootprintByReference('J_TEMP_STA1')
    fp_jtemp.SetPosition(pcbnew.VECTOR2I(int(98.00 * 1e6), int(104.00 * 1e6)))

    # Update J_RELAY_CTRL1 pad 4 to Unconnected
    fp_rc = b.FindFootprintByReference('J_RELAY_CTRL1')
    for p in fp_rc.Pads():
        if p.GetNumber() == '4':
            p.SetNet(net_empty)

    # 3. Clean up tracks of:
    # /+5V_ESP2_PRE near J_RELAY_PWR and ULN pin 9
    # /+5V_ESP2 near J_RELAY_PWR
    # /ESP1_CUT_ESP2 near bottom
    # /RAW_VOC_STA
    # ULN input and output tracks
    # R_TEMP_STA1 and J_TEMP_STA1 tracks
    for t in list(b.GetTracks()):
        netname = t.GetNetname()
        s, e = t.GetStart(), t.GetEnd()
        if netname == '/+5V_ESP2_PRE':
            if s.y > 25*1e6 and e.y > 25*1e6:
                b.Delete(t)
        elif netname == '/+5V_ESP2':
            if s.x > 90*1e6 and s.y < 45*1e6:
                b.Delete(t)
        elif netname == '/ESP1_CUT_ESP2':
            b.Delete(t)
        elif netname == '/RAW_VOC_STA':
            b.Delete(t)
        elif netname in ['/RL_DRV_IN1', '/RL_DRV_IN2', '/RL_DRV_IN4', '/RL_DRV_IN5',
                         '/RL_CUT_38', '/RL_B_ISC', '/RL_D_ISC', '/RL_E_LAMP',
                         '/TEMP_STA']:
            b.Delete(t)
        elif netname == '/+3.3V_ESP2':
            if s.x > 90*1e6 and s.y > 90*1e6:
                b.Delete(t)

    # 4. Route J_RELAY_PWR:
    # From LM2596 #2 VOUT+ (88.00, 29.46) to J_RELAY_PWR pad 1 (100.00, 28.00) on B.Cu (1.8mm)
    for p1, p2 in [((88.00, 29.46), (96.00, 29.46)), ((96.00, 29.46), (100.00, 28.00))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(1.8 * 1e6))
        seg.SetLayer(pcbnew.B_Cu)
        seg.SetNet(net_5v_pre)
        b.Add(seg)
    # Join Pad 1 and Pad 2 (100.00, 28.00) -> (100.00, 33.08) on B.Cu (1.8mm)
    seg = pcbnew.PCB_TRACK(b)
    seg.SetStart(pcbnew.VECTOR2I(int(100.00*1e6), int(28.00*1e6)))
    seg.SetEnd(pcbnew.VECTOR2I(int(100.00*1e6), int(33.08*1e6)))
    seg.SetWidth(int(1.8 * 1e6))
    seg.SetLayer(pcbnew.B_Cu)
    seg.SetNet(net_5v_pre)
    b.Add(seg)

    # Route Pad 3 (+5V_ESP2) from (100.00, 38.16) down to power rail at (60.95, 41.70)
    for p1, p2 in [((100.00, 38.16), (98.91, 41.70)), ((98.91, 41.70), (60.95, 41.70))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(1.5 * 1e6))
        seg.SetLayer(pcbnew.B_Cu)
        seg.SetNet(net_5v_esp2)
        b.Add(seg)

    # 5. Route /ESP1_CUT_ESP2 safely away from M3 hole (15.00, 157.00):
    pts_cut = [
        ((20.00, 19.84), (14.00, 19.84)),
        ((14.00, 19.84), (14.00, 148.00)),
        ((14.00, 148.00), (67.62, 148.00)),
        ((67.62, 148.00), (67.62, 150.00)),
        ((67.62, 148.00), (74.00, 154.38)),
        ((74.00, 154.38), (74.00, 155.24))
    ]
    for p1, p2 in pts_cut:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.8 * 1e6))
        seg.SetLayer(pcbnew.B_Cu)
        seg.SetNet(net_cut)
        b.Add(seg)

    # 6. Route /RAW_VOC_STA on F.Cu (top jumper):
    for p1, p2 in [((24.54, 151.50), (24.54, 144.00)), ((24.54, 144.00), (33.00, 138.00))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.5 * 1e6))
        seg.SetLayer(pcbnew.F_Cu)
        seg.SetNet(net_raw_voc)
        b.Add(seg)

    # 7. Connect R_TEMP_STA1 and J_TEMP_STA1:
    # J_TEMP_STA1 is at (98.00, 104.00):
    # Pad 1 (+3.3V_ESP2) at (98.00, 104.00)
    # Pad 2 (/TEMP_STA) at (98.00, 98.92)
    # Pad 3 (/GND) at (98.00, 93.84)
    # R_TEMP_STA1 is at (86.00, 104.00), rot 0:
    # Pad 1 (/TEMP_STA) at (82.19, 104.00)
    # Pad 2 (/+3.3V_ESP2) at (89.81, 104.00)
    
    # Route /TEMP_STA from J_ESP2_L1 pad 9 (48.00, 94.32) across on F.Cu to (82.19, 104.00)
    for p1, p2 in [((48.00, 94.32), (60.00, 94.32)), ((60.00, 94.32), (82.19, 104.00))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.4 * 1e6))
        seg.SetLayer(pcbnew.F_Cu)
        seg.SetNet(net_temp_sta)
        b.Add(seg)
    # Connect R_TEMP_STA1 pad 1 (82.19, 104.00) to J_TEMP_STA1 pad 2 (98.00, 98.92) on B.Cu
    for p1, p2 in [((82.19, 104.00), (92.00, 98.92)), ((92.00, 98.92), (98.00, 98.92))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.4 * 1e6))
        seg.SetLayer(pcbnew.B_Cu)
        seg.SetNet(net_temp_sta)
        b.Add(seg)

    # Connect +3.3V_ESP2 from (95.62, 78.00) down on F.Cu to R_TEMP_STA1 pad 2 (89.81, 104.00)
    # and to J_TEMP_STA1 pad 1 (98.00, 104.00)
    for p1, p2 in [((95.62, 78.00), (95.62, 104.00)),
                   ((95.62, 104.00), (89.81, 104.00)),
                   ((95.62, 104.00), (98.00, 104.00))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.5 * 1e6))
        seg.SetLayer(pcbnew.F_Cu)
        seg.SetNet(net_3v3_esp2)
        b.Add(seg)

    # 8. Route ULN2003A (U_ULN1 at 81.00, 114.00):
    # Left inputs from ESP2 header (73.40, y) on B.Cu (0.5mm)
    for ypos, net_in in [(114.00, net_cut_38), (116.54, net_b_isc), (119.08, net_d_isc), (121.62, net_e_lamp)]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(81.00 * 1e6), int(ypos * 1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(73.40 * 1e6), int(ypos * 1e6)))
        seg.SetWidth(int(0.5 * 1e6))
        seg.SetLayer(pcbnew.B_Cu)
        seg.SetNet(net_in)
        b.Add(seg)

    # Right outputs escaping right into clear corridor (x in [90, 93]) then down on B.Cu
    # Pin 16: /RL_DRV_IN1 at (88.62, 114.00) -> J_RELAY_CTRL1 pad 2 (74.00, 142.54)
    # Pin 15: /RL_DRV_IN2 at (88.62, 116.54) -> J_RELAY_CTRL1 pad 3 (74.00, 145.08)
    # Pin 14: /RL_DRV_IN4 at (88.62, 119.08) -> J_RELAY_CTRL1 pad 5 (74.00, 150.16)
    # Pin 13: /RL_DRV_IN5 at (88.62, 121.62) -> J_RELAY_CTRL1 pad 6 (74.00, 152.70)
    out_routes = [
        ((88.62, 114.00), (93.50, 114.00), (93.50, 136.00), (74.00, 142.54), net_in1),
        ((88.62, 116.54), (92.00, 116.54), (92.00, 138.00), (74.00, 145.08), net_in2),
        ((88.62, 119.08), (90.50, 119.08), (90.50, 140.00), (74.00, 150.16), net_in4),
        ((88.62, 121.62), (89.50, 121.62), (89.50, 142.00), (74.00, 152.70), net_in5),
    ]
    for p_pin, p_esc, p_down, p_end, net_out in out_routes:
        for p1, p2 in [(p_pin, p_esc), (p_esc, p_down), (p_down, p_end)]:
            seg = pcbnew.PCB_TRACK(b)
            seg.SetStart(pcbnew.VECTOR2I(int(p1[0] * 1e6), int(p1[1] * 1e6)))
            seg.SetEnd(pcbnew.VECTOR2I(int(p2[0] * 1e6), int(p2[1] * 1e6)))
            seg.SetWidth(int(0.5 * 1e6))
            seg.SetLayer(pcbnew.B_Cu)
            seg.SetNet(net_out)
            b.Add(seg)

    # 9. Update Antenna Keepout Zone:
    # Set to x in [50.00, 71.40], y in [58.00, 73.50]
    for z in b.Zones():
        if z.GetIsRuleArea():
            poly = pcbnew.SHAPE_LINE_CHAIN()
            poly.Append(int(50.00 * 1e6), int(58.00 * 1e6))
            poly.Append(int(71.40 * 1e6), int(58.00 * 1e6))
            poly.Append(int(71.40 * 1e6), int(73.50 * 1e6))
            poly.Append(int(50.00 * 1e6), int(73.50 * 1e6))
            poly.SetClosed(True)
            z.Outline().RemoveAllContours()
            z.AddPolygon(poly)

    # Refill zones and save
    filler = pcbnew.ZONE_FILLER(b)
    filler.Fill(b.Zones())
    b.Save(pcb_path)
    print("Board 2 re-routed cleanly and saved.")

fix_board2()
