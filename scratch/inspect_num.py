import docx

doc = docx.Document('THUYẾT MINH backup.docx')
for idx in [273, 274, 277, 323, 324, 325, 335, 353]:
    p = doc.paragraphs[idx]
    pPr = p._p.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pPr')
    numPr = pPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}numPr') if pPr is not None else None
    num_str = 'None'
    if numPr is not None:
        ilvl = numPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}ilvl')
        numId = numPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}numId')
        ilvl_val = ilvl.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') if ilvl is not None else ''
        numId_val = numId.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') if numId is not None else ''
        num_str = f'numId={numId_val} ilvl={ilvl_val}'
    print(f'P{idx} [{p.style.name}]: text="{p.text}", numPr={num_str}')

