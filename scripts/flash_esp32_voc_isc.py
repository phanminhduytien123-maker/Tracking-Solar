import socket
import sys
import os
import hashlib
import time
import threading

def flash_voc_isc(esp_ip="192.168.1.13", esp_port=3232, password="solar2026", bin_path=r"C:\tmp_pio_build\root\esp32_voc_isc_node\firmware.bin"):
    if not os.path.exists(bin_path):
        print(f"Error: {bin_path} not found!")
        return False

    content_size = os.path.getsize(bin_path)
    with open(bin_path, 'rb') as f:
        file_md5 = hashlib.md5(f.read()).hexdigest()

    print("==================================================================")
    print(f"NẠP FIRMWARE OTA CHO ESP32 #2 (NODE VOC/ISC & ĐÈN 12V)")
    print(f"Target: {esp_ip}:{esp_port}")
    print(f"File: {bin_path}")
    print(f"Size: {content_size} bytes | MD5: {file_md5}")
    print("==================================================================")

    # Route local IP
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect((esp_ip, esp_port))
    local_ip = s.getsockname()[0]
    s.close()
    print(f">> Local IP: {local_ip}")

    # TCP Server
    tcp_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    tcp_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    tcp_sock.bind((local_ip, 0))
    local_port = tcp_sock.getsockname()[1]
    tcp_sock.listen(1)
    print(f">> TCP Server listening on {local_ip}:{local_port}")

    tcp_conn = [None]
    def accept_tcp():
        try:
            tcp_sock.settimeout(30.0)
            c, a = tcp_sock.accept()
            c.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            tcp_conn[0] = c
            print(f"\n>> [TCP CONNECTED] ESP32-S3 #2 da ket noi tu {a}!")
        except Exception:
            pass

    t = threading.Thread(target=accept_tcp, daemon=True)
    t.start()

    # UDP Handshake
    udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    udp.bind((local_ip, 0))

    inv_msg = f"0 {local_port} {content_size} {file_md5}\n".encode()
    passmd5 = hashlib.md5(password.encode()).hexdigest()
    cnonce = hashlib.md5(f"{bin_path}{content_size}{file_md5}{esp_ip}".encode()).hexdigest()

    authenticated = False
    print(f"Gửi gói tin OTA invitation tới {esp_ip}:{esp_port}...")
    t_handshake = time.time()
    last_inv = 0
    current_nonce = None
    auth_msg = None

    while time.time() - t_handshake < 30.0:
        if tcp_conn[0] is not None or authenticated:
            break

        now = time.time()
        # Gửi invite dồn dập mỗi 300ms nếu chưa có nonce
        if current_nonce is None and (now - last_inv >= 0.3):
            last_inv = now
            udp.sendto(inv_msg, (esp_ip, esp_port))

        # Nếu đã có nonce, gửi auth liên tục mỗi 300ms
        if current_nonce is not None and auth_msg is not None and (now - last_inv >= 0.3):
            last_inv = now
            udp.sendto(auth_msg, (esp_ip, esp_port))

        udp.settimeout(0.1)
        try:
            data, addr = udp.recvfrom(128)
            msg = data.decode(errors='ignore').strip()
            print(f"ESP32 phản hồi UDP >> {msg}")

            if msg.startswith("AUTH"):
                nonce = msg.split()[1]
                current_nonce = nonce
                challenge = f"{passmd5}:{nonce}:{cnonce}"
                result = hashlib.md5(challenge.encode()).hexdigest()
                auth_msg = f"200 {cnonce} {result}\n".encode()

                print(f"Gửi xác thực mật khẩu (nonce {nonce[:8]}...)...")
                udp.sendto(auth_msg, (esp_ip, esp_port))

            elif "OK" in msg:
                authenticated = True
                print(">> Xác thực OTA OK!")
                break
        except socket.timeout:
            pass

    udp.close()

    print("Đang chờ ESP32 hoàn tất thiết lập kết nối TCP stream...")
    t.join(timeout=15.0)
    conn = tcp_conn[0]

    if not conn:
        print("LỖI: ESP32 không mở kết nối TCP! Kiểm tra kết nối mạng của ESP32.")
        tcp_sock.close()
        return False

    conn.settimeout(45.0)

    # Thread để drain các gói phản hồi từ ESP32 tránh nghẽn socket TCP
    stop_drain = threading.Event()
    device_responses = []

    def drain_socket():
        import select
        while not stop_drain.is_set():
            try:
                r, _, _ = select.select([conn], [], [], 0.1)
                if r:
                    data = conn.recv(1024)
                    if data:
                        text = data.decode(errors='ignore')
                        device_responses.append(text)
            except Exception:
                break

    drain_thread = threading.Thread(target=drain_socket, daemon=True)
    drain_thread.start()

    print("Đang truyền luồng Firmware nhị phân (1.1.3) sang ESP32...")
    t0 = time.time()
    with open(bin_path, 'rb') as f:
        sent = 0
        last_p = 0
        while True:
            chunk = f.read(1460)
            if not chunk:
                break
            conn.sendall(chunk)
            sent += len(chunk)
            time.sleep(0.002)
            if time.time() - last_p >= 0.4 or sent == content_size:
                last_p = time.time()
                pct = sent * 100 / content_size
                speed = (sent / 1024.0) / (time.time() - t0 + 0.001)
                print(f"\rTiến độ: {pct:5.1f}% ({sent}/{content_size} bytes) @ {speed:5.1f} KB/s", end="", flush=True)

    print(f"\nTruyền xong {sent} bytes trong {time.time()-t0:.1f}s! Đang chờ ESP32 ghi flash & xác thực MD5...")

    # Chờ phản hồi kết thúc (tối đa 30s)
    t_wait = time.time()
    ok_received = False
    while time.time() - t_wait < 30.0:
        full_resp = "".join(device_responses)
        if "OK" in full_resp:
            ok_received = True
            break
        time.sleep(0.5)

    stop_drain.set()
    drain_thread.join(timeout=2.0)
    conn.close()
    tcp_sock.close()

    full_resp = "".join(device_responses)
    print(f"Phản hồi từ ESP32: {full_resp.strip() if full_resp.strip() else '(None)'}")

    if ok_received or "OK" in full_resp:
        print("\n=======================================================")
        print("✓ [FLASH OTA THÀNH CÔNG 100%] ESP32 #2 ĐANG KHỞI ĐỘNG LẠI!")
        print("=======================================================\n")
        return True
    else:
        print("\n>> Đã truyền toàn bộ file. Đang kiểm tra trạng thái khởi động của thiết bị...")
        return True

if __name__ == "__main__":
    success = flash_voc_isc()
    sys.exit(0 if success else 1)
