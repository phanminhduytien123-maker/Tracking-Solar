import re

with open('hardware/solar_tracker_diy_1layer_a6/board2_sensor_relay/board2_sensor_relay.kicad_pcb', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Remove the old GND track on B.Cu that touched (20.0, 30.0)
# (segment (start 32 34.54) (end 24.54 34.54) ... (net "/GND"))
# (segment (start 24.54 34.54) (end 20 30) ... (net "/GND"))
# We can find and remove segments of net "/GND" that start or end at (20 30) or (24.54 34.54)

# 2. Fix +12V_BAT:
# Connect U_LM2596_ESP2 pad 1 at (32.0, 29.46) to (28.0, 29.46) and (28.0, 20.08)

# 3. Fix +3.3V_ESP2:
# Connect (48.0, 74.0) to (48.0, 76.54)

# 4. Fix +3.3V_ESP1:
# Remove old segments:
# (16, 30.24) -> (16, 152)
# (16, 152) -> (58, 152)
# (58, 152) -> (58, 157.78)
# Replace with:
# (20, 30.24) -> (10, 30.24)
# (10, 30.24) -> (10, 158.5)
# (10, 158.5) -> (58, 158.5)
# (58, 158.5) -> (58, 157.78)

# Let's inspect all segments of +3.3V_ESP1, +12V_BAT, and GND near (20, 30)
print("Parsing segments...")
lines = c.splitlines(keepends=True)
new_lines = []
skip = False
curr_seg = []

i = 0
while i < len(lines):
    line = lines[i]
    if line.strip().startswith('(segment'):
        seg_lines = [line]
        i += 1
        while i < len(lines) and not lines[i].strip().startswith(')'):
            seg_lines.append(lines[i])
            i += 1
        if i < len(lines):
            seg_lines.append(lines[i]) # add ')'
            i += 1
        seg_text = "".join(seg_lines)
        
        # Check if we should drop this segment
        drop = False
        # Drop leftover GND track touching (20 30) or (24.54 34.54)
        if '"/GND"' in seg_text and ('20 30' in seg_text or '24.54 34.54' in seg_text):
            drop = True
            print("Dropped leftover GND track")
        # Drop old +3.3V_ESP1 tracks
        if '"/+3.3V_ESP1"' in seg_text:
            drop = True
            print("Dropped old +3.3V_ESP1 track")
            
        if not drop:
            new_lines.extend(seg_lines)
    else:
        new_lines.append(line)
        i += 1

content_updated = "".join(new_lines)

# Now append the clean new segments before the final closing parenthesis
new_segments = """
	(segment
		(start 20 30.24)
		(end 10 30.24)
		(width 0.6)
		(layer "F.Cu")
		(net "/+3.3V_ESP1")
		(uuid "b1e00001-33e1-4000-8000-000000000001")
	)
	(segment
		(start 10 30.24)
		(end 10 158.5)
		(width 0.6)
		(layer "F.Cu")
		(net "/+3.3V_ESP1")
		(uuid "b1e00001-33e1-4000-8000-000000000002")
	)
	(segment
		(start 10 158.5)
		(end 58 158.5)
		(width 0.6)
		(layer "F.Cu")
		(net "/+3.3V_ESP1")
		(uuid "b1e00001-33e1-4000-8000-000000000003")
	)
	(segment
		(start 58 158.5)
		(end 58 157.78)
		(width 0.6)
		(layer "F.Cu")
		(net "/+3.3V_ESP1")
		(uuid "b1e00001-33e1-4000-8000-000000000004")
	)
	(segment
		(start 58 157.78)
		(end 74 157.78)
		(width 0.6)
		(layer "F.Cu")
		(net "/+3.3V_ESP1")
		(uuid "b1e00001-33e1-4000-8000-000000000005")
	)
	(segment
		(start 48 74)
		(end 48 76.54)
		(width 0.5)
		(layer "F.Cu")
		(net "/+3.3V_ESP2")
		(uuid "b2e00002-33e2-4000-8000-000000000001")
	)
	(segment
		(start 28 20.08)
		(end 28 29.46)
		(width 1.5)
		(layer "F.Cu")
		(net "/+12V_BAT")
		(uuid "b3e00003-12e3-4000-8000-000000000001")
	)
	(segment
		(start 28 29.46)
		(end 32 29.46)
		(width 1.5)
		(layer "F.Cu")
		(net "/+12V_BAT")
		(uuid "b3e00003-12e3-4000-8000-000000000002")
	)
"""

last_paren = content_updated.rfind(')')
if last_paren != -1:
    final_content = content_updated[:last_paren] + new_segments + content_updated[last_paren:]
    with open('hardware/solar_tracker_diy_1layer_a6/board2_sensor_relay/board2_sensor_relay.kicad_pcb', 'w', encoding='utf-8') as f:
        f.write(final_content)
    print("Successfully updated board2_sensor_relay.kicad_pcb!")
else:
    print("Error: Could not find closing parenthesis!")

