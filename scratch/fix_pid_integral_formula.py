import docx
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

doc_path = r'd:\DOANTOTNGHIEP\HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx'
doc = docx.Document(doc_path)

p = doc.paragraphs[375]
print("Old XML of P375:")
print(p._p.xml)

# Clean, perfect OMML for PID equation:
# u(t) = K_p · e(t) + K_i \int_0^t e(\tau) d\tau + K_d · \frac{de(t)}{dt} [1], [7]

new_p_xml = """<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:pPr>
    <w:spacing w:before="120" w:after="120" w:line="276" w:lineRule="auto"/>
    <w:ind w:firstLine="0"/>
    <w:jc w:val="center"/>
  </w:pPr>
  <m:oMathPara>
    <m:oMath>
      <m:r>
        <w:rPr>
          <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
        </w:rPr>
        <m:t>u(t)=</m:t>
      </m:r>
      <m:sSub>
        <m:sSubPr>
          <m:ctrlPr>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
          </m:ctrlPr>
        </m:sSubPr>
        <m:e>
          <m:r>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
            <m:t>K</m:t>
          </m:r>
        </m:e>
        <m:sub>
          <m:r>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
            <m:t>p</m:t>
          </m:r>
        </m:sub>
      </m:sSub>
      <m:r>
        <w:rPr>
          <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
        </w:rPr>
        <m:t>·e(t)+</m:t>
      </m:r>
      <m:sSub>
        <m:sSubPr>
          <m:ctrlPr>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
          </m:ctrlPr>
        </m:sSubPr>
        <m:e>
          <m:r>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
            <m:t>K</m:t>
          </m:r>
        </m:e>
        <m:sub>
          <m:r>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
            <m:t>i</m:t>
          </m:r>
        </m:sub>
      </m:sSub>
      <m:nary>
        <m:naryPr>
          <m:limLoc m:val="subSup"/>
          <m:grow m:val="1"/>
          <m:ctrlPr>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
          </m:ctrlPr>
        </m:naryPr>
        <m:sub>
          <m:r>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
            <m:t>0</m:t>
          </m:r>
        </m:sub>
        <m:sup>
          <m:r>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
            <m:t>t</m:t>
          </m:r>
        </m:sup>
        <m:e>
          <m:r>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
            <m:t>e(τ)dτ</m:t>
          </m:r>
        </m:e>
      </m:nary>
      <m:r>
        <w:rPr>
          <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
        </w:rPr>
        <m:t>+</m:t>
      </m:r>
      <m:sSub>
        <m:sSubPr>
          <m:ctrlPr>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
          </m:ctrlPr>
        </m:sSubPr>
        <m:e>
          <m:r>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
            <m:t>K</m:t>
          </m:r>
        </m:e>
        <m:sub>
          <m:r>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
            <m:t>d</m:t>
          </m:r>
        </m:sub>
      </m:sSub>
      <m:r>
        <w:rPr>
          <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
        </w:rPr>
        <m:t>·</m:t>
      </m:r>
      <m:f>
        <m:fPr>
          <m:ctrlPr>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
          </m:ctrlPr>
        </m:fPr>
        <m:num>
          <m:r>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
            <m:t>de(t)</m:t>
          </m:r>
        </m:num>
        <m:den>
          <m:r>
            <w:rPr>
              <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
            </w:rPr>
            <m:t>dt</m:t>
          </m:r>
        </m:den>
      </m:f>
      <m:r>
        <w:rPr>
          <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>
        </w:rPr>
        <m:t>[1], [7]</m:t>
      </m:r>
    </m:oMath>
  </m:oMathPara>
</w:p>"""

new_p = parse_xml(new_p_xml)
p._p.getparent().replace(p._p, new_p)

doc.save(doc_path)
print("Updated P375 successfully!")

