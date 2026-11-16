import urllib.request
import json

base_url = 'https://final-project---tracking-solar-default-rtdb.asia-southeast1.firebasedatabase.app'

req = urllib.request.Request(f'{base_url}/solar/tracking.json')
with urllib.request.urlopen(req, timeout=10) as resp:
    trk = json.loads(resp.read().decode())

print("Tracking payload size:", len(json.dumps(trk)))
print("Tracking keys:", len(trk))
for k, v in trk.items():
    if v is None:
        print(f"WARNING: key '{k}' is None!")

req2 = urllib.request.Request(f'{base_url}/solar/static.json')
with urllib.request.urlopen(req2, timeout=10) as resp:
    sta = json.loads(resp.read().decode())

print("Static payload size:", len(json.dumps(sta)))
print("Static keys:", len(sta))
for k, v in sta.items():
    if v is None:
        print(f"WARNING: key '{k}' is None!")

req3 = urllib.request.Request(f'{base_url}/solar/algorithm.json')
with urllib.request.urlopen(req3, timeout=10) as resp:
    algo = json.loads(resp.read().decode())

print("Algorithm payload size:", len(json.dumps(algo)))
print("Algorithm keys:", len(algo))

