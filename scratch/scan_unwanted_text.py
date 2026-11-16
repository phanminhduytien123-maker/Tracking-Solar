import docx
import re
import os

doc_path = r"D:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx"
doc = docx.Document(doc_path)

print("=== 1. Checking author/founder names ===")
for i, p in enumerate(doc.paragraphs):
    for name in ['Marcos', 'Ponce', 'Zadeh', 'Kennedy', 'Clerc', 'Mamdani', 'Sugeno', 'Leadshine', 'Vishay', 'Hengxiang', 'Newton', 'Kepler']:
        if name.lower() in p.text.lower() and not p.text.startswith('[') and i < 560:
            print(f"P{i}: found {name} -> {p.text[:120]}")

print("\n=== 2. Checking Ghi chú ===")
for i, p in enumerate(doc.paragraphs):
    if 'ghi chú' in p.text.lower():
        print(f"P{i}: {p.text}")

print("\n=== 3. Checking English parentheticals ===")
for i, p in enumerate(doc.paragraphs):
    if i >= 560: continue # references
    # Find all parentheticals
    matches = re.findall(r'\([^)]+\)', p.text)
    for m in matches:
        # Check if parenthetical contains English words or hyphenated english explanations
        if any(k in m.lower() for k in [
            'open-circuit', 'short-circuit', 'missed steps', 'open-loop', 'closed-loop',
            'trial and error', 'global optimum', 'solar constant', 'hour angle', 'inertia weight',
            'cognitive parameter', 'social parameter', 'personal best', 'global best',
            'integral of', 'fitness function', 'anti-windup', 'hunting', 'deadband',
            'fast slew', 'fine slew', 'lead time', 'hold current', 'half-current',
            'normally closed', 'air mass', 'light current', 'solar position',
            'tracker gain percentage', 'parasitic energy consumption'
        ]):
            print(f"P{i}: {m} -> text: {p.text[:100]}...")

