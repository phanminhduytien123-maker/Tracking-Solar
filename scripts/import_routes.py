import pcbnew

pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
ses_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.ses"

print("[1] Loading board...")
board = pcbnew.LoadBoard(pcb_path)

print("[2] Importing SES file...")
success = pcbnew.ImportSpecctraSES(board, ses_path)
print(f"    SES import success: {success}")

tracks = board.GetTracks()
print(f"    Total tracks and vias now on board: {len(tracks)}")

print("[3] Saving board...")
board.Save(pcb_path)
print(f"[V] Successfully saved routed board to {pcb_path}!")

