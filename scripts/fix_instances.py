with open(r"d:\DOANTOTNGHIEP\scripts\generate_schematics.py", "r", encoding="utf-8") as f:
    text = f.read()

# Fix instances path from sch_uuid to sym_uuid
text = text.replace('(path "/{sch_uuid}"', '(path "/{sym_uuid}"')

# Also ensure reference in instances has '1' if ref doesn't end with a digit
# In place_symbol:
old_place_sym = '''def place_symbol(ref, val, footprint, lib_id, x, y, angle=0):
    sym_uuid = uid()
    return f"""\t(symbol'''

new_place_sym = '''def place_symbol(ref, val, footprint, lib_id, x, y, angle=0):
    if not ref[-1].isdigit():
        ref = ref + "1"
    sym_uuid = uid()
    return f"""\t(symbol'''

text = text.replace(old_place_sym, new_place_sym)

with open(r"d:\DOANTOTNGHIEP\scripts\generate_schematics.py", "w", encoding="utf-8") as f:
    f.write(text)

print("Fixed instances in generate_schematics.py!")

