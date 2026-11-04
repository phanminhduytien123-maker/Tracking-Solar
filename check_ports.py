import subprocess

out = subprocess.check_output('netstat -ano', shell=True).decode()
listening = [line for line in out.splitlines() if 'LISTENING' in line]
for l in listening:
    parts = l.split()
    if len(parts) >= 5:
        addr = parts[1]
        pid = parts[4]
        try:
            p_out = subprocess.check_output(f'tasklist /FI "PID eq {pid}" /FO CSV', shell=True).decode()
            p_name = p_out.splitlines()[-1].split(',')[0].replace('"', '')
            print(f'Port: {addr:25} PID: {pid:6} Name: {p_name}')
        except Exception:
            pass

