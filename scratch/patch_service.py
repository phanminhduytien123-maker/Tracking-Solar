with open('dashboard/src/services/firebaseService.js', 'r', encoding='utf-8') as f:
    c = f.read()

old_str = "displayState = (tracking.displayState && tracking.displayState.includes('GÓC MAX')) ? tracking.displayState : 'GÓC MAX (GIỮ ĐẾN 18H)';"
new_str = "displayState = (tracking.displayState && tracking.displayState.includes('GÓC MAX')) ? tracking.displayState.replace(/19H/gi, '18H') : 'GÓC MAX (GIỮ ĐẾN 18H)';"

if old_str in c:
    c = c.replace(old_str, new_str)
    with open('dashboard/src/services/firebaseService.js', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Success updating firebaseService.js")
else:
    print("old_str not found in firebaseService.js")

