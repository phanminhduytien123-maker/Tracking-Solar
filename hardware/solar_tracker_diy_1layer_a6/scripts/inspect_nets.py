import re

netlist_path = r'd:\DOANTOTNGHIEP\hardware\solar_tracker_mainboard\solar_tracker_mainboard.net'
with open(netlist_path, 'r', encoding='utf-8') as f:
    text = f.read()

for net_name in ['/ISC_STA', '/ISC_TRK', '/VOC_STA', '/VOC_TRK', '/+5V_ESP2', '/+5V_ESP2_PRE', '/ESP1_CUT_ESP2']:
    target = f'(name "{net_name}")'
    idx = text.find(target)
    if idx != -1:
        # print until next (net
        next_net = text.find('(net', idx)
        print(f"=== NET: {net_name} ===")
        print(text[idx:next_net if next_net != -1 else idx+400])

