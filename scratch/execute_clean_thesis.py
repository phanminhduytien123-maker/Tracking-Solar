import docx
import shutil
import re

SRC = "HK1_2627_DATN_Phan Minh Duy Tiến_42200522_Võ Hồng Phát_42200545.docx"
TEMP_OUT = "scratch/cleaned_thesis_temp.docx"

doc = docx.Document(SRC)

# Track changes
deleted_paras = []
modified_paras = []

simple_replacements = [
    ("(a practical 30-day testing cycle)", ""),
    ("Pin năng lượng mặt trời (Solar Cell hay Photovoltaic Cell - PV Cell) là thiết bị bán dẫn có khả năng chuyển đổi trực tiếp năng lượng từ bức xạ mặt trời thành điện năng thông qua hiệu ứng quang điện (Photovoltaic Effect).",
     "Pin năng lượng mặt trời là thiết bị bán dẫn có khả năng chuyển đổi trực tiếp năng lượng từ bức xạ mặt trời thành điện năng thông qua hiệu ứng quang điện."),
    ("(Solar Array)", ""),
    ("(front cover)", ""),
    ("(antireflective coating)", ""),
    ("(back material)", ""),
    ("(Interrupt overhead)", "tải ngắt"),
    ("(Holding Torque)", ""),
    ("(Semi-Flow / Idle Current Reduction)", ""),
    ("theo công nghệ Semi-flow của nhà sản xuất [12]", "theo thiết kế tiêu chuẩn [12]"),
    ("(Missed Steps)", ""),
    ("(Open-loop Control)", ""),
    ("(Closed-loop Feedback)", ""),
    ("(Quadrature Signals)", ""),
    ("(Light Dependent Resistor)", ""),
    ("của hãng Vishay Semiconductors ", ""),
    ("(Collector Light Current)", ""),
    ("(Illuminance)", ""),
    ("(Top, Bottom, Left, Right)", "(trên, dưới, trái, phải)"),
    ("(Multiplication Engine)", ""),
    ("(Zero drift)", ""),
    ("(TCXO - Temperature-Compensated Crystal Oscillator)", "(TCXO)"),
    ("(Solar Constant)", ""),
    ("(Julian Day - JD)", "(JD)"),
    ("(Equation of Time - EOT)", "(EOT)"),
    ("(Hour Angle - ω)", "(ω)"),
    ("(Fuzzy Rule Base)", ""),
    ("(Fuzzy Inference Engine)", ""),
    ("(NB - Negative Big), (NM - Negative Medium), (NS - Negative Small), (ZE - Zero), (PS - Positive Small), (PM - Positive Medium), (PB - Positive Big)",
     "NB (âm lớn), NM (âm vừa), NS (âm nhỏ), ZE (không), PS (dương nhỏ), PM (dương vừa), PB (dương lớn)"),
    ("(Membership Functions)", ""),
    ("dạng Mamdani (If - Then)", "(If - Then)"),
    ("(Centroid / Center of Gravity Method)", "(Centroid)"),
    ("thử - sai (Trial and Error)", "thử - sai"),
    ("tối ưu toàn cục (Global Optimum)", "tối ưu toàn cục"),
    ("(Particle Swarm Optimization - PSO) [8]", "(PSO) [8]"),
    ("trọng số quán tính (Inertia Weight)", "trọng số quán tính"),
    ("hệ số học tập nhận thức (Cognitive parameter)", "hệ số học tập nhận thức"),
    ("hệ số học tập xã hội (Social parameter)", "hệ số học tập xã hội"),
    ("(ITAE - Integral of Time-weighted Absolute Error)", "(ITAE)"),
    ("(Maximum Power Point - MPP)", "(MPP)"),
    ("Tham khảo công trình nghiên cứu thực nghiệm chuẩn mực của nhóm tác giả Marcos Ponce-Jara và cộng sự công bố trên tạp chí khoa học quốc tế Sustainability (MDPI, 2022) [5], việc thu thập đồng thời hai đại lượng giới hạn điện áp hở mạch (Voc - Open-Circuit Voltage) và dòng điện ngắn mạch (Isc - Short-Circuit Current)",
     "Theo các nghiên cứu thực nghiệm [5], việc thu thập đồng thời hai đại lượng giới hạn điện áp hở mạch (Voc) và dòng điện ngắn mạch (Isc)"),
    ("(Limit Switches)", ""),
    ("(Wind Load Torque)", ""),
    ("(MCU Freeze / Hang)", ""),
    ("(Inrush Current)", ""),
    ("(Inductive Voltage Spikes)", ""),
    ("(Dual Isolated Power Architecture)", ""),
    ("(Power Supply Branch)", ""),
    ("(Autonomous Control & Sensing Branch)", ""),
    ("(Star Topology Grounding)", ""),
    ("(Ground Loops)", ""),
    ("(Bottom Layer)", ""),
    ("(Top Layer)", ""),
    ("(Solid Ground Plane)", ""),
    ("(Ground Stitching Vias)", ""),
    ("(DRC - Design Rule Check)", "(DRC)"),
    ("Bám sát quy chuẩn đo đạc thực nghiệm khoa học quốc tế của tạp chí MDPI Sustainability (Ponce-Jara et al., 2022) [5]",
     "Theo chuẩn đo đạc thực nghiệm [5]"),
    ("(State Machine)", ""),
    ("(Normally Closed)", "(NC)"),
    ("(Non-blocking Finite State Machine - FSM)", "(FSM)"),
    ("(S-Curve Profile)", ""),
    ("(Hybrid Dual-Mode Tracking)", ""),
    ("(Astronomical Mode)", ""),
    ("(Optical Differential Tracking)", ""),
    ("giới hạn mềm phần mềm (Soft Limits)", "giới hạn mềm phần mềm"),
    ("(Soft Limits)", ""),
    ("(Smart Dual-Axis Solar Tracker)", ""),
    ("(Fixed Panel)", ""),
    ("(Equation of Time)", "(EOT)"),
    ("(Offline Queue)", ""),
    ("(Power Curve Comparison)", ""),
    ("(Cumulative Energy Wh)", ""),
    ("(Tracker Gain Percentage)", ""),
    ("(Parasitic Energy Consumption)", ""),
    ("(Net Energy Gain)", ""),
    ("(AI/ML Solar Forecasting)", ""),
    ("(Conformal Coating)", ""),
    ("(Smart Solar Farm)", ""),
]

paragraphs_to_remove = []

for i, p in enumerate(doc.paragraphs):
    text = p.text.strip()
    if text.startswith("Ghi chú: Toàn bộ hồ sơ thiết kế mạch in PCB") or \
       text.startswith("*(Ghi chú: Chu kỳ đo đạc thực nghiệm đối chứng 30 ngày"):
        paragraphs_to_remove.append(p)
        continue
    
    if "Personal Best" in text:
        for r in p.runs:
            if "(vị trí tốt nhất cá nhân - Personal Best pbest" in r.text:
                r.text = r.text.replace("(vị trí tốt nhất cá nhân - Personal Best pbest", "(vị trí tốt nhất cá nhân pbest")
            if "(vị trí tốt nhất toàn cục - Global Best gbest)" in r.text:
                r.text = r.text.replace("(vị trí tốt nhất toàn cục - Global Best gbest)", "(vị trí tốt nhất toàn bầy gbest)")
        modified_paras.append(i)
        continue

    if "Clerc & Kennedy" in text:
        for r in p.runs:
            if "tuân thủ tiêu chuẩn hội tụ Clerc & Kennedy." in r.text:
                r.text = r.text.replace("tuân thủ tiêu chuẩn hội tụ Clerc & Kennedy.", "đảm bảo tính ổn định và hội tụ của thuật toán.")
        modified_paras.append(i)
        continue

    if "Fitness Function" in text or "Overshoot Penalty" in text:
        for r in p.runs:
            if "Hàm mục tiêu chi phí (Fitness Function) được thiết kế kết hợp giữa tiêu chuẩn tích phân sai số nhân thời gian (ITAE) và hàm phạt hiện tượng vọt lố (Overshoot Penalty)" in r.text:
                r.text = r.text.replace("Hàm mục tiêu chi phí (Fitness Function) được thiết kế kết hợp giữa tiêu chuẩn tích phân sai số nhân thời gian (ITAE) và hàm phạt hiện tượng vọt lố (Overshoot Penalty)",
                                        "Hàm mục tiêu chi phí được thiết kế kết hợp giữa tiêu chuẩn tích phân sai số nhân thời gian (ITAE) và hàm phạt hiện tượng vọt lố")
        modified_paras.append(i)
        continue

    if "Mamdani" in text:
        for r in p.runs:
            if "cho bộ luật suy luận mờ 49 luật Mamdani." in r.text:
                r.text = r.text.replace("cho bộ luật suy luận mờ 49 luật Mamdani.", "cho ma trận 49 luật hợp thành mờ.")
            elif "dạng Mamdani " in r.text:
                r.text = r.text.replace("dạng Mamdani ", "")
        modified_paras.append(i)
        continue

    if "Anti-windup" in text:
        for r in p.runs:
            if "(Anti-windup)" in r.text:
                r.text = r.text.replace("(Anti-windup)", "chống bão hòa")
        modified_paras.append(i)
        continue

    if "Hunting" in text:
        for r in p.runs:
            if "hiện tượng rung lắc giật cục (Hunting)" in r.text:
                r.text = r.text.replace("hiện tượng rung lắc giật cục (Hunting)", "hiện tượng rung lắc")
        modified_paras.append(i)
        continue

    changed = False
    for old_str, new_str in simple_replacements:
        if old_str in p.text:
            if len(p.runs) == 1:
                p.runs[0].text = p.runs[0].text.replace(old_str, new_str)
                changed = True
            else:
                for r in p.runs:
                    if old_str in r.text:
                        r.text = r.text.replace(old_str, new_str)
                        changed = True
                        break
                else:
                    if not any(r.font.subscript for r in p.runs):
                        p.text = p.text.replace(old_str, new_str)
                        changed = True
    
    if changed:
        for r in p.runs:
            r.text = re.sub(r'  +', ' ', r.text)
            r.text = r.text.replace(" :", ":").replace(" ,", ",").replace(" .", ".").replace(" )", ")").replace("( ", "(")
        modified_paras.append(i)

# Clean Table 6 header
for table in doc.tables:
    for row in table.rows:
        for cell in row.cells:
            if "Phương thức kết nối / Ghi chú" in cell.text:
                cell.text = cell.text.replace("Phương thức kết nối / Ghi chú", "Phương thức kết nối / Đặc tả kỹ thuật")

# Delete marked paragraphs
for p in paragraphs_to_remove:
    p._element.getparent().remove(p._element)

print(f"\nDone! Modified {len(modified_paras)} paragraphs, deleted {len(paragraphs_to_remove)} paragraphs.")
doc.save(TEMP_OUT)
print(f"Saved changes successfully to {TEMP_OUT}")
