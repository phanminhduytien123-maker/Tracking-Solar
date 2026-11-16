import docx

doc = docx.Document('HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545_v2.docx')

print(f"Total paragraphs: {len(doc.paragraphs)}")
print(f"Total tables: {len(doc.tables)}")

def search_paras(keywords, max_results=5):
    results = []
    for i, p in enumerate(doc.paragraphs):
        text = p.text
        if any(k.lower() in text.lower() for k in keywords):
            results.append((i, text))
            if len(results) >= max_results:
                break
    return results

print("\n--- A1/A2: NOAA / Ephemeris in Mục 2.7 ---")
for idx, txt in search_paras(["NOAA", "Jean Meeus", "xích vĩ", "23.45"], 6):
    print(f"P{idx}: {txt[:120]}...")

print("\n--- A4: ADC in Bảng 2.1 & Mục 2.2 ---")
for idx, txt in search_paras(["ADC1", "ADC2", "12-bit", "kênh ADC"], 5):
    print(f"P{idx}: {txt[:120]}...")

print("\n--- A5: FZ0430 & ACS712 in Mục 2.10 & 3.5 ---")
for idx, txt in search_paras(["FZ0430", "ACS712", "chia áp", "cầu phân áp"], 5):
    print(f"P{idx}: {txt[:120]}...")

print("\n--- A6: Thời gian ngắt Voc/Isc ---")
for idx, txt in search_paras(["250ms", "chu kỳ đo", "ngắt tải"], 5):
    print(f"P{idx}: {txt[:120]}...")

print("\n--- A7: Cơ khí & Quán tính in Mục 3.2 ---")
for idx, txt in search_paras(["quán tính", "mô-men", "khí động học", "vận tốc gió"], 5):
    print(f"P{idx}: {txt[:120]}...")

print("\n--- A8: Năng lượng tự dùng in Mục 4.3 ---")
for idx, txt in search_paras(["năng lượng tự dùng", "tự dùng", "parasitic", "Wh/ngày"], 5):
    print(f"P{idx}: {txt[:120]}...")

print("\n--- A9: DM556 switches in Bảng 2.2 & Mục 2.3 ---")
for idx, txt in search_paras(["DM556", "SW5", "SW4", "vi bước"], 5):
    print(f"P{idx}: {txt[:120]}...")

print("\n--- A10: INA226 in Mục 2.6 ---")
for idx, txt in search_paras(["INA226", "Rshunt", "thanh ghi"], 5):
    print(f"P{idx}: {txt[:120]}...")

print("\n--- A11: TEMT6000 in Mục 2.5 ---")
for idx, txt in search_paras(["TEMT6000", "quang phổ", "quang điện cực góp"], 5):
    print(f"P{idx}: {txt[:120]}...")

print("\n--- B1: PSO offline vs online ---")
for idx, txt in search_paras(["PSO", "thế hệ", "bầy đàn", "RAM"], 5):
    print(f"P{idx}: {txt[:120]}...")

print("\n--- B3: Sai số e ---")
for idx, txt in search_paras(["Vleft", "Vright", "exoay", "vùng chết"], 5):
    print(f"P{idx}: {txt[:120]}...")

