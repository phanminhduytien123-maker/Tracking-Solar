import win32com.client
import os

docx_path = os.path.abspath(r"D:\DOANTOTNGHIEP\scratch\test_toc_build.docx")
pdf_path = os.path.abspath(r"D:\DOANTOTNGHIEP\scratch\test_toc_build.pdf")

word = win32com.client.Dispatch("Word.Application")
word.Visible = False
word.DisplayAlerts = False

try:
    print(f"Opening {docx_path}...")
    doc = word.Documents.Open(docx_path)
    
    print(f"Total TOCs: {doc.TablesOfContents.Count}")
    print(f"Total Figures Tables: {doc.TablesOfFigures.Count}")
    
    # Set TabLeader = 1 (wdTabLeaderDots)
    for i in range(1, doc.TablesOfContents.Count + 1):
        toc = doc.TablesOfContents.Item(i)
        toc.TabLeader = 1
        toc.Update()
        print(f"Updated TOC #{i} with TabLeader=1")
        
    for i in range(1, doc.TablesOfFigures.Count + 1):
        tof = doc.TablesOfFigures.Item(i)
        tof.TabLeader = 1
        tof.Update()
        print(f"Updated TOF #{i} with TabLeader=1")
        
    doc.Fields.Update()
    print("Updated all document fields.")
    
    doc.Save()
    print("Saved docx.")
    
    doc.ExportAsFixedFormat(pdf_path, 17)
    print(f"Exported to {pdf_path}")
    
    doc.Close(SaveChanges=True)
except Exception as e:
    print("Error:", e)
finally:
    word.Quit()
    print("Word COM finished.")

