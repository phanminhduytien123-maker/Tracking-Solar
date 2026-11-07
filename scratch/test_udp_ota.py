import socket
import time

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.bind(('192.168.0.104', 3232))
s.settimeout(2.0)

msg = "0 3232 1000000 0123456789abcdef0123456789abcdef\n"
print("Sending test UDP to 192.168.0.102:3232...")

for i in range(5):
    try:
        s.sendto(msg.encode(), ('192.168.0.102', 3232))
        print(f"Sent {i+1}, waiting for recv...")
        data, addr = s.recvfrom(1024)
        print("Received response:", data, "from", addr)
        break
    except socket.timeout:
        print(f"Timeout on try {i+1}")
    time.sleep(0.5)

s.close()

