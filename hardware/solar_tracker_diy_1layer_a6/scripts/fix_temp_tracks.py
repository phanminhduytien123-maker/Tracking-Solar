import pcbnew

def fix_temp_tracks():
    pcb_path = r'd:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6\board2_sensor_relay\board2_sensor_relay.kicad_pcb'
    b = pcbnew.LoadBoard(pcb_path)
    
    net_temp = b.FindNet('/TEMP_STA')
    net_3v3 = b.FindNet('/+3.3V_ESP2')
    
    # 1. Delete all tracks of /TEMP_STA
    for t in list(b.GetTracks()):
        if t.GetNetname() == '/TEMP_STA':
            b.Delete(t)
            
    # 2. Delete tracks of /GND on F.Cu near x = 98
    for t in list(b.GetTracks()):
        if t.GetNetname() == '/GND' and t.GetLayerName() == 'F.Cu':
            s, e = t.GetStart(), t.GetEnd()
            if s.x > 90*1e6 or e.x > 90*1e6:
                b.Delete(t)

    # 3. Delete old /+3.3V_ESP2 tracks near x = 95-98, y > 80
    for t in list(b.GetTracks()):
        if t.GetNetname() == '/+3.3V_ESP2':
            s, e = t.GetStart(), t.GetEnd()
            if (s.x > 90*1e6 or e.x > 90*1e6) and (s.y > 80*1e6 or e.y > 80*1e6):
                b.Delete(t)
                
    # 4. Route /TEMP_STA:
    # J_ESP2_L1 pad 9 (48.00, 94.32) -> R_TEMP_STA1 pad 1 (86.00, 104.00) on F.Cu
    for p1, p2 in [((48.00, 94.32), (60.00, 94.32)), ((60.00, 94.32), (86.00, 104.00))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.4 * 1e6))
        seg.SetLayer(pcbnew.F_Cu)
        seg.SetNet(net_temp)
        b.Add(seg)
        
    # R_TEMP_STA1 pad 1 (86.00, 104.00) -> J_TEMP_STA1 pad 2 (98.00, 98.92) on B.Cu
    for p1, p2 in [((86.00, 104.00), (90.92, 98.92)), ((90.92, 98.92), (98.00, 98.92))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.4 * 1e6))
        seg.SetLayer(pcbnew.B_Cu)
        seg.SetNet(net_temp)
        b.Add(seg)

    # 5. Route /+3.3V_ESP2:
    # From (95.62, 78.00) down on F.Cu to (95.62, 104.00)
    # Then to R_TEMP_STA1 pad 2 (93.62, 104.00) and J_TEMP_STA1 pad 1 (98.00, 104.00)
    for p1, p2 in [((95.62, 78.00), (95.62, 104.00)),
                   ((95.62, 104.00), (93.62, 104.00)),
                   ((95.62, 104.00), (98.00, 104.00))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.5 * 1e6))
        seg.SetLayer(pcbnew.F_Cu)
        seg.SetNet(net_3v3)
        b.Add(seg)

    # 6. Delete any other dangling tracks on F.Cu or B.Cu
    # Clean up (93.0, 110.19) stub
    for t in list(b.GetTracks()):
        s, e = t.GetStart(), t.GetEnd()
        if abs(s.x - 93*1e6) < 1e6 and abs(s.y - 110.19*1e6) < 1e6:
            b.Delete(t)
        if abs(e.x - 93*1e6) < 1e6 and abs(e.y - 110.19*1e6) < 1e6:
            b.Delete(t)

    filler = pcbnew.ZONE_FILLER(b)
    filler.Fill(b.Zones())
    b.Save(pcb_path)
    print("Fixed temp tracks.")

fix_temp_tracks()

