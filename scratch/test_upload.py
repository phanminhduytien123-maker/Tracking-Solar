import urllib.request
import uuid
import json
import time

bin_path = r'scratch\www\firmware.bin'
with open(bin_path, 'rb') as f:
    bin_data = f.read()

boundary = uuid.uuid4().hex
part1 = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="firmware.bin"\r\n'
    f'Content-Type: application/octet-stream\r\n\r\n'
).encode('utf-8')
part2 = f'\r\n--{boundary}--\r\n'.encode('utf-8')
body = part1 + bin_data + part2
headers = {'Content-Type': f'multipart/form-data; boundary={boundary}'}

print(f"Uploading {len(bin_data):,} bytes to tmpfiles.org...")
req = urllib.request.Request('https://tmpfiles.org/api/v1/upload', data=body, headers=headers)
with urllib.request.urlopen(req, timeout=30) as resp:
    res = json.loads(resp.read().decode())
    raw_url = res['data']['url']
    dl_url = raw_url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
    print('Raw URL:', raw_url)
    print('Direct Download URL:', dl_url)

# Benchmark download speed
print("Testing direct download speed...")
start = time.time()
req2 = urllib.request.Request(dl_url, headers={'User-Agent': 'ESP32-http-Update'})
with urllib.request.urlopen(req2, timeout=20) as resp2:
    down_data = resp2.read()
dur = time.time() - start
print(f"Downloaded {len(down_data):,} bytes in {dur:.2f}s ({len(down_data)/dur/1024:.1f} KB/s)")
