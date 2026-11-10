import urllib.request
import ssl
import uuid

def upload_catbox(file_path):
    ctx = ssl._create_unverified_context()
    boundary = uuid.uuid4().hex
    with open(file_path, 'rb') as f:
        file_bytes = f.read()

    data = bytearray()
    data.extend(f'--{boundary}\r\n'.encode('utf-8'))
    data.extend(b'Content-Disposition: form-data; name="reqtype"\r\n\r\n')
    data.extend(b'fileupload\r\n')

    data.extend(f'--{boundary}\r\n'.encode('utf-8'))
    data.extend(b'Content-Disposition: form-data; name="fileToUpload"; filename="firmware.bin"\r\n')
    data.extend(b'Content-Type: application/octet-stream\r\n\r\n')
    data.extend(file_bytes)
    data.extend(b'\r\n')
    data.extend(f'--{boundary}--\r\n'.encode('utf-8'))

    req = urllib.request.Request('https://catbox.moe/user/api.php', data=data)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    req.add_header('User-Agent', 'Mozilla/5.0')

    with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
        url = resp.read().decode('utf-8').strip()
        return url

if __name__ == '__main__':
    url = upload_catbox(r'C:\tmp_pio_build\root\esp32_devkit_test\firmware.bin')
    print('Uploaded Catbox URL:', url)

