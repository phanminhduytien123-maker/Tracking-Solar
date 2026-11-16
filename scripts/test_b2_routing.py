import pcbnew
import os

DIR_A6 = r"D:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6"
B2_FILE = os.path.join(DIR_A6, "board2_sensor_relay", "board2_sensor_relay.kicad_pcb")

def mm(v):
    return int(v * 1e6)

def add_track(board, net, x1, y1, x2, y2, lay, width=0.4):
    t = pcbnew.PCB_TRACK(board)
    t.SetNet(net)
    t.SetStart(pcbnew.VECTOR2I(mm(x1), mm(y1)))
    t.SetEnd(pcbnew.VECTOR2I(mm(x2), mm(y2)))
    t.SetWidth(mm(width))
    t.SetLayer(lay)
    board.Add(t)

b2 = pcbnew.LoadBoard(B2_FILE)

# Remove tracks of TEMP_STA, TEMP_TRK, RL_DRV_IN*
tracks_to_del = []
for t in b2.GetTracks():
    net = t.GetNetname()
    if net in ['/TEMP_STA', '/TEMP_TRK', '/RL_DRV_IN1', '/RL_DRV_IN2', '/RL_DRV_IN3', '/RL_DRV_IN4', '/RL_DRV_IN5']:
        tracks_to_del.append(t)

for t in tracks_to_del:
    b2.Remove(t)

net_temp_trk = b2.FindNet('/TEMP_TRK')
net_temp_sta = b2.FindNet('/TEMP_STA')
net_rl1 = b2.FindNet('/RL_DRV_IN1')
net_rl2 = b2.FindNet('/RL_DRV_IN2')
net_rl4 = b2.FindNet('/RL_DRV_IN4')
net_rl5 = b2.FindNet('/RL_DRV_IN5')

# 1. TEMP_TRK on B.Cu around top of ESP2:
add_track(b2, net_temp_trk, 98.0, 72.92, 88.0, 72.92, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_trk, 88.0, 72.92, 88.0, 78.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_trk, 88.0, 78.0, 88.0, 68.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_trk, 88.0, 68.0, 52.0, 68.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_trk, 52.0, 68.0, 52.0, 91.78, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_trk, 52.0, 91.78, 48.0, 91.78, pcbnew.B_Cu, 0.4)

# 2. TEMP_STA:
# J_TEMP_STA1 pin 2 (98, 115.08) -> R_TEMP_STA1 pad 1 (88, 104) on B.Cu
add_track(b2, net_temp_sta, 98.0, 115.08, 91.0, 115.08, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_sta, 91.0, 115.08, 91.0, 104.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_sta, 91.0, 104.0, 88.0, 104.0, pcbnew.B_Cu, 0.4)
# From (88, 104) to ESP2 J1 pin 9 (48, 94.32) on B.Cu around bottom of ESP2 (y=135):
add_track(b2, net_temp_sta, 88.0, 104.0, 88.0, 100.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_sta, 88.0, 100.0, 70.0, 100.0, pcbnew.B_Cu, 0.4) # between pins 10 & 11 of ESP2 right header!
# Wait, ESP2 right header pin 11 is at y=99.4, pin 12 is at y=101.94. y=100.67 is right in the middle!
add_track(b2, net_temp_sta, 70.0, 100.0, 54.0, 100.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_sta, 54.0, 100.0, 54.0, 94.32, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_sta, 54.0, 94.32, 48.0, 94.32, pcbnew.B_Cu, 0.4)

# 3. ULN2003A outputs to J_RELAY_CTRL1 via F.Cu straight parallel lines:
add_track(b2, net_rl1, 88.62, 114.00, 74.0, 142.54, pcbnew.F_Cu, 0.5)
add_track(b2, net_rl2, 88.62, 116.54, 74.0, 145.08, pcbnew.F_Cu, 0.5)
add_track(b2, net_rl4, 88.62, 119.08, 74.0, 150.16, pcbnew.F_Cu, 0.5)
add_track(b2, net_rl5, 88.62, 121.62, 74.0, 152.70, pcbnew.F_Cu, 0.5)

pcbnew.SaveBoard(B2_FILE, b2)
print("Board 2 saved successfully.")

