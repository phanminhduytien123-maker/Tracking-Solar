import docx

doc_path = r'd:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx'
doc = docx.Document(doc_path)

print("=== REPLACING 'Mô hình Song sinh số 3D (3D Digital Twin)' WORDS ===")

count = 0
for i, p in enumerate(doc.paragraphs):
    # Skip TOC paragraphs (they will be updated by Word COM)
    if i < 240:
        continue
    
    txt = p.text
    if 'Song sinh số' in txt or 'Digital Twin' in txt or 'song sinh số' in txt or 'digital twin' in txt:
        print(f"P{i} before: {txt[:80]}")
        
        # Specific replacements
        if 'Thiết kế giao diện giám sát IoT Web Dashboard và mô hình Digital Twin' in txt:
            p.text = txt.replace('Thiết kế giao diện giám sát IoT Web Dashboard và mô hình Digital Twin', 
                                 'Thiết kế giao diện giám sát IoT Web Dashboard và mô phỏng 3D thời gian thực')
            count += 1
        elif '2. Giao diện Web Dashboard trực quan tích hợp mô hình Song sinh số 3D (Three.js Digital Twin):' in txt:
            p.text = txt.replace('2. Giao diện Web Dashboard trực quan tích hợp mô hình Song sinh số 3D (Three.js Digital Twin):',
                                 '2. Giao diện Web Dashboard trực quan tích hợp mô phỏng 3D thời gian thực (Three.js):')
            count += 1
        elif '- Mô hình Song sinh số 3D (3D Digital Twin):' in txt:
            p.text = txt.replace('- Mô hình Song sinh số 3D (3D Digital Twin):', '- Mô phỏng 3D thời gian thực:')
            count += 1
        elif 'Hình 3.6 Mô hình Song sinh số 3D (Three.js Digital Twin) mô phỏng không gian thực nghiệm giàn pin' in txt:
            p.text = 'Hình 3.6 Giao diện mô phỏng 3D thời gian thực giàn pin trên Web Dashboard'
            count += 1
        elif 'tích hợp mô hình Song sinh số 3D Digital Twin xây dựng trên nền tảng Three.js' in txt:
            p.text = txt.replace('tích hợp mô hình Song sinh số 3D Digital Twin xây dựng trên nền tảng Three.js',
                                 'tích hợp mô phỏng 3D thời gian thực xây dựng trên nền tảng Three.js')
            count += 1
        elif 'tích hợp mô hình Song sinh số 3D (Three.js Digital Twin) mô phỏng chính xác' in txt:
            p.text = txt.replace('tích hợp mô hình Song sinh số 3D (Three.js Digital Twin) mô phỏng chính xác',
                                 'tích hợp mô phỏng 3D thời gian thực (Three.js) mô phỏng chính xác')
            count += 1
        elif 'Giao diện Web 3D Digital Twin Three.js' in txt:
            p.text = txt.replace('Giao diện Web 3D Digital Twin Three.js',
                                 'Giao diện Web mô phỏng 3D thời gian thực với Three.js')
            count += 1
        else:
            # Generic fallback if any other
            new_txt = txt.replace('Mô hình Song sinh số 3D (3D Digital Twin)', 'Mô phỏng 3D thời gian thực')
            new_txt = new_txt.replace('mô hình Song sinh số 3D (Three.js Digital Twin)', 'mô phỏng 3D thời gian thực (Three.js)')
            new_txt = new_txt.replace('Song sinh số 3D', 'Mô phỏng 3D thời gian thực')
            new_txt = new_txt.replace('3D Digital Twin', 'mô phỏng 3D thời gian thực')
            new_txt = new_txt.replace('Digital Twin', 'mô phỏng 3D thời gian thực')
            p.text = new_txt
            count += 1
            
        print(f"P{i} after:  {p.text[:80]}")

print(f"Total replacements made: {count}")
doc.save(doc_path)
print("Docx saved successfully!")

