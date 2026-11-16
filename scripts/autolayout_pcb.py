import pcbnew

def autolayout():
    pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
    board = pcbnew.LoadBoard(pcb_path)
    
    fps = {fp.GetReference(): fp for fp in board.GetFootprints()}
    print(f"Total footprints on board: {len(fps)}")
    if len(fps) == 0:
        print("No footprints found on board! Please place them and save first.")
        return
        
    def mm_to_iu(val):
        return int(val * 1e6)
        
    def place(ref, x_mm, y_mm, rot_deg=0):
        if ref in fps:
            fp = fps[ref]
            fp.SetPosition(pcbnew.VECTOR2I(mm_to_iu(x_mm), mm_to_iu(y_mm)))
            fp.SetOrientation(pcbnew.EDA_ANGLE(rot_deg, pcbnew.DEGREES_T))
            print(f"Placed {ref:16} at ({x_mm:.1f}, {y_mm:.1f}) rot={rot_deg}")
        else:
            print(f"WARNING: {ref} not found on board!")

    # ==========================================
    # ZONE 1: ESP1 TRACKER MASTER (X: 10 -> 85 mm)
    # ==========================================
    # Screw Terminals along Left Edge (X = 18 mm, facing out)
    # Pitch between terminals ~ 12-15mm
    place("J_SW1",          18.0, 30.0, 90)   # Limit Switch 1 (Home Azimuth)
    place("J_SW2",          18.0, 45.0, 90)   # Limit Switch 2 (Home Elevation)
    place("J_ENC1_AZ1",     18.0, 65.0, 90)   # Azimuth Encoder (4-pin)
    place("J_ENC2_EL1",     18.0, 90.0, 90)   # Elevation Encoder (4-pin)
    place("J_M1_AZ1",       18.0, 115.0, 90)  # Azimuth DM556 (3-pin)
    place("J_M2_EL1",       18.0, 135.0, 90)  # Elevation DM556 (3-pin)
    place("J_TEMT_EXT1",    18.0, 152.0, 90)  # TEMT6000 Cross (6-pin JST)

    # Pullup Resistors for Encoders near terminal blocks
    place("R_ENC1_A1",      28.0, 60.0, 0)
    place("R_ENC1_B1",      28.0, 70.0, 0)
    place("R_ENC2_A1",      28.0, 85.0, 0)
    place("R_ENC2_B1",      28.0, 95.0, 0)

    # ESP32-S3 DevKit #1 Sockets (Center of Zone 1, X = 48 mm)
    # Standard ESP32-S3 DevKit row spacing is 25.4 mm (1.0 inch)
    # Left header: X = 35.3 mm, Right header: X = 60.7 mm (spacing = 25.4mm)
    esp1_center_x = 48.0
    esp1_half_w = 12.7 # 25.4 / 2
    place("J_ESP1_L1",      esp1_center_x - esp1_half_w, 75.0, 0)
    place("J_ESP1_R1",      esp1_center_x + esp1_half_w, 75.0, 0)

    # Sensors in Zone 1 (INA226 x2, RTC DS3231)
    place("J_INA1_TRK1",    73.0, 35.0, 90)   # INA226 Tracker
    place("J_INA2_STA1",    73.0, 60.0, 90)   # INA226 Static
    place("J_RTC1",         73.0, 95.0, 90)   # RTC DS3231 6-pin socket

    # ==========================================
    # ZONE 2: POWER MANAGEMENT (X: 85 -> 145 mm)
    # ==========================================
    # Power Input Terminals (Top Edge: Y = 25 mm)
    place("J_PWR_GRID12V1", 100.0, 25.0, 180) # 12V Grid In (KF301-2P)
    place("J_PWR_BAT12V1",  130.0, 25.0, 180) # 12V Battery In (KF301-2P)

    # Mini560 PRO (5V for Encoders from Grid)
    place("U_MINI560",      100.0, 55.0, 0)

    # LM2596 #1 (12V Batt -> 5V ESP1)
    place("U_LM2596_ESP1",  130.0, 70.0, 0)

    # LM2596 #2 (12V Batt -> 5V ESP2 via Relay 6)
    place("U_LM2596_ESP2",  130.0, 115.0, 0)

    # Relay 6 contact header (COM, NO, NC)
    place("J_RL6_CONTACT1", 100.0, 140.0, 0)

    # ==========================================
    # ZONE 3: ESP2 & MEASUREMENTS & RELAYS (X: 145 -> 230 mm)
    # ==========================================
    # ESP32-S3 DevKit #2 Sockets (Center of Zone 3, X = 175 mm)
    esp2_center_x = 175.0
    esp2_half_w = 12.7
    place("J_ESP2_L1",      esp2_center_x - esp2_half_w, 75.0, 0)
    place("J_ESP2_R1",      esp2_center_x + esp2_half_w, 75.0, 0)

    # 6-Channel Relay Control Header
    place("J_RELAY_CTRL1",  175.0, 130.0, 0)

    # Sensors (ACS712 x2, FZ0430 x2)
    place("J_ACS1_TRK1",    155.0, 30.0, 0)   # ACS712 Tracker
    place("J_ACS2_STA1",    155.0, 50.0, 0)   # ACS712 Static
    place("J_FZ1_TRK1",     195.0, 30.0, 0)   # FZ0430 Tracker
    place("J_FZ2_STA1",     195.0, 50.0, 0)   # FZ0430 Static

    # External Screw Terminals along Right Edge (X = 222 mm, facing out)
    place("J_PV_TRK_IN1",   222.0, 35.0, 270) # PV Tracker In (KF301-2P)
    place("J_PV_STA_IN1",   222.0, 60.0, 270) # PV Static In (KF301-2P)
    place("J_LAMP12V_OUT1", 222.0, 85.0, 270) # 12V Night Lamp (KF301-2P)

    board.Save(pcb_path)
    print("Auto-layout completed and saved to:", pcb_path)

if __name__ == "__main__":
    autolayout()

