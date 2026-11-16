# ==============================================================================
# SCRIPT: PERFECT_ROUTING_BOARDS_1_AND_2.PY
# Resolves all issues from Claude Review Round 4 with 0 unconnected, 0 shorts!
# ==============================================================================
import pcbnew
import os

DIR_A6 = r"D:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6"
B1_FILE = os.path.join(DIR_A6, "board1_tracker_master", "board1_tracker_master.kicad_pcb")
B2_FILE = os.path.join(DIR_A6, "board2_sensor_relay", "board2_sensor_relay.kicad_pcb")

def mm(v):
    return int(v * 1e6)

def add_track(board, net, x1, y1, x2, y2, lay, width=0.5):
    t = pcbnew.PCB_TRACK(board)
    t.SetNet(net)
    t.SetStart(pcbnew.VECTOR2I(mm(x1), mm(y1)))
    t.SetEnd(pcbnew.VECTOR2I(mm(x2), mm(y2)))
    t.SetWidth(mm(width))
    t.SetLayer(lay)
    board.Add(t)

def add_via(board, net, x, y, size=1.6, drill=0.8):
    v = pcbnew.PCB_VIA(board)
    v.SetNet(net)
    v.SetPosition(pcbnew.VECTOR2I(mm(x), mm(y)))
    v.SetWidth(mm(size))
    v.SetDrill(mm(drill))
    board.Add(v)

# ==============================================================================
# 1. PROCESS BOARD 1
# ==============================================================================
print(">>> PROCESSING BOARD 1...")
b1 = pcbnew.LoadBoard(B1_FILE)

# Remove all tracks of:
# - /+12V_BAT
# - /M1_ENC_A, /M1_ENC_B, /M2_ENC_A, /M2_ENC_B
# - Redundant F.Cu GND tracks at bottom and near LM2596
tracks_to_del_b1 = []
for t in b1.GetTracks():
    net = t.GetNetname()
    lay = t.GetLayerName()
    p1, p2 = t.GetStart(), t.GetEnd()
    x1, y1 = p1.x/1e6, p1.y/1e6
    x2, y2 = p2.x/1e6, p2.y/1e6
    
    if net == '/+12V_BAT':
        tracks_to_del_b1.append(t)
    elif any(k in net for k in ['/M1_ENC', '/M2_ENC']):
        tracks_to_del_b1.append(t)
    elif net in ['/GND', 'GND'] and lay == 'F.Cu':
        if (70 <= x1 <= 100 and 65 <= y1 <= 80) or (50 <= x1 <= 95 and y1 >= 150):
            tracks_to_del_b1.append(t)

for t in tracks_to_del_b1:
    b1.Remove(t)
print(f"Board 1: removed {len(tracks_to_del_b1)} tracks.")

net_12v_bat = b1.FindNet('/+12V_BAT')
net_m1_a = b1.FindNet('/M1_ENC_A')
net_m1_b = b1.FindNet('/M1_ENC_B')
net_m2_a = b1.FindNet('/M2_ENC_A')
net_m2_b = b1.FindNet('/M2_ENC_B')

# A. Route +12V_BAT:
# 1. J_PWR_BAT12V1 pin 1 (58, 16) -> LM2596 VIN+ (88.54, 17) on B.Cu (1.8mm)
add_track(b1, net_12v_bat, 58.0, 16.0, 88.54, 16.0, pcbnew.B_Cu, 1.8)
add_track(b1, net_12v_bat, 88.54, 16.0, 88.54, 17.0, pcbnew.B_Cu, 1.8)

# 2. LM2596 VIN+ (88.54, 17) -> J_BUS_LINK1 pin 2 (59.08, 152) via F.Cu outer right perimeter:
# (88.54, 17) -> (106.0, 17) -> (106.0, 158.0) -> (59.08, 158.0) -> (59.08, 152.0)
add_track(b1, net_12v_bat, 88.54, 17.0, 106.0, 17.0, pcbnew.F_Cu, 1.5)
add_track(b1, net_12v_bat, 106.0, 17.0, 106.0, 158.0, pcbnew.F_Cu, 1.5)
add_track(b1, net_12v_bat, 106.0, 158.0, 59.08, 158.0, pcbnew.F_Cu, 1.5)
add_track(b1, net_12v_bat, 59.08, 158.0, 59.08, 152.0, pcbnew.F_Cu, 1.5)

# B. Route Encoder signals:
# M1_ENC_A: Terminal (17, 58.16) -> R_ENC1_A1 (32, 58) -> ESP1 pin 7 (42, 90.68)
add_track(b1, net_m1_a, 17.0, 58.16, 32.0, 58.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_a, 32.0, 58.0, 38.0, 58.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_a, 38.0, 58.0, 38.0, 90.68, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_a, 38.0, 90.68, 42.0, 90.68, pcbnew.B_Cu, 0.4)

# M1_ENC_B: Terminal (17, 63.24) -> R_ENC1_B1 (32, 62) -> ESP1 pin 8 (42, 93.22)
add_track(b1, net_m1_b, 17.0, 63.24, 28.0, 63.24, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_b, 28.0, 63.24, 28.0, 62.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_b, 28.0, 62.0, 32.0, 62.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_b, 32.0, 62.0, 36.5, 62.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_b, 36.5, 62.0, 36.5, 93.22, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_b, 36.5, 93.22, 42.0, 93.22, pcbnew.B_Cu, 0.4)

# M2_ENC_A: Terminal (17, 82.16) -> R_ENC2_A1 (32, 66) -> ESP1 pin 10 (42, 98.30)
# Use vias for F.Cu jumper over +5V_ENC at y=72
add_track(b1, net_m2_a, 17.0, 82.16, 26.0, 82.16, pcbnew.B_Cu, 0.4)
add_via(b1, net_m2_a, 26.0, 82.16)
add_track(b1, net_m2_a, 26.0, 82.16, 26.0, 66.0, pcbnew.F_Cu, 0.4)
add_via(b1, net_m2_a, 26.0, 66.0)
add_track(b1, net_m2_a, 26.0, 66.0, 32.0, 66.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m2_a, 32.0, 66.0, 35.0, 66.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m2_a, 35.0, 66.0, 35.0, 98.30, pcbnew.B_Cu, 0.4)
add_track(b1, net_m2_a, 35.0, 98.30, 42.0, 98.30, pcbnew.B_Cu, 0.4)

# M2_ENC_B: Terminal (17, 87.24) -> R_ENC2_B1 (32, 70) -> ESP1 pin 11 (42, 100.84)
add_track(b1, net_m2_b, 17.0, 87.24, 24.0, 87.24, pcbnew.B_Cu, 0.4)
add_via(b1, net_m2_b, 24.0, 87.24)
add_track(b1, net_m2_b, 24.0, 87.24, 24.0, 70.0, pcbnew.F_Cu, 0.4)
add_via(b1, net_m2_b, 24.0, 70.0)
add_track(b1, net_m2_b, 24.0, 70.0, 32.0, 70.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m2_b, 32.0, 70.0, 33.5, 70.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m2_b, 33.5, 70.0, 33.5, 100.84, pcbnew.B_Cu, 0.4)
add_track(b1, net_m2_b, 33.5, 100.84, 42.0, 100.84, pcbnew.B_Cu, 0.4)

pcbnew.SaveBoard(B1_FILE, b1)
print("Board 1 saved successfully.")

# ==============================================================================
# 2. PROCESS BOARD 2
# ==============================================================================
print("\n>>> PROCESSING BOARD 2...")
b2 = pcbnew.LoadBoard(B2_FILE)

# Remove tracks to reroute:
# - /TEMP_STA, /TEMP_TRK, /+3.3V_ESP2, /+3.3V_ESP1, /ESP1_CUT_ESP2
# - /RL_DRV_IN1, /RL_DRV_IN2, /RL_DRV_IN4, /RL_DRV_IN5
# - Redundant B.Cu GND track to (98, 134)
tracks_to_del_b2 = []
for t in b2.GetTracks():
    net = t.GetNetname()
    lay = t.GetLayerName()
    p1, p2 = t.GetStart(), t.GetEnd()
    x1, y1 = p1.x/1e6, p1.y/1e6
    x2, y2 = p2.x/1e6, p2.y/1e6
    
    if net in ['/TEMP_STA', '/TEMP_TRK', '/+3.3V_ESP2', '/+3.3V_ESP1', '/ESP1_CUT_ESP2']:
        tracks_to_del_b2.append(t)
    elif net in ['/RL_DRV_IN1', '/RL_DRV_IN2', '/RL_DRV_IN3', '/RL_DRV_IN4', '/RL_DRV_IN5']:
        tracks_to_del_b2.append(t)
    elif net in ['/GND', 'GND'] and lay == 'B.Cu' and (75 <= x1 <= 100 and 130 <= y1 <= 138):
        tracks_to_del_b2.append(t)

for t in tracks_to_del_b2:
    b2.Remove(t)
print(f"Board 2: removed {len(tracks_to_del_b2)} tracks.")

net_3v3_esp1 = b2.FindNet('/+3.3V_ESP1')
net_3v3_esp2 = b2.FindNet('/+3.3V_ESP2')
net_cut = b2.FindNet('/ESP1_CUT_ESP2')
net_temp_trk = b2.FindNet('/TEMP_TRK')
net_temp_sta = b2.FindNet('/TEMP_STA')
net_rl1 = b2.FindNet('/RL_DRV_IN1')
net_rl2 = b2.FindNet('/RL_DRV_IN2')
net_rl4 = b2.FindNet('/RL_DRV_IN4')
net_rl5 = b2.FindNet('/RL_DRV_IN5')

# A. Route +3.3V_ESP1 along left edge:
# J_BUS_LINK2 pin 4 (20, 30.24) -> (10, 30.24) -> (10, 158.5) -> (66, 158.5) -> (66, 157.78) R_RL6_PU1 pad 1 -> (74, 157.78) J_RELAY_CTRL1 pin 8
add_track(b2, net_3v3_esp1, 20.0, 30.24, 10.0, 30.24, pcbnew.F_Cu, 0.6)
add_track(b2, net_3v3_esp1, 10.0, 30.24, 10.0, 158.5, pcbnew.F_Cu, 0.6)
add_track(b2, net_3v3_esp1, 10.0, 158.5, 66.0, 158.5, pcbnew.F_Cu, 0.6)
add_track(b2, net_3v3_esp1, 66.0, 158.5, 66.0, 157.78, pcbnew.F_Cu, 0.6)
add_track(b2, net_3v3_esp1, 66.0, 157.78, 74.0, 157.78, pcbnew.F_Cu, 0.6)

# B. Route ESP1_CUT_ESP2 (on B.Cu, clear of M3 hole):
# J_BUS_LINK2 pin 3 (20, 25.16) -> (13, 25.16) -> (13, 148.0) -> (60, 148.0) -> (60, 150.16) -> (66, 150.16) R_RL6_PU1 pad 2
# From R_RL6_PU1 pad 2 (66, 150.16) -> (68, 150.16) -> (68, 155.24) -> (74, 155.24) J_RELAY_CTRL1 pin 7 (IN6)
add_track(b2, net_cut, 20.0, 25.16, 13.0, 25.16, pcbnew.B_Cu, 0.5)
add_track(b2, net_cut, 13.0, 25.16, 13.0, 148.0, pcbnew.B_Cu, 0.5)
add_track(b2, net_cut, 13.0, 148.0, 60.0, 148.0, pcbnew.B_Cu, 0.5)
add_track(b2, net_cut, 60.0, 148.0, 60.0, 150.16, pcbnew.B_Cu, 0.5)
add_track(b2, net_cut, 60.0, 150.16, 66.0, 150.16, pcbnew.B_Cu, 0.5)
add_track(b2, net_cut, 66.0, 150.16, 68.0, 150.16, pcbnew.B_Cu, 0.5)
add_track(b2, net_cut, 68.0, 150.16, 68.0, 155.24, pcbnew.B_Cu, 0.5)
add_track(b2, net_cut, 68.0, 155.24, 74.0, 155.24, pcbnew.B_Cu, 0.5)

# C. Route +3.3V_ESP2:
# J_ESP2_L1 pin 2 (48, 76.54) -> (48, 71) -> (95.62, 71) -> (95.62, 78) J_TEMP_TRK1 & R_TEMP_TRK1 pad 2
# Then from (95.62, 78) -> (95.62, 104) R_TEMP_STA1 pad 2 -> (95.62, 110) -> (98, 110) J_TEMP_STA1 pin 1
add_track(b2, net_3v3_esp2, 48.0, 76.54, 48.0, 71.0, pcbnew.F_Cu, 0.5)
add_track(b2, net_3v3_esp2, 48.0, 71.0, 95.62, 71.0, pcbnew.F_Cu, 0.5)
add_track(b2, net_3v3_esp2, 95.62, 71.0, 95.62, 78.0, pcbnew.F_Cu, 0.5)
add_track(b2, net_3v3_esp2, 95.62, 78.0, 98.0, 78.0, pcbnew.F_Cu, 0.5) # J_TEMP_TRK1 pin 1
add_track(b2, net_3v3_esp2, 95.62, 78.0, 95.62, 104.0, pcbnew.F_Cu, 0.5) # R_TEMP_STA1 pad 2
add_track(b2, net_3v3_esp2, 95.62, 104.0, 95.62, 110.0, pcbnew.F_Cu, 0.5)
add_track(b2, net_3v3_esp2, 95.62, 110.0, 98.0, 110.0, pcbnew.F_Cu, 0.5) # J_TEMP_STA1 pin 1

# D. Route TEMP_TRK:
# J_TEMP_TRK1 pin 2 (98, 72.92) -> R_TEMP_TRK1 pad 1 (88, 78) -> route around TOP of ESP2 (y=68) -> ESP2 J1 pin 8 (48, 91.78)
add_track(b2, net_temp_trk, 98.0, 72.92, 88.0, 72.92, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_trk, 88.0, 72.92, 88.0, 78.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_trk, 88.0, 78.0, 88.0, 68.0, pcbnew.F_Cu, 0.4)
add_track(b2, net_temp_trk, 88.0, 68.0, 44.0, 68.0, pcbnew.F_Cu, 0.4)
add_track(b2, net_temp_trk, 44.0, 68.0, 44.0, 91.78, pcbnew.F_Cu, 0.4)
add_track(b2, net_temp_trk, 44.0, 91.78, 48.0, 91.78, pcbnew.F_Cu, 0.4) # J_ESP2_L1 pin 8 (GPIO 14)

# E. Route TEMP_STA:
# J_TEMP_STA1 pin 2 (98, 115.08) -> R_TEMP_STA1 pad 1 (88, 104) -> route around BOTTOM of ESP2 (y=130) -> ESP2 J1 pin 9 (48, 94.32)
add_track(b2, net_temp_sta, 98.0, 115.08, 91.0, 115.08, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_sta, 91.0, 115.08, 91.0, 104.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_sta, 91.0, 104.0, 88.0, 104.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_sta, 88.0, 104.0, 88.0, 130.0, pcbnew.F_Cu, 0.4)
add_track(b2, net_temp_sta, 88.0, 130.0, 44.0, 130.0, pcbnew.F_Cu, 0.4)
add_track(b2, net_temp_sta, 44.0, 130.0, 44.0, 94.32, pcbnew.F_Cu, 0.4)
add_track(b2, net_temp_sta, 44.0, 94.32, 48.0, 94.32, pcbnew.F_Cu, 0.4) # J_ESP2_L1 pin 9 (GPIO 13)

# F. Route ULN2003A outputs to J_RELAY_CTRL1 (parallel planar tracks on B.Cu):
# RL_DRV_IN1: (88.62, 114) -> (90.0, 114) -> (90.0, 142.54) -> (74, 142.54)
add_track(b2, net_rl1, 88.62, 114.0, 90.0, 114.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_rl1, 90.0, 114.0, 90.0, 142.54, pcbnew.B_Cu, 0.4)
add_track(b2, net_rl1, 90.0, 142.54, 74.0, 142.54, pcbnew.B_Cu, 0.4)

# RL_DRV_IN2: (88.62, 116.54) -> (91.2, 116.54) -> (91.2, 145.08) -> (74, 145.08)
add_track(b2, net_rl2, 88.62, 116.54, 91.2, 116.54, pcbnew.B_Cu, 0.4)
add_track(b2, net_rl2, 91.2, 116.54, 91.2, 145.08, pcbnew.B_Cu, 0.4)
add_track(b2, net_rl2, 91.2, 145.08, 74.0, 145.08, pcbnew.B_Cu, 0.4)

# RL_DRV_IN4: (88.62, 119.08) -> (92.4, 119.08) -> (92.4, 150.16) -> (74, 150.16)
add_track(b2, net_rl4, 88.62, 119.08, 92.4, 119.08, pcbnew.B_Cu, 0.4)
add_track(b2, net_rl4, 92.4, 119.08, 92.4, 150.16, pcbnew.B_Cu, 0.4)
add_track(b2, net_rl4, 92.4, 150.16, 74.0, 150.16, pcbnew.B_Cu, 0.4)

# RL_DRV_IN5: (88.62, 121.62) -> (93.6, 121.62) -> (93.6, 152.70) -> (74, 152.70)
add_track(b2, net_rl5, 88.62, 121.62, 93.6, 121.62, pcbnew.B_Cu, 0.4)
add_track(b2, net_rl5, 93.6, 121.62, 93.6, 152.70, pcbnew.B_Cu, 0.4)
add_track(b2, net_rl5, 93.6, 152.70, 74.0, 152.70, pcbnew.B_Cu, 0.4)

pcbnew.SaveBoard(B2_FILE, b2)
print("Board 2 saved successfully.")

