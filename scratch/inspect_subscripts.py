import docx

doc = docx.Document('HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx')

for idx in [390, 536, 537, 540, 541, 542]:
    p = doc.paragraphs[idx]
    print(f'=== P{idx} ===')
    for r_i, r in enumerate(p.runs):
        sub = ' [SUB]' if r.font.subscript else ''
        print(f'  r{r_i}: {repr(r.text)}{sub}')

