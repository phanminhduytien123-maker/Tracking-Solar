import urllib.request
import uuid
import os

bin_path = r'C:\tmp_pio_build\root\esp32_devkit_test\firmware.bin'
file_size = os.path.getsize(bin_path)
print(f"Reading {bin_path} ({file_size} bytes)...")

with open(bin_path, 'rb') as f:
    bin_data = f.read()

boundary = uuid.uuid4().hex
headers = {'Content-Type': f'multipart/form-data; boundary={boundary}'}

part1 = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="reqtype"\r\n\r\n'
    f'fileupload\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="fileToUpload"; filename="firmware_v217.bin"\r\n'
    f'Content-Type: application/octet-stream\r\n\r\n'
).encode('utf-8')

part2 = f'\r\n--{boundary}--\r\n'.encode('utf-8')

body = part1 + bin_data + part2

req = urllib.request.Request('https://catbox.moe/user/api.php', data=body, headers=headers)
print("Uploading to Catbox...")
with urllib.request.urlopen(req, timeout=60) as resp:
    url = resp.read().decode('utf-8').strip()
    print("Uploaded URL:", url)

# Save URL to a file
with open('scratch/fota_url_v217.txt', 'w') as f:
    f.write(url)
