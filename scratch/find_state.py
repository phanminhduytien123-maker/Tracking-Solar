with open('firmware/esp32_devkit_test/src/main.cpp', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'set("state"' in line or 'state_str' in line or 'stateStr' in line:
            print(f'{i+1}: {line.strip()}')

