import pcbnew
import subprocess
import os

pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
dsn_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.dsn"
ses_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.ses"
jar_path = r"d:\DOANTOTNGHIEP\hardware\freerouting.jar"

print("1. Loading board and exporting Specctra DSN...")
board = pcbnew.LoadBoard(pcb_path)
# Clear old tracks before routing
old_tracks = list(board.GetTracks())
for t in old_tracks:
    board.Remove(t)
board.Save(pcb_path)

res_dsn = pcbnew.ExportSpecctraDSN(board, dsn_path)
print(f"   Export DSN: {res_dsn}")

if os.path.exists(ses_path):
    os.remove(ses_path)

print("2. Running Freerouting auto-router engine...")
cmd = f'java -jar "{jar_path}" -de "{dsn_path}" -do "{ses_path}" -mp 25'
proc = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print("   Freerouting finished with code:", proc.returncode)

if not os.path.exists(ses_path):
    print("ERROR: SES file was not created!")
    print(proc.stderr)
    exit(1)

print("3. Importing routed SES session into PCB...")
board = pcbnew.LoadBoard(pcb_path)
res_ses = pcbnew.ImportSpecctraSES(board, ses_path)
print(f"   Import SES: {res_ses}")

tracks = [t for t in board.GetTracks() if not isinstance(t, pcbnew.PCB_VIA)]
vias = [t for t in board.GetTracks() if isinstance(t, pcbnew.PCB_VIA)]
print(f"   Total copper tracks: {len(tracks)}, Total vias: {len(vias)}")

board.Save(pcb_path)
print("SUCCESS: Auto-routing completed with Through-Hole Resistors!")

