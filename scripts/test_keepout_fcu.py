import subprocess
import re

dsn_path = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer\board2_sensor_relay\board2_sensor_relay.dsn"
with open(dsn_path, "r", encoding="utf-8") as f:
    dsn = f.read()

# Board outline is (10000 -185000) to (105000 -10000)
# Let's add a keepout covering almost the entire F.Cu layer:
# (keepout "" (polygon F.Cu 0  10000 -185000  105000 -185000  105000 -10000  10000 -10000  10000 -185000))
keepout_fcu = """
    (keepout "" (polygon F.Cu 0  9000 -186000  106000 -186000  106000 -9000  9000 -9000  9000 -186000))
"""
# insert before (via ...
idx = dsn.find('(via ')
dsn_mod = dsn[:idx] + keepout_fcu + dsn[idx:]

dsn_test = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer\board2_sensor_relay\test_keepout.dsn"
ses_test = r"d:\DOANTOTNGHIEP\hardware\solar_tracker_diy_1layer\board2_sensor_relay\test_keepout.ses"
with open(dsn_test, "w", encoding="utf-8") as f:
    f.write(dsn_mod)

cmd = ["java", "-jar", r"d:\DOANTOTNGHIEP\hardware\freerouting.jar", "-de", dsn_test, "-do", ses_test, "-mp", "30"]
res = subprocess.run(cmd, capture_output=True, text=True)
print("Returncode:", res.returncode)

