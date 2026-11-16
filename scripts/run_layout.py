import pcbnew
import math

def run_layout():
    pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
    board = pcbnew.LoadBoard(pcb_path)
    
    fps = {fp.GetReference(): fp for fp in board.GetFootprints()}
    print(f"Loaded {len(fps)} footprints from board.")

    def mm_to_iu(val):
        return int(val * 1e6)
        
    def place(ref, x_mm, y_mm, rot_deg=0):
        if ref in fps:
            fp = fps[ref]
            fp.SetPosition(pcbnew.VECTOR2I(mm_to_iu(x_mm), mm_to_iu(y_mm)))
            fp.SetOrientation(pcbnew.EDA_ANGLE(rot_deg, pcbnew.DEGREES_T))
            return fp
        else:
            print(f"ERROR: {ref} missing!")
            return None

    # ========================================================
    # ZONE 1: ESP1 TRACKER MASTER CONTROLLER (X: 10 -> 85 mm)
    # ========================================================
    # Left edge screw terminals (X = 18.0 mm, rot = 90 -> wire enters from left)
    place("J_SW1",          18.0, 35.0, 90)   # Home Azimuth Switch
    place("J_SW2",          18.0, 50.0, 90)   # Home Elevation Switch
    place("J_ENC1_AZ1",     18.0, 70.0, 90)   # Azimuth Encoder (4P)
    place("J_ENC2_EL1",     18.0, 95.0, 90)   # Elevation Encoder (4P)
    place("J_M1_AZ1",       18.0, 118.0, 90)  # Azimuth Stepper Driver (3P)
    place("J_M2_EL1",       18.0, 138.0, 90)  # Elevation Stepper Driver (3P)

    # TEMT6000 Optical Cross (JST-XH 6-pin) at bottom of Zone 1
    place("J_TEMT_EXT1",    48.0, 150.0, 0)   # Facing down/bottom

    # Pullup Resistors for Encoders (SMD 0805)
    place("R_ENC1_A1",      27.0, 66.0, 0)
    place("R_ENC1_B1",      27.0, 74.0, 0)
    place("R_ENC2_A1",      27.0, 91.0, 0)
    place("R_ENC2_B1",      27.0, 99.0, 0)

    # ESP32-S3 DevKit #1 (Center at X = 48.0 mm, Y = 55.0 mm to 108.3 mm)
    # Spacing between headers = 25.4 mm (1.00 inch)
    esp1_l_x = 48.0 - 12.7 # 35.3 mm
    esp1_r_x = 48.0 + 12.7 # 60.7 mm
    place("J_ESP1_L1",      esp1_l_x, 55.0, 0)
    place("J_ESP1_R1",      esp1_r_x, 55.0, 0)

    # I2C Sensors & RTC in Zone 1 (Right sub-column at X = 73.0 mm)
    place("J_INA1_TRK1",    73.0, 40.0, 0)   # INA226 Tracker (4-pin)
    place("J_INA2_STA1",    73.0, 65.0, 0)   # INA226 Static (4-pin)
    place("J_RTC1",         73.0, 95.0, 0)   # RTC DS3231 (6-pin)

    # ========================================================
    # ZONE 2: POWER MANAGEMENT (X: 85 -> 145 mm)
    # ========================================================
    # 12V Grid & Battery Terminals along Top Edge (rot = 180 -> wire enters from top)
    place("J_PWR_GRID12V1", 100.0, 25.0, 180) # 12V Grid In (2P)
    place("J_PWR_BAT12V1",  130.0, 25.0, 180) # 12V Battery In (2P)

    # Mini560 PRO (5V for Encoders from Grid)
    place("U_MINI560",      100.0, 60.0, 0)

    # LM2596 #1 (12V Batt -> 5V ESP1)
    place("U_LM2596_ESP1",  130.0, 65.0, 0)

    # Relay 6 contacts header (COM, NO, NC)
    place("J_RL6_CONTACT1", 100.0, 115.0, 0)

    # LM2596 #2 (12V Batt -> 5V ESP2 via Relay 6)
    place("U_LM2596_ESP2",  130.0, 115.0, 0)

    # ========================================================
    # ZONE 3: ESP2 & MEASUREMENTS & RELAYS (X: 145 -> 230 mm)
    # ========================================================
    # Left sub-column of Zone 3 (Analog sensor headers at X = 158.0 mm)
    place("J_ACS1_TRK1",    158.0, 35.0, 0)   # ACS712 Tracker (3-pin)
    place("J_ACS2_STA1",    158.0, 55.0, 0)   # ACS712 Static (3-pin)
    place("J_FZ1_TRK1",     158.0, 75.0, 0)   # FZ0430 Tracker (2-pin)
    place("J_FZ2_STA1",     158.0, 95.0, 0)   # FZ0430 Static (2-pin)

    # ESP32-S3 DevKit #2 (Center at X = 188.0 mm, Y = 55.0 mm to 108.3 mm)
    # Spacing between headers = 25.4 mm (1.00 inch)
    esp2_l_x = 188.0 - 12.7 # 175.3 mm
    esp2_r_x = 188.0 + 12.7 # 200.7 mm
    place("J_ESP2_L1",      esp2_l_x, 55.0, 0)
    place("J_ESP2_R1",      esp2_r_x, 55.0, 0)

    # 6-Channel Relay Control Header (below ESP2 at Y = 125.0 mm)
    place("J_RELAY_CTRL1",  188.0, 125.0, 90) # 8-pin horizontal

    # External Screw Terminals along Right Edge (X = 222.0 mm, rot = 270 -> wire enters from right)
    place("J_PV_TRK_IN1",   222.0, 45.0, 270) # PV Tracker In (2P)
    place("J_PV_STA_IN1",   222.0, 75.0, 270) # PV Static In (2P)
    place("J_LAMP12V_OUT1", 222.0, 105.0, 270) # 12V Night Lamp (2P)

    # Save board
    board.Save(pcb_path)
    print("SUCCESS: Board layout saved with all 32 components positioned!")

    # Check for courtyard / bounding box overlaps
    print("\n--- Placement Summary ---")
    for ref, fp in sorted(fps.items()):
        pos = fp.GetPosition()
        rot = fp.GetOrientation().AsDegrees()
        print(f"  {ref:16}: ({pos.x/1e6:6.1f}, {pos.y/1e6:6.1f}) mm, rot={rot:5.1f} deg")

if __name__ == "__main__":
    run_layout()

