with open('dashboard/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add handlers after handleTestDir
target_handler = """  const handleTestDir = (axis, dir) => {
    if (dataSource === 'mock') {
      mockEngineRef.current.jog(axis, dir * 1.0);
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.testDir(axis, dir);
    }
    alert('Đã phát xung Test DIR tốc độ chậm, dòng thấp để kiểm tra cực tính quay an toàn!');
  };"""

replacement_handler = """  const handleTestDir = (axis, dir) => {
    if (dataSource === 'mock') {
      mockEngineRef.current.jog(axis, dir * 1.0);
    } else if (dataSource === 'firebase') {
      firebaseServiceRef.current.testDir(axis, dir);
    }
    alert('Đã phát xung Test DIR tốc độ chậm, dòng thấp để kiểm tra cực tính quay an toàn!');
  };

  const handleTestSleep = () => {
    if (dataSource === 'firebase') {
      firebaseServiceRef.current.testSleep();
    }
    alert('Đã gửi lệnh [Test Ngủ]: Hệ thống sẽ Homing 2 trục rồi chuyển sang tư thế ngủ an toàn ngay lập tức (không ảnh hưởng giờ RTC).');
  };

  const handleTestWake = () => {
    if (dataSource === 'firebase') {
      firebaseServiceRef.current.testWake();
    }
    alert('Đã gửi lệnh [Test Wake Up]: Hệ thống sẽ Homing 2 trục rồi quay sang tư thế đón bình minh.');
  };

  const handleResumeReal = () => {
    if (dataSource === 'firebase') {
      firebaseServiceRef.current.resumeReal();
    }
    alert('Đã gửi lệnh [Quay về trạng thái thật]: Hệ thống sẽ Homing 2 trục rồi bám mặt trời thực tế theo giờ RTC.');
  };"""

assert target_handler in content, "target_handler not found"
content = content.replace(target_handler, replacement_handler)

# 2. Add props to ManualControlModal
target_modal = """        onTestDir={handleTestDir}
        motors={telemetry.motors}"""

replacement_modal = """        onTestDir={handleTestDir}
        onTestSleep={handleTestSleep}
        onTestWake={handleTestWake}
        onResumeReal={handleResumeReal}
        motors={telemetry.motors}"""

assert target_modal in content, "target_modal not found"
content = content.replace(target_modal, replacement_modal)

with open('dashboard/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("dashboard/src/App.jsx patched successfully.")

