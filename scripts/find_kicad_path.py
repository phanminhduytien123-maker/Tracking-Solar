import os, re

for fname in os.listdir('scripts'):
    if fname.endswith('.py'):
        p = os.path.join('scripts', fname)
        try:
            with open(p, 'r', encoding='utf-8') as f:
                c = f.read()
            if 'kicad-cli' in c or 'kicad' in c.lower():
                matches = [line.strip() for line in c.splitlines() if 'kicad-cli' in line or 'bin' in line]
                if matches:
                    print(fname, ':', matches[:2])
        except Exception:
            pass

