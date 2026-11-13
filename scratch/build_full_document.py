# -*- coding: utf-8 -*-
"""
Master Builder Script to update THUYẾT MINH backup.docx
"""

import os
import shutil
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

from content_chapter2 import CH2_ESP32_DATA, CH2_ADDITIONAL_SECTIONS
from content_chapter3 import CH3_DATA
from content_chapter4 import CH4_DATA, CH5_DATA, REFERENCES_DATA

DOC_PATH = 'THUYẾT MINH backup.docx'

def format_cell_text(cell, text, bold=False, italic=False, size_pt=10, align=WD_ALIGN_PARAGRAPH.LEFT):
    cell.text = text
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.first_line_indent = Pt(0)
    for run in p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(size_pt)
        run.font.bold = bold
        run.font.italic = italic
        run.font.color.rgb = RGBColor(0, 0, 0)

def set_cell_margins_and_borders(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(r'''
        <w:tcMar %(ns)s>
            <w:top w:w="%(top)d" w:type="dxa"/>
            <w:bottom w:w="%(bottom)d" w:type="dxa"/>
            <w:left w:w="%(left)d" w:type="dxa"/>
            <w:right w:w="%(right)d" w:type="dxa"/>
        </w:tcMar>
    ''' % {'ns': nsdecls('w'), 'top': top, 'bottom': bottom, 'left': left, 'right': right})
    tcPr.append(tcMar)
    tcBorders = parse_xml(r'''
        <w:tcBorders %(ns)s>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        </w:tcBorders>
    ''' % {'ns': nsdecls('w')})
    tcPr.append(tcBorders)

def add_styled_table(doc, caption_text, headers, rows_data):
    # Caption
    cp = doc.add_paragraph(caption_text, style='Bang')
    cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cp.paragraph_format.space_before = Pt(8)
    cp.paragraph_format.space_after = Pt(4)
    cp.paragraph_format.first_line_indent = Pt(0)
    for run in cp.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(11)
        run.font.bold = True
    
    tbl = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = True

    # Header Row
    hdr_cells = tbl.rows[0].cells
    for i, title in enumerate(headers):
        format_cell_text(hdr_cells[i], title, bold=True, size_pt=10.5, align=WD_ALIGN_PARAGRAPH.CENTER)
        shd = parse_xml(r'<w:shd %(ns)s w:fill="EBF2FA"/>' % {'ns': nsdecls('w')})
        hdr_cells[i]._tc.get_or_add_tcPr().append(shd)
        set_cell_margins_and_borders(hdr_cells[i])

    # Data Rows
    for r_idx, row_values in enumerate(rows_data):
        row_cells = tbl.rows[r_idx + 1].cells
        bg_color = "FDFDFD" if r_idx % 2 == 0 else "F7FAFD"
        for c_idx, val in enumerate(row_values):
            align = WD_ALIGN_PARAGRAPH.LEFT if c_idx == 0 or len(val) > 15 else WD_ALIGN_PARAGRAPH.CENTER
            format_cell_text(row_cells[c_idx], val, bold=False, size_pt=10, align=align)
            shd = parse_xml(r'<w:shd %(ns)s w:fill="%(color)s"/>' % {'ns': nsdecls('w'), 'color': bg_color})
            row_cells[c_idx]._tc.get_or_add_tcPr().append(shd)
            set_cell_margins_and_borders(row_cells[c_idx])

    # Empty spacer paragraph after table
    sp = doc.add_paragraph(style='Normal')
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)
    sp.paragraph_format.first_line_indent = Pt(0)
    return tbl

def add_heading_2(doc, text):
    p = doc.add_paragraph(text, style='Heading 2')
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Pt(0)
    for run in p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_heading_3(doc, text):
    p = doc.add_paragraph(text, style='Heading 3')
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Pt(0)
    for run in p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_heading_4(doc, text):
    p = doc.add_paragraph(text, style='Heading 4')
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Pt(0)
    for run in p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.italic = True
        run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_body_p(doc, text):
    p = doc.add_paragraph(text, style='Normal')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Pt(20)
    for run in p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(13)
        run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_figure(doc, img_path, caption_text, width_in=5.8):
    if not os.path.exists(img_path):
        print(f"Warning: Image not found: {img_path}")
        return
    ip = doc.add_paragraph(style='Normal')
    ip.alignment = WD_ALIGN_PARAGRAPH.CENTER
    ip.paragraph_format.space_before = Pt(6)
    ip.paragraph_format.space_after = Pt(2)
    ip.paragraph_format.first_line_indent = Pt(0)
    run = ip.add_run()
    run.add_picture(img_path, width=Inches(width_in))

    cp = doc.add_paragraph(caption_text, style='Hình')
    cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cp.paragraph_format.space_before = Pt(2)
    cp.paragraph_format.space_after = Pt(8)
    cp.paragraph_format.first_line_indent = Pt(0)
    for r in cp.runs:
        r.font.name = 'Times New Roman'
        r.font.size = Pt(11)
        r.font.italic = True
        r.font.bold = True
        r.font.color.rgb = RGBColor(0, 0, 0)

print("Builder helper functions ready.")

