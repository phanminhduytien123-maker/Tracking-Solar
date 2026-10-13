/**
 * @file test_phase0.cpp
 * @brief Kiểm thử cơ bản cho Phase 0: Kiểm tra tính toàn vẹn của config, types và interfaces
 */

#include <iostream>
#include <cassert>
#include <cmath>
#include "solar_config.h"
#include "solar_types.h"
#include "solar_interfaces.h"
#include "hal_interfaces.h"

// Mock TelemetrySink để test
class MockTelemetrySink : public solar::ITelemetrySink {
public:
    int packetCount = 0;
    bool pushTelemetry(const solar::TelemetryPacket& packet) override {
        (void)packet;
        packetCount++;
        return true;
    }
    bool isReady() const override { return true; }
};

// Mock CommandSource để test
class MockCommandSource : public solar::ICommandSource {
public:
    bool pollCommand(solar::CommandPacket& outCmd) override {
        (void)outCmd;
        return false;
    }
    bool isEstopTriggered() const override { return false; }
};

int main() {
    std::cout << "[PHASE 0 TEST] Bat dau kiem tra tinh toan ven cau truc..." << std::endl;

    // 1. Kiem tra ty so truyen va he so co ban
    assert(CFG_C_GEAR_RATIO_AZ == 3.0f);
    assert(CFG_D_GEAR_RATIO_EL == 3.0f);
    assert(CFG_E_PULSES_PER_REV_MOTOR > 0.0f);
    assert(CFG_F_ENCODER_PPR > 0.0f);

    // 2. Kiem tra cua so ngu dem hop le
    assert(CFG_NIGHT_SLEEP_START_HOUR == 19);
    assert(CFG_NIGHT_SLEEP_END_HOUR == 3);

    // 3. Kiem tra nguong quang hoc Hysteresis (X < Y)
    assert(CFG_X_T_DARK_THRESHOLD < CFG_Y_T_BRIGHT_THRESHOLD);

    // 4. Kiem tra Mock Sink & Command
    MockTelemetrySink sink;
    MockCommandSource source;
    solar::TelemetryPacket pkt = {};
    pkt.state = solar::TrackerState::IDLE;
    pkt.control_mode = solar::ControlMode::PSO_FUZZY_PID;

    assert(sink.pushTelemetry(pkt));
    assert(sink.packetCount == 1);
    assert(!source.isEstopTriggered());

    // 5. Kiem tra bitmask loi
    solar::FaultFlag faults = solar::FaultFlag::NONE;
    faults = faults | solar::FaultFlag::STEP_LOSS_AZ;
    assert(solar::hasFault(faults, solar::FaultFlag::STEP_LOSS_AZ));
    assert(!solar::hasFault(faults, solar::FaultFlag::STEP_LOSS_EL));

    std::cout << "[PHASE 0 TEST] Tat ca kiem tra co ban PASS 100%!" << std::endl;
    return 0;
}
