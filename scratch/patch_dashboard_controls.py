# Patch firebaseService.js
with open('dashboard/src/services/firebaseService.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = """  async testDir(axis, direction = 1) {
    return this.sendCommand({ cmd: 'test_dir', axis, direction });
  }"""

replacement = """  async testDir(axis, direction = 1) {
    return this.sendCommand({ cmd: 'test_dir', axis, direction });
  }

  async testSleep() {
    return this.sendCommand({ cmd: 'test_sleep' });
  }

  async testWake() {
    return this.sendCommand({ cmd: 'test_wake' });
  }

  async resumeReal() {
    return this.sendCommand({ cmd: 'resume_real' });
  }"""

assert target in content, "target not found in firebaseService.js"
content = content.replace(target, replacement)
with open('dashboard/src/services/firebaseService.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("firebaseService.js patched successfully.")

