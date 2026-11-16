import math

# Current component widths and necessary clearances:
# Let's see: Board Width = W
# Edge Cuts: [5 .. W-5] (or [0 .. W])
# Terminals Left: X = 7mm from edge. (pad center at X = 7)
# Resistors R_ENC: next to terminals or under/between ESP1.
# ESP1: width 25.4mm (pins at X_esp1, X_esp1 + 25.4)
# INA226: 21mm wide, 19mm high.
# LM2596 x2: 63.5mm long, 35mm wide.
# ACS712 x2 / FZ0430 x2: 13mm wide, 31/25mm high.
# ESP2: width 25.4mm
# Terminals Right: X = W - 7mm.

# Let's test if we keep LM2596 horizontally:
# Left margin to Left Terminals: 7 mm
# Left Terminals to ESP1: 15 mm
# ESP1 width: 25.4 mm
# ESP1 to INA226: 8 mm
# INA226 width: 21 mm
# INA226 to LM2596: can INA226 and LM2596 share X if they don't overlap in Y?
# In Y:
# Board height is 160mm (Y = 10 to 170).
# LM2596 #1 is at Y=78 (H=35, so Y=60.5 to 95.5).
# LM2596 #2 is at Y=120 (H=35, so Y=102.5 to 137.5).
# INA226 #1 is at Y=45 (H=19, so Y=35.5 to 54.5).
# INA226 #2 is at Y=80 (H=19, so Y=70.5 to 89.5) -> overlaps with LM2596 #1 in Y!
print("Analysis running...")

