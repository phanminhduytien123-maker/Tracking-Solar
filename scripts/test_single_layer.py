import subprocess
import re

dsn_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer\board2_sensor_relay\board2_sensor_relay.dsn"
with open(dsn_path, "r", encoding="utf-8") as f:
    dsn = f.read()

# Replace layer definitions: remove F.Cu, keep only B.Cu
dsn_1layer = re.sub(r'\(layer\s+F\.Cu[\s\S]*?\(property[\s\S]*?\)\s*\)', '', dsn)
dsn_1layer = re.sub(r'\(index\s+1\)', '(index 0)', dsn_1layer)
dsn_1layer = re.sub(r'\(shape\s+\([^\)]+\s+F\.Cu\s+[^\)]+\)\)', '', dsn_1layer)
dsn_1layer = re.sub(r'\(keepout\s+""\s+\(polygon\s+F\.Cu[\s\S]*?\)\)', '', dsn_1layer)

dsn_test = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer\board2_sensor_relay\test_1layer.dsn"
ses_test = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer\board2_sensor_relay\test_1layer.ses"
with open(dsn_test, "w", encoding="utf-8") as f:
    f.write(dsn_1layer)

cmd = ["java", "-jar", r"d:\DOANTOTNGHIEP\hardware\freerouting.jar", "-de", dsn_test, "-do", ses_test, "-mp", "50"]
res = subprocess.run(cmd, capture_output=True, text=True)
print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
print("Code:", res.returncode)

