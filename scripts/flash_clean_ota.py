import socket
import sys
import os
import hashlib
import time
import threading

bin_path = r"C:\tmp_pio_build\root\esp32_devkit_test\firmware.bin"
content_size = os.path.getsize(bin_path)
with open(bin_path, 'rb') as f:
    file_md5 = hashlib.md5(f.read()).hexdigest()

esp_ip = "192.168.1.9"
esp_port = 3232
password = "solar2026"
passmd5 = hashlib.md5(password.encode()).hexdigest()
cnonce = hashlib.md5(f"{bin_path}{content_size}{file_md5}{esp_ip}".encode()).hexdigest()

# Find routing local IP
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.connect((esp_ip, esp_port))
local_ip = s.getsockname()[0]
s.close()
print(f"Local IP: {local_ip}, Firmware: {content_size} bytes")

# TCP Server
tcp_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
tcp_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
tcp_sock.bind((local_ip, 0))
local_port = tcp_sock.getsockname()[1]
tcp_sock.listen(1)
print(f"TCP listening on {local_ip}:{local_port}")

tcp_conn = [None]
def accept_tcp():
    try:
        tcp_sock.settimeout(20.0)
        c, a = tcp_sock.accept()
        tcp_conn[0] = c
        print(f"\n[TCP CONNECTED from {a}]")
    except Exception as e:
        pass

t = threading.Thread(target=accept_tcp, daemon=True)
t.start()

# UDP Handshake
udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
udp.bind((local_ip, 0))

inv_msg = f"0 {local_port} {content_size} {file_md5}\n".encode()

authenticated = False
for cycle in range(15):
    if tcp_conn[0] is not None or authenticated:
        break

    print(f"Cycle {cycle+1}: Sending invite...")
    udp.sendto(inv_msg, (esp_ip, esp_port))

    # Wait up to 3s for AUTH
    udp.settimeout(2.5)
    try:
        data, addr = udp.recvfrom(128)
        msg = data.decode().strip()
        print(f"ESP32: {msg}")

        if msg.startswith("AUTH"):
            nonce = msg.split()[1]
            challenge = f"{passmd5}:{nonce}:{cnonce}"
            result = hashlib.md5(challenge.encode()).hexdigest()
            auth_msg = f"200 {cnonce} {result}\n".encode()

            print(f"Sending AUTH for nonce {nonce[:8]}...")
            udp.sendto(auth_msg, (esp_ip, esp_port))

            # Wait up to 5s for OK
            udp.settimeout(5.0)
            try:
                data2, addr2 = udp.recvfrom(128)
                msg2 = data2.decode().strip()
                print(f"ESP32 after auth: {msg2}")
                if "OK" in msg2:
                    authenticated = True
                    break
            except socket.timeout:
                print("Wait for auth response timed out, checking TCP...")
                if tcp_conn[0] is not None:
                    authenticated = True
                    break

        elif "OK" in msg:
            authenticated = True
            break

    except socket.timeout:
        print("Invite timed out, waiting 1s before next cycle...")
        time.sleep(1.0)

udp.close()

# Wait for TCP
print("Waiting for TCP data connection...")
t.join(timeout=10.0)
conn = tcp_conn[0]

if not conn:
    print("FAILED: No TCP connection from ESP32!")
    tcp_sock.close()
    sys.exit(1)

print("STREAMING FIRMWARE...")
t0 = time.time()
with open(bin_path, 'rb') as f:
    sent = 0
    last_p = 0
    while True:
        chunk = f.read(1460)
        if not chunk: break
        conn.sendall(chunk)
        sent += len(chunk)
        if time.time() - last_p >= 0.5 or sent == content_size:
            last_p = time.time()
            pct = sent * 100 / content_size
            speed = (sent / 1024) / (time.time() - t0 + 0.001)
            print(f"\rProgress: {pct:.1f}% ({sent}/{content_size}) @ {speed:.1f} KB/s", end="", flush=True)

print(f"\nUpload complete in {time.time()-t0:.1f}s! Waiting for device finish...")
conn.settimeout(20.0)
try:
    while True:
        res = conn.recv(64).decode()
        if not res: break
        print(f"Device: {res.strip()}")
        if "OK" in res:
            print("\n>>> FLASH OTA THÀNH CÔNG 100%! ESP32 ĐANG KHỞI ĐỘNG LẠI! <<<")
            break
except Exception:
    pass

conn.close()
tcp_sock.close()
print("DONE!")

