import win32com.client
import os
import time

docx_path = os.path.abspath(r"D:\DOANTOTNGHIEP\THUYẾT MINH_hoanchinh.docx")
pdf_path = os.path.abspath(r"D:\DOANTOTNGHIEP\scratch\THUYET_MINH_hoanchinh.pdf")

print("Launching Word COM Application...")
word = win32com.client.Dispatch("Word.Application")
word.Visible = False
word.DisplayAlerts = False

try:
    print(f"Opening {docx_path}...")
    doc = word.Documents.Open(docx_path)
    
    print(f"Document opened. Total TOCs: {doc.TablesOfContents.Count}")
    print(f"Total Figures Tables: {doc.TablesOfFigures.Count}")
    
    print("Updating all document fields...")
    doc.Fields.Update()
    
    for i in range(1, doc.TablesOfContents.Count + 1):
        print(f"Updating TableOfContents #{i}...")
        doc.TablesOfContents.Item(i).Update()
        
    for i in range(1, doc.TablesOfFigures.Count + 1):
        print(f"Updating TableOfFigures #{i}...")
        doc.TablesOfFigures.Item(i).Update()
        
    print("Saving updated document...")
    doc.Save()
    
    print(f"Exporting to PDF: {pdf_path}...")
    # wdExportFormatPDF = 17
    doc.ExportAsFixedFormat(pdf_path, 17)
    
    print("Closing document...")
    doc.Close(SaveChanges=True)
    print("Success!")
except Exception as e:
    print("Error during Word COM automation:", e)
finally:
    word.Quit()
    print("Word COM Application quit.")

