import socket
import sys
import os
import hashlib
import time
import threading

def flash(esp_ip="192.168.1.9", esp_port=3232, password="solar2026", bin_path=r"C:\tmp_pio_build\root\esp32_devkit_test\firmware.bin"):
    if not os.path.exists(bin_path):
        print(f"Error: {bin_path} not found!")
        return False

    content_size = os.path.getsize(bin_path)
    with open(bin_path, 'rb') as f:
        file_md5 = hashlib.md5(f.read()).hexdigest()

    print(f"Firmware: {bin_path}")
    print(f"Size: {content_size} bytes | MD5: {file_md5}")

    routing_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    routing_sock.connect((esp_ip, esp_port))
    local_ip = routing_sock.getsockname()[0]
    routing_sock.close()
    print(f"Local IP for OTA: {local_ip}")

    # Set up TCP server socket
    tcp_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    tcp_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    tcp_sock.bind((local_ip, 0))
    local_port = tcp_sock.getsockname()[1]
    tcp_sock.listen(2)
    print(f"TCP server ready on {local_ip}:{local_port}")

    # Background thread to accept TCP connection
    tcp_conn = [None]
    tcp_addr = [None]
    stop_event = threading.Event()

    def tcp_listener():
        tcp_sock.settimeout(0.5)
        while not stop_event.is_set():
            try:
                c, a = tcp_sock.accept()
                tcp_conn[0] = c
                tcp_addr[0] = a
                print(f"\n>>> [TCP CONNECTED] ESP32 da mo ket noi du lieu thanh cong tu {a}!")
                break
            except socket.timeout:
                continue
            except Exception:
                break

    listener_thread = threading.Thread(target=tcp_listener, daemon=True)
    listener_thread.start()

    # Set up UDP socket
    udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    udp_sock.bind((local_ip, 0))

    invitation = f"0 {local_port} {content_size} {file_md5}\n"
    print(f"Sending invitation to {esp_ip}:{esp_port} (TCP port {local_port})...")

    current_nonce = None
    auth_pkt = None
    passmd5 = hashlib.md5(password.encode()).hexdigest()
    cnonce = hashlib.md5(f"{bin_path}{content_size}{file_md5}{esp_ip}".encode()).hexdigest()

    auth_verified = False
    start_time = time.time()
    last_inv_time = 0
    last_auth_time = 0

    while time.time() - start_time < 45.0:
        if tcp_conn[0] is not None:
            auth_verified = True
            break

        now = time.time()
        # If no nonce yet, send invitation every 2.0 seconds
        if current_nonce is None and (now - last_inv_time >= 2.0):
            last_inv_time = now
            print(f"Sending invite packet... ({now - start_time:.1f}s)")
            udp_sock.sendto(invitation.encode(), (esp_ip, esp_port))

        # If nonce received, send auth response every 1.0 second until TCP connects or OK
        if current_nonce is not None and auth_pkt is not None and (now - last_auth_time >= 1.0):
            last_auth_time = now
            print(f"Sending AUTH response (nonce {current_nonce[:8]}...)...")
            udp_sock.sendto(auth_pkt.encode(), (esp_ip, esp_port))

        try:
            udp_sock.settimeout(0.5)
            data, addr = udp_sock.recvfrom(128)
            msg = data.decode().strip()
            print(f"ESP32 UDP >> {msg}")

            if msg.startswith("AUTH"):
                new_nonce = msg.split()[1]
                current_nonce = new_nonce
                challenge = f"{passmd5}:{current_nonce}:{cnonce}"
                result = hashlib.md5(challenge.encode()).hexdigest()
                auth_pkt = f"200 {cnonce} {result}\n"
                last_auth_time = now
                print(f"Computed AUTH for nonce {current_nonce[:8]}... -> sending immediately!")
                udp_sock.sendto(auth_pkt.encode(), (esp_ip, esp_port))

            elif "OK" in msg:
                print(">>> [AUTH OK] ESP32 da xac thuc thanh cong! Dang doi ket noi TCP...")
                auth_verified = True
                break
            elif "Authentication Failed" in msg:
                print("ESP32: Authentication Failed! Resetting nonce...")
                current_nonce = None
                auth_pkt = None
        except socket.timeout:
            pass

    udp_sock.close()

    # Wait for TCP connection
    print("\nWaiting for TCP stream to establish...")
    listener_thread.join(timeout=15.0)
    stop_event.set()

    conn = tcp_conn[0]
    if conn is None:
        print("ERROR: ESP32 did not connect to TCP server!")
        tcp_sock.close()
        return False

    # Stream firmware binary
    print("Streaming firmware to ESP32...")
    t_start = time.time()
    last_print = 0
    with open(bin_path, 'rb') as f:
        offset = 0
        while True:
            chunk = f.read(1460)
            if not chunk:
                break
            conn.sendall(chunk)
            offset += len(chunk)
            if time.time() - last_print >= 0.5 or offset == content_size:
                last_print = time.time()
                pct = (offset / content_size) * 100
                speed_kb = (offset / 1024.0) / (time.time() - t_start + 0.001)
                sys.stdout.write(f"\rProgress: {pct:5.1f}% ({offset}/{content_size} bytes) @ {speed_kb:.1f} KB/s")
                sys.stdout.flush()

    duration = time.time() - t_start
    print(f"\nUpload finished in {duration:.1f}s! Waiting for device confirmation...")
    conn.settimeout(25.0)
    try:
        while True:
            res = conn.recv(64).decode()
            if not res:
                break
            print(f"Device: {res.strip()}")
            if "OK" in res:
                print("\n=======================================================")
                print(">> [FLASH OTA THANH CONG 100%] ESP32 DANG REBOOT! <<")
                print("=======================================================")
                conn.close()
                tcp_sock.close()
                return True
    except socket.timeout:
        print("Done (socket timeout, but binary fully delivered).")

    conn.close()
    tcp_sock.close()
    return True

if __name__ == "__main__":
    success = flash()
    sys.exit(0 if success else 1)
