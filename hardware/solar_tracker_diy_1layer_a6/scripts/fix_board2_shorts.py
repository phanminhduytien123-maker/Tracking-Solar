import pcbnew

def fix_shorts():
    pcb_path = r'd:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6\board2_sensor_relay\board2_sensor_relay.kicad_pcb'
    b = pcbnew.LoadBoard(pcb_path)
    print("Fixing /TEMP_STA routing...")

    net_temp = b.FindNet('/TEMP_STA')

    # 1. Delete all existing tracks of /TEMP_STA
    for t in list(b.GetTracks()):
        if t.GetNetname() == '/TEMP_STA':
            b.Delete(t)

    # 2. Route /TEMP_STA cleanly:
    # J_ESP2_L1 pad 9 is at (48.00, 94.32)
    # Go down between headers to (60.00, 129.00) on F.Cu
    # Across to (77.00, 129.00) on F.Cu (dead center between ESP2 at 73.4 and ULN at 81.0)
    # Up to (77.00, 104.00) on F.Cu
    # Directly into R_TEMP_STA1 pad 1 at (86.00, 104.00) on F.Cu!
    pts_temp = [
        ((48.00, 94.32), (60.00, 94.32)),
        ((60.00, 94.32), (60.00, 129.00)),
        ((60.00, 129.00), (77.00, 129.00)),
        ((77.00, 129.00), (77.00, 104.00)),
        ((77.00, 104.00), (86.00, 104.00))
    ]
    for p1, p2 in pts_temp:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.4 * 1e6))
        seg.SetLayer(pcbnew.F_Cu)
        seg.SetNet(net_temp)
        b.Add(seg)

    # Connect R_TEMP_STA1 pad 1 (86.00, 104.00) to J_TEMP_STA1 pad 2 (98.00, 98.92) on B.Cu
    for p1, p2 in [((86.00, 104.00), (92.00, 98.92)), ((92.00, 98.92), (98.00, 98.92))]:
        seg = pcbnew.PCB_TRACK(b)
        seg.SetStart(pcbnew.VECTOR2I(int(p1[0]*1e6), int(p1[1]*1e6)))
        seg.SetEnd(pcbnew.VECTOR2I(int(p2[0]*1e6), int(p2[1]*1e6)))
        seg.SetWidth(int(0.4 * 1e6))
        seg.SetLayer(pcbnew.B_Cu)
        seg.SetNet(net_temp)
        b.Add(seg)

    filler = pcbnew.ZONE_FILLER(b)
    filler.Fill(b.Zones())
    b.Save(pcb_path)
    print("TEMP_STA routing completed.")

fix_shorts()
