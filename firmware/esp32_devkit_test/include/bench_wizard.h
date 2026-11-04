#ifndef BENCH_WIZARD_H
#define BENCH_WIZARD_H

#include <Arduino.h>
#include "param_registry.h"
#include "calibration_store.h"

// Trạng thái vận hành của Bench Wizard
enum BenchState : uint8_t {
  BENCH_STATE_IDLE = 0,
  BENCH_STATE_RUNNING_STEP,
  BENCH_STATE_WAIT_CONFIRM,
  BENCH_STATE_ABORTED
};

// Kết quả kiểm chuẩn từng bước
enum StepStatus : uint8_t {
  STEP_STATUS_NOT_RUN = 0,
  STEP_STATUS_PASSED  = 1,
  STEP_STATUS_FAILED  = 2,
  STEP_STATUS_SKIPPED = 3
};

// Chế độ chạy của toàn hệ thống
enum SystemRunMode : uint8_t {
  MODE_BENCH     = 0, // Chế độ kiểm chuẩn từng bước qua Serial CLI
  MODE_OPERATION = 1  // Chế độ vận hành thực địa tự động (Solar Tracking)
};

#define TOTAL_BENCH_STEPS 16

struct BenchStepDef {
  uint8_t    id;                           // 0 .. 15
  char       code[8];                      // "B0" .. "B15"
  char       name[36];                     // Tên bước
  char       description[64];              // Mô tả mục tiêu
  bool       is_critical;                  // Bắt buộc PASS mới cho phép ARM
  StepStatus status;                       // Trạng thái hiện tại
  float      measured_val;                 // Giá trị đo được
  float      proposed_val;                 // Giá trị đề xuất ghi NVS
  char       unit[12];                     // Đơn vị
  char       target_param[PARAM_MAX_NAME_LEN]; // Tên tham số tương ứng trong ParamRegistry
  char       notes[48];                    // Ghi chú chi tiết kết quả
};

class BenchWizardClass {
public:
  void begin();

  // Non-blocking update loop (gọi trong loop() chính)
  void update();

  // Khởi động 1 bước kiểm chuẩn cụ thể (0 .. 15)
  bool startStep(int stepId);

  // Khởi động chạy toàn bộ quy trình kiểm chuẩn từ B0 đến B15
  bool startAll();

  // Tiếp nhận xác nhận từ người dùng ([Y] đồng ý ghi NVS / [N] bỏ qua)
  void confirm(bool accept);

  // Dừng khẩn cấp và hủy ngay lập tức bước đang chạy (<50ms)
  void abort(const char* reason = "Nguoi dung dung khan cap (E-Stop)");

  // In bảng tổng hợp kết quả 16 bước kiểm chuẩn ra Serial
  void printStatus() const;

  // Kiểm tra điều kiện Gating: Toàn bộ các bước Critical đã PASS chưa?
  bool isGatingPassed() const;

  // Trả về chuỗi danh sách các bước Critical chưa hoàn thành
  String getMissingCriticalSteps() const;

  // Kiểm tra Bench có đang bận chạy hay không
  bool isBusy() const { return _state != BENCH_STATE_IDLE; }

  // Trạng thái hiện tại
  BenchState getState() const { return _state; }
  int getCurrentStepId() const { return _currentStepIdx; }

  // Quản lý Chế độ Vận hành (OPERATION GATING)
  SystemRunMode getSystemMode() const { return _systemMode; }
  bool setSystemMode(SystemRunMode mode);
  bool isArmed() const { return _isArmed; }
  bool arm();
  void disarm();

  // Kiểm tra kẹt động cơ thời gian thực (Real-time Stall Detection)
  bool checkStall(int axis, int32_t commandedPulses, int32_t encoderPulses);

private:
  BenchState    _state = BENCH_STATE_IDLE;
  SystemRunMode _systemMode = MODE_BENCH;
  bool          _isArmed = false;
  int           _currentStepIdx = -1;
  bool          _runAllMode = false;
  uint8_t       _subState = 0;
  unsigned long _stepTimer = 0;
  unsigned long _subTimer = 0;

  BenchStepDef  _steps[TOTAL_BENCH_STEPS];

  // Helper thực thi từng bước (Non-blocking sub-state machine)
  void executeB0();
  void executeB1();
  void executeB2();
  void executeB3();
  void executeB4();
  void executeB5();
  void executeB6();
  void executeB7();
  void executeB8();
  void executeB9();
  void executeB10();
  void executeB11();
  void executeB12();
  void executeB13();
  void executeB14();
  void executeB15();

  void finishStep(StepStatus status, float measuredVal, float proposedVal, const char* notes);
  void promptConfirm();
};

extern BenchWizardClass BenchWizard;

#endif // BENCH_WIZARD_H
