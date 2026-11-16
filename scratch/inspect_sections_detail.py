import docx

doc = docx.Document('HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545_v2.docx')

def print_range(start, end, label=""):
    print(f"\n==================== {label} (P{start} to P{end}) ====================")
    for i in range(start, min(end + 1, len(doc.paragraphs))):
        p = doc.paragraphs[i]
        if p.text.strip():
            print(f"P{i} [{p.style.name}]: {p.text}")

# 1. Muc 2.7: NOAA
print_range(360, 375, "MỤC 2.7 NOAA")

# 2. Muc 2.1 & 2.2: ESP32-S3 ADC
print_range(328, 337, "MỤC 2.2 ESP32-S3")

# 3. Muc 2.5: TEMT6000
print_range(350, 356, "MỤC 2.5 TEMT6000")

# 4. Muc 2.6: INA226
print_range(356, 360, "MỤC 2.6 INA226")

# 5. Muc 2.10: Voc/Isc
print_range(398, 406, "MỤC 2.10 VOC/ISC")

# 6. Muc 3.2: Co khi & Gio & Quan tinh
print_range(420, 444, "MỤC 3.2 CƠ KHÍ & GIÓ & QUÁN TÍNH")

# 7. Muc 3.5: Mach do Voc/Isc & Chuyen mach
print_range(475, 488, "MỤC 3.5 MẠCH ĐO VOC/ISC")

# 8. Muc 3.6: Thuat toan dieu khien & Sai so quang
print_range(489, 502, "MỤC 3.6 THUẬT TOÁN ĐIỀU KHIỂN")

# 9. Muc 4.1.1, 4.1.2, 4.1.3: NOAA, PSO, Fuzzy-PID
print_range(527, 545, "MỤC 4.1.1 - 4.1.3 THỰC NGHIỆM THUẬT TOÁN")

# 10. Muc 4.3: Nang luong tu dung & Net gain
print_range(560, 569, "MỤC 4.3 NĂNG LƯỢNG TỰ DÙNG & NET GAIN")

