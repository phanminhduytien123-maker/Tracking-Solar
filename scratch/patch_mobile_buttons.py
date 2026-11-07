with open('dashboard/src/components/VisualPanelsComparison.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = '  isAdmin = false,'
replacement1 = '  isAdmin = true,'
assert target1 in text, 'target1 not found'
text = text.replace(target1, replacement1, 1)

target2 = '<div className="flex flex-wrap items-center gap-1.5 sm:gap-2">'
replacement2 = '<div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto mt-1 sm:mt-0 justify-start sm:justify-end">'
assert target2 in text, 'target2 not found'
text = text.replace(target2, replacement2, 1)

with open('dashboard/src/components/VisualPanelsComparison.jsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated VisualPanelsComparison.jsx successfully')

