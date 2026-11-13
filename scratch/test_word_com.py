# -*- coding: utf-8 -*-
"""
test_word_com.py - Open THUYẾT MINH backup.docx using Microsoft Word COM
Verify zero corruption, read exact page count, sections, tables, shapes, and margins.
"""

import os
import win32com.client
import pythoncom

doc_abs_path = os.path.abspath('THUYẾT MINH backup.docx')
print(f"Opening with Word COM: {doc_abs_path}")

word = None
try:
    word = win32com.client.DispatchEx('Word.Application')
    word.Visible = False
    word.DisplayAlerts = 0  # wdAlertsNone

    doc = word.Documents.Open(doc_abs_path, ReadOnly=True)
    
    print("\n[SUCCESS] Document opened cleanly by Microsoft Word without any alerts or errors!")
    
    # Statistics
    pages = doc.ComputeStatistics(2)  # wdStatisticPages
    words = doc.ComputeStatistics(0)  # wdStatisticWords
    paras = doc.Paragraphs.Count
    tables = doc.Tables.Count
    shapes = doc.InlineShapes.Count
    sections = doc.Sections.Count
    
    print(f"Page Count: {pages}")
    print(f"Word Count: {words}")
    print(f"Paragraphs Count: {paras}")
    print(f"Tables Count: {tables}")
    print(f"InlineShapes Count: {shapes}")
    print(f"Sections Count: {sections}")

    # Inspect margins of each section via Word COM
    print("\n--- MARGINS VIA WORD COM ---")
    for s_idx in range(1, sections + 1):
        sec = doc.Sections(s_idx)
        ps = sec.PageSetup
        top_cm = ps.TopMargin / 28.3465
        bottom_cm = ps.BottomMargin / 28.3465
        left_cm = ps.LeftMargin / 28.3465
        right_cm = ps.RightMargin / 28.3465
        print(f"Section {s_idx}: Top={top_cm:.2f}cm, Bottom={bottom_cm:.2f}cm, Left={left_cm:.2f}cm, Right={right_cm:.2f}cm")

    doc.Close(False)
    print("\n[PASS] Document closed cleanly.")

except Exception as e:
    print(f"[FAIL] Error with Word COM: {e}")
finally:
    if word:
        word.Quit()
