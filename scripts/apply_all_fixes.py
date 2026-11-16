# ==============================================================================
# SCRIPT TO APPLY ALL FIXES FOR CLAUDE REVIEW ROUND 4 (BOARDS 1 & 2)
# ==============================================================================
import pcbnew
import os

DIR_A6 = r"D:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer_a6"
B1_FILE = os.path.join(DIR_A6, "board1_tracker_master", "board1_tracker_master.kicad_pcb")
B2_FILE = os.path.join(DIR_A6, "board2_sensor_relay", "board2_sensor_relay.kicad_pcb")

def mm(v):
    return int(v * 1e6)

# ------------------------------------------------------------------------------
# 1. FIX BOARD 1
# ------------------------------------------------------------------------------
print(">>> PROCESSING BOARD 1...")
b1 = pcbnew.LoadBoard(B1_FILE)

# Remove problematic tracks on Board 1:
# - Any track of net /+12V_BAT
# - Dangling F.Cu GND track near LM2596 (96.35, 78.08) -> (89.34, 71.07)
# - Crossing encoder tracks on B.Cu
# - Crossing GND tracks on B.Cu near LM2596 VIN-
tracks_to_remove = []
for t in b1.GetTracks():
    net = t.GetNetname()
    lay = t.GetLayerName()
    p1 = t.GetStart()
    p2 = t.GetEnd()
    x1, y1 = p1.x / 1e6, p1.y / 1e6
    x2, y2 = p2.x / 1e6, p2.y / 1e6
    
    # 1. Remove +12V_BAT tracks to reroute cleanly
    if net == '/+12V_BAT':
        tracks_to_remove.append(t)
    # 2. Remove dangling F.Cu GND track brushing LM2596 VOUT+
    elif net in ['/GND', 'GND'] and lay == 'F.Cu' and (70 <= x1 <= 100) and (65 <= y1 <= 80):
        tracks_to_remove.append(t)
    # 3. Remove crossing encoder tracks to reroute in clean planar order
    elif any(k in net for k in ['/M1_ENC', '/M2_ENC']):
        tracks_to_remove.append(t)
    # 4. Remove redundant B.Cu GND track crossing +12V_BAT near (82.4, 18.0)
    elif net in ['/GND', 'GND'] and lay == 'B.Cu' and (50 <= x1 <= 90) and (14 <= y1 <= 20):
        tracks_to_remove.append(t)

for t in tracks_to_remove:
    b1.Remove(t)
print(f"Removed {len(tracks_to_remove)} old/conflicting tracks from Board 1.")

# Get nets for Board 1
net_12v_bat = b1.FindNet('/+12V_BAT')
net_m1_a = b1.FindNet('/M1_ENC_A')
net_m1_b = b1.FindNet('/M1_ENC_B')
net_m2_a = b1.FindNet('/M2_ENC_A')
net_m2_b = b1.FindNet('/M2_ENC_B')

def add_track(board, net, x1, y1, x2, y2, lay, width=0.5):
    t = pcbnew.PCB_TRACK(board)
    t.SetNet(net)
    t.SetStart(pcbnew.VECTOR2I(mm(x1), mm(y1)))
    t.SetEnd(pcbnew.VECTOR2I(mm(x2), mm(y2)))
    t.SetWidth(mm(width))
    t.SetLayer(lay)
    board.Add(t)

# A. Route +12V_BAT:
# 1. J_PWR_BAT12V1 pin 1 (58.0, 16.0) -> (88.54, 16.0) -> (88.54, 17.0) LM2596 VIN+ on B.Cu (1.8mm width)
add_track(b1, net_12v_bat, 58.0, 16.0, 88.54, 16.0, pcbnew.B_Cu, 1.8)
add_track(b1, net_12v_bat, 88.54, 16.0, 88.54, 17.0, pcbnew.B_Cu, 1.8)

# 2. LM2596 VIN+ (88.54, 17.0) -> Bus Link 1 pin 2 (59.08, 152.0) via F.Cu outer right perimeter (>38mm from antenna)
add_track(b1, net_12v_bat, 88.54, 17.0, 106.0, 17.0, pcbnew.F_Cu, 1.5)
add_track(b1, net_12v_bat, 106.0, 17.0, 106.0, 147.0, pcbnew.F_Cu, 1.5)
add_track(b1, net_12v_bat, 106.0, 147.0, 59.08, 147.0, pcbnew.F_Cu, 1.5)
add_track(b1, net_12v_bat, 59.08, 147.0, 59.08, 152.0, pcbnew.F_Cu, 1.5)

# B. Route Encoder signals cleanly in planar order (NO CROSSINGS):
# 1. M1_ENC_A: Terminal (17.0, 58.16) -> R_ENC1_A1 (32.0, 58.0) -> ESP1 pin 7 (42.0, 90.68)
add_track(b1, net_m1_a, 17.0, 58.16, 32.0, 58.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_a, 32.0, 58.0, 38.0, 58.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_a, 38.0, 58.0, 38.0, 90.68, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_a, 38.0, 90.68, 42.0, 90.68, pcbnew.B_Cu, 0.4)

# 2. M1_ENC_B: Terminal (17.0, 63.24) -> R_ENC1_B1 (32.0, 62.0) -> ESP1 pin 8 (42.0, 93.22)
add_track(b1, net_m1_b, 17.0, 63.24, 28.0, 63.24, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_b, 28.0, 63.24, 28.0, 62.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_b, 28.0, 62.0, 32.0, 62.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_b, 32.0, 62.0, 36.5, 62.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_b, 36.5, 62.0, 36.5, 93.22, pcbnew.B_Cu, 0.4)
add_track(b1, net_m1_b, 36.5, 93.22, 42.0, 93.22, pcbnew.B_Cu, 0.4)

# 3. M2_ENC_A: Terminal (17.0, 82.16) -> R_ENC2_A1 (32.0, 66.0) -> ESP1 pin 10 (42.0, 98.30)
# Terminal to resistor via F.Cu jumper (since +5V_ENC crosses at y=72)
add_track(b1, net_m2_a, 17.0, 82.16, 26.0, 82.16, pcbnew.B_Cu, 0.4)
add_track(b1, net_m2_a, 26.0, 82.16, 26.0, 66.0, pcbnew.F_Cu, 0.4) # jumper over +5V_ENC
add_track(b1, net_m2_a, 26.0, 66.0, 32.0, 66.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m2_a, 32.0, 66.0, 35.0, 66.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m2_a, 35.0, 66.0, 35.0, 98.30, pcbnew.B_Cu, 0.4)
add_track(b1, net_m2_a, 35.0, 98.30, 42.0, 98.30, pcbnew.B_Cu, 0.4)

# 4. M2_ENC_B: Terminal (17.0, 87.24) -> R_ENC2_B1 (32.0, 70.0) -> ESP1 pin 11 (42.0, 100.84)
add_track(b1, net_m2_b, 17.0, 87.24, 24.0, 87.24, pcbnew.B_Cu, 0.4)
add_track(b1, net_m2_b, 24.0, 87.24, 24.0, 70.0, pcbnew.F_Cu, 0.4) # jumper over +5V_ENC
add_track(b1, net_m2_b, 24.0, 70.0, 32.0, 70.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m2_b, 32.0, 70.0, 33.5, 70.0, pcbnew.B_Cu, 0.4)
add_track(b1, net_m2_b, 33.5, 70.0, 33.5, 100.84, pcbnew.B_Cu, 0.4)
add_track(b1, net_m2_b, 33.5, 100.84, 42.0, 100.84, pcbnew.B_Cu, 0.4)

# Save Board 1
pcbnew.SaveBoard(B1_FILE, b1)
print("Board 1 saved successfully.")

# ------------------------------------------------------------------------------
# 2. FIX BOARD 2
# ------------------------------------------------------------------------------
print("\n>>> PROCESSING BOARD 2...")
b2 = pcbnew.LoadBoard(B2_FILE)

# Fix Footprint positions:
# 1. J_TEMP_STA1: move from (98.0, 116.0) to (98.0, 110.0) rot=-90
fp_temp_sta = b2.FindFootprintByReference('J_TEMP_STA1')
if fp_temp_sta:
    fp_temp_sta.SetPosition(pcbnew.VECTOR2I(mm(98.0), mm(110.0)))
    fp_temp_sta.SetOrientationDegrees(-90)
    print("Repositioned J_TEMP_STA1 to (98.0, 110.0) rot=-90")

# 2. R_TEMP_STA1: move to (88.0, 104.0)
fp_r_temp_sta = b2.FindFootprintByReference('R_TEMP_STA1')
if fp_r_temp_sta:
    fp_r_temp_sta.SetPosition(pcbnew.VECTOR2I(mm(88.0), mm(104.0)))
    fp_r_temp_sta.SetOrientationDegrees(0)
    print("Repositioned R_TEMP_STA1 to (88.0, 104.0)")

# Remove conflicting tracks in Board 2:
tracks_to_remove_b2 = []
for t in b2.GetTracks():
    net = t.GetNetname()
    lay = t.GetLayerName()
    p1 = t.GetStart()
    p2 = t.GetEnd()
    x1, y1 = p1.x / 1e6, p1.y / 1e6
    x2, y2 = p2.x / 1e6, p2.y / 1e6
    
    # Remove old TEMP_STA tracks to reroute cleanly to new pos (98, 110)
    if net in ['/TEMP_STA', '/TEMP_TRK', '/+3.3V_ESP2', '/+3.3V_ESP1', '/ESP1_CUT_ESP2']:
        tracks_to_remove_b2.append(t)
    elif net in ['/RL_DRV_IN1', '/RL_DRV_IN2', '/RL_DRV_IN3', '/RL_DRV_IN4', '/RL_DRV_IN5']:
        # check if crossing
        if lay == 'B.Cu' and (85 <= x1 <= 95) and (110 <= y1 <= 145):
            tracks_to_remove_b2.append(t)

for t in tracks_to_remove_b2:
    b2.Remove(t)
print(f"Removed {len(tracks_to_remove_b2)} conflicting tracks from Board 2.")

# Get nets for Board 2
net_3v3_esp1 = b2.FindNet('/+3.3V_ESP1')
net_3v3_esp2 = b2.FindNet('/+3.3V_ESP2')
net_cut = b2.FindNet('/ESP1_CUT_ESP2')
net_temp_trk = b2.FindNet('/TEMP_TRK')
net_temp_sta = b2.FindNet('/TEMP_STA')
net_rl1 = b2.FindNet('/RL_DRV_IN1')
net_rl2 = b2.FindNet('/RL_DRV_IN2')
net_rl4 = b2.FindNet('/RL_DRV_IN4')
net_rl5 = b2.FindNet('/RL_DRV_IN5')
net_gnd = b2.FindNet('/GND')

# A. Route +3.3V_ESP1 along left edge (x=10.0mm):
# J_BUS_LINK2 pin 4 (20.0, 30.24) -> (10.0, 30.24) -> (10.0, 158.5) -> (58.0, 158.5) -> (58.0, 157.78) -> (74.0, 157.78) R_RL6_PU1 pad 1 & Relay VCC pin 7
add_track(b2, net_3v3_esp1, 20.0, 30.24, 10.0, 30.24, pcbnew.F_Cu, 0.6)
add_track(b2, net_3v3_esp1, 10.0, 30.24, 10.0, 158.5, pcbnew.F_Cu, 0.6)
add_track(b2, net_3v3_esp1, 10.0, 158.5, 58.0, 158.5, pcbnew.F_Cu, 0.6)
add_track(b2, net_3v3_esp1, 58.0, 158.5, 58.0, 157.78, pcbnew.F_Cu, 0.6)
add_track(b2, net_3v3_esp1, 58.0, 157.78, 66.0, 157.78, pcbnew.F_Cu, 0.6) # R_RL6_PU1 pad 1
add_track(b2, net_3v3_esp1, 66.0, 157.78, 74.0, 157.78, pcbnew.F_Cu, 0.6) # J_RELAY_CTRL1 pin 7 (VCC)

# B. Route ESP1_CUT_ESP2 (on B.Cu, clear of M3 hole):
# J_BUS_LINK2 pin 3 (20.0, 25.16) -> (13.0, 25.16) -> (13.0, 148.0) -> (60.0, 148.0) -> (60.0, 150.16) -> (66.0, 150.16) R_RL6_PU1 pad 2 & Relay IN6 pin 8
add_track(b2, net_cut, 20.0, 25.16, 13.0, 25.16, pcbnew.B_Cu, 0.5)
add_track(b2, net_cut, 13.0, 25.16, 13.0, 148.0, pcbnew.B_Cu, 0.5)
add_track(b2, net_cut, 13.0, 148.0, 60.0, 148.0, pcbnew.B_Cu, 0.5)
add_track(b2, net_cut, 60.0, 148.0, 60.0, 150.16, pcbnew.B_Cu, 0.5)
add_track(b2, net_cut, 60.0, 150.16, 66.0, 150.16, pcbnew.B_Cu, 0.5) # R_RL6_PU1 pad 2
add_track(b2, net_cut, 66.0, 150.16, 74.0, 150.16, pcbnew.B_Cu, 0.5) # J_RELAY_CTRL1 pin 8 (IN6)

# C. Route +3.3V_ESP2:
# From J_ESP2_L1 pin 2 (48.0, 76.54) -> (48.0, 71.0) -> (95.0, 71.0) -> (95.0, 78.0) J_TEMP_TRK1 & (95.0, 104.0) J_TEMP_STA1
add_track(b2, net_3v3_esp2, 48.0, 76.54, 48.0, 71.0, pcbnew.F_Cu, 0.5)
add_track(b2, net_3v3_esp2, 48.0, 71.0, 95.0, 71.0, pcbnew.F_Cu, 0.5) # passes >3mm ABOVE header pins!
add_track(b2, net_3v3_esp2, 95.0, 71.0, 95.0, 78.0, pcbnew.F_Cu, 0.5)
add_track(b2, net_3v3_esp2, 95.0, 78.0, 98.0, 78.0, pcbnew.F_Cu, 0.5) # J_TEMP_TRK1 pin 1
add_track(b2, net_3v3_esp2, 95.0, 78.0, 95.0, 104.92, pcbnew.F_Cu, 0.5)
add_track(b2, net_3v3_esp2, 95.0, 104.92, 98.0, 104.92, pcbnew.F_Cu, 0.5) # J_TEMP_STA1 pin 1 (3V3)
add_track(b2, net_3v3_esp2, 95.0, 104.92, 91.81, 104.0, pcbnew.F_Cu, 0.5) # R_TEMP_STA1 pad 2

# D. Route TEMP_TRK:
# J_TEMP_TRK1 pin 2 (98.0, 72.92) -> R_TEMP_TRK1 pad 1 (95.62, 78.0) -> ESP2 J1 pin 10 (48.0, 96.86)
add_track(b2, net_temp_trk, 98.0, 72.92, 95.62, 72.92, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_trk, 95.62, 72.92, 95.62, 78.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_trk, 95.62, 78.0, 80.0, 78.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_trk, 80.0, 78.0, 80.0, 96.86, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_trk, 80.0, 96.86, 48.0, 96.86, pcbnew.B_Cu, 0.4) # ESP2 J1 pin 10 (GPIO 14)

# E. Route TEMP_STA:
# J_TEMP_STA1 pin 2 (98.0, 110.0) -> R_TEMP_STA1 pad 1 (84.19, 104.0) -> ESP2 J1 pin 9 (48.0, 94.32)
add_track(b2, net_temp_sta, 98.0, 110.0, 88.0, 110.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_sta, 88.0, 110.0, 88.0, 104.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_sta, 88.0, 104.0, 84.19, 104.0, pcbnew.B_Cu, 0.4)
add_track(b2, net_temp_sta, 84.19, 104.0, 82.0, 104.0, pcbnew.F_Cu, 0.4)
add_track(b2, net_temp_sta, 82.0, 104.0, 82.0, 94.32, pcbnew.F_Cu, 0.4)
add_track(b2, net_temp_sta, 82.0, 94.32, 48.0, 94.32, pcbnew.F_Cu, 0.4) # ESP2 J1 pin 9 (GPIO 13)

# F. Route Relay driver outputs from ULN2003A to J_RELAY_CTRL1 (parallel planar tracks on B.Cu):
# ULN2003A (rot=-90) at (89.5, 128.0):
# OUT1 (pin 16) at (86.0, 114.0) -> J_RELAY_CTRL1 pin 1 at (74.0, 114.0)
add_track(b2, net_rl1, 86.0, 114.0, 74.0, 114.0, pcbnew.B_Cu, 0.5)

# OUT2 (pin 15) at (86.0, 116.54) -> J_RELAY_CTRL1 pin 2 at (74.0, 116.54)
add_track(b2, net_rl2, 86.0, 116.54, 74.0, 116.54, pcbnew.B_Cu, 0.5)

# OUT3 (pin 14) at (86.0, 119.08) -> J_RELAY_CTRL1 pin 4 (Relay 4) at (74.0, 121.62)
add_track(b2, net_rl4, 86.0, 119.08, 80.0, 119.08, pcbnew.B_Cu, 0.5)
add_track(b2, net_rl4, 80.0, 119.08, 80.0, 121.62, pcbnew.B_Cu, 0.5)
add_track(b2, net_rl4, 80.0, 121.62, 74.0, 121.62, pcbnew.B_Cu, 0.5)

# OUT4 (pin 13) at (86.0, 121.62) -> J_RELAY_CTRL1 pin 5 (Relay 5) at (74.0, 124.16)
add_track(b2, net_rl5, 86.0, 121.62, 78.0, 121.62, pcbnew.B_Cu, 0.5)
add_track(b2, net_rl5, 78.0, 121.62, 78.0, 124.16, pcbnew.B_Cu, 0.5)
add_track(b2, net_rl5, 78.0, 124.16, 74.0, 124.16, pcbnew.B_Cu, 0.5)

# Save Board 2
pcbnew.SaveBoard(B2_FILE, b2)
print("Board 2 saved successfully.")

