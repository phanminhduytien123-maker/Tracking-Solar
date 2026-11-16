import pcbnew
import traceback

try:
    pcb_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.kicad_pcb"
    b = pcbnew.LoadBoard(pcb_path)
    net_gnd = b.FindNet("/GND")
    print("Found GND net:", net_gnd.GetNetname())
    
    z = pcbnew.ZONE(b)
    z.SetNet(net_gnd)
    z.SetLayer(pcbnew.F_Cu)
    
    # Check outline methods
    ol = z.Outline()
    print("Outline type:", type(ol))
    print("Outline methods:", [m for m in dir(ol) if 'Append' in m or 'Add' in m or 'Outline' in m])
except Exception as e:
    traceback.print_exc()

