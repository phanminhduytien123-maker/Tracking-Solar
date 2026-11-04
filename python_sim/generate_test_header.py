import json

with open('python_sim/test_vectors_phase1.json', 'r', encoding='utf-8') as f:
    vectors = json.load(f)

lines = []
lines.append('// Auto-generated test vectors header')
lines.append('#ifndef TEST_VECTORS_DATA_H')
lines.append('#define TEST_VECTORS_DATA_H')
lines.append('')
lines.append('#include <cstddef>')
lines.append('#include <stdint.h>')
lines.append('')
lines.append('struct TestVector {')
lines.append('    const char* name;')
lines.append('    int year, month, day, hour, minute, second;')
lines.append('    double tz, lat, lon;')
lines.append('    double noaa_az, noaa_el, noaa_zenith;')
lines.append('    uint16_t noaa_sunrise, noaa_sunset;')
lines.append('    double spencer_az, spencer_el, spencer_zenith;')
lines.append('    uint16_t spencer_sunrise, spencer_sunset;')
lines.append('};')
lines.append('')
lines.append('static const TestVector TEST_VECTORS[] = {')

for v in vectors:
    lines.append(f'    {{"{v["name"]}", {v["year"]}, {v["month"]}, {v["day"]}, {v["hour"]}, {v["minute"]}, {v["second"]}, {v["tz"]}, {v["lat"]}, {v["lon"]}, {v["noaa_az"]}, {v["noaa_el"]}, {v["noaa_zenith"]}, {v["noaa_sunrise"]}, {v["noaa_sunset"]}, {v["spencer_az"]}, {v["spencer_el"]}, {v["spencer_zenith"]}, {v["spencer_sunrise"]}, {v["spencer_sunset"]}}},')

lines.append('};')
lines.append(f'static const size_t NUM_TEST_VECTORS = {len(vectors)};')
lines.append('#endif // TEST_VECTORS_DATA_H')

with open('firmware/esp32_tracker_control/test/test_vectors_data.h', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines) + '\n')

print(f'Generated test_vectors_data.h with {len(vectors)} vectors')
