import docx

doc = docx.Document('THUYẾT MINH backup.docx')
styles = doc.styles
for s in styles:
    if 'Heading' in s.name or s.name in ['Normal', 'Title', 'Hình', 'Bang', 'toc 1', 'toc 2', 'toc 3']:
        font_name = s.font.name if s.font else 'None'
        font_size = s.font.size.pt if s.font and s.font.size else 'None'
        print(f'Style: "{s.name}", font={font_name}, size={font_size}')

