/**
 * @file test_pcnt_quadrature.cpp
 * @brief Unit test native mô phỏng phần cứng PCNT ESP32-S3 và so sánh với bộ đếm phần mềm (Lookup Table 4X).
 * Kiểm tra 2400 xung/vòng (600 PPR * 4) cho cả chiều quay thuận và chiều quay nghịch.
 */

#include <iostream>
#include <vector>
#include <cassert>
#include <iomanip>

// Định nghĩa các chế độ đếm PCNT tương đương ESP-IDF <driver/pcnt.h>
enum pcnt_count_mode_t {
    PCNT_COUNT_DIS = 0,
    PCNT_COUNT_INC = 1,
    PCNT_COUNT_DEC = 2
};

enum pcnt_ctrl_mode_t {
    PCNT_MODE_KEEP = 0,
    PCNT_MODE_REVERSE = 1,
    PCNT_MODE_DISABLE = 2
};

struct PcntChannelConfig {
    pcnt_count_mode_t pos_mode;
    pcnt_count_mode_t neg_mode;
    pcnt_ctrl_mode_t  hctrl_mode;
    pcnt_ctrl_mode_t  lctrl_mode;
};

// Hàm mô phỏng hành vi 1 kênh phần cứng PCNT khi có cạnh xung tại chân pulse_pin
int evaluatePcntChannel(const PcntChannelConfig& cfg, int old_pulse, int new_pulse, int ctrl_val) {
    if (old_pulse == new_pulse) return 0; // Không có cạnh trên chân pulse

    // Xác định hành vi cơ bản theo cạnh Lên (pos) hay cạnh Xuống (neg)
    pcnt_count_mode_t action = (new_pulse > old_pulse) ? cfg.pos_mode : cfg.neg_mode;
    if (action == PCNT_COUNT_DIS) return 0;

    // Xác định hành vi điều khiển theo mức của chân ctrl (High hay Low)
    pcnt_ctrl_mode_t ctrl = ctrl_val ? cfg.hctrl_mode : cfg.lctrl_mode;
    if (ctrl == PCNT_MODE_DISABLE) return 0;

    int delta = (action == PCNT_COUNT_INC) ? +1 : -1;
    if (ctrl == PCNT_MODE_REVERSE) {
        delta = -delta;
    }
    return delta;
}

// Bảng tra trạng thái giải mã 4X phần mềm (Lookup Table 16 phần tử)
const int8_t ENC_STATES[16] = {0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0};

int evaluateSwLookup(uint8_t& oldState, int newA, int newB) {
    oldState = ((oldState << 2) | ((newA << 1) | newB)) & 0x0F;
    return ENC_STATES[oldState];
}

int main() {
    std::cout << "=================================================================\n";
    std::cout << "  UNIT TEST NATIVE: MO PHONG GIAI MA ENCODER 4X ESP32-S3 PCNT   \n";
    std::cout << "=================================================================\n";

    // 1. Cấu hình Kênh 0:
    // Pulse = Pin A, Ctrl = Pin B
    // lctrl = REVERSE, hctrl = KEEP, pos = DEC, neg = INC
    PcntChannelConfig ch0 = {
        .pos_mode   = PCNT_COUNT_DEC,
        .neg_mode   = PCNT_COUNT_INC,
        .hctrl_mode = PCNT_MODE_KEEP,
        .lctrl_mode = PCNT_MODE_REVERSE
    };

    // 2. Cấu hình Kênh 1 ĐÃ SỬA CHUẨN:
    // Pulse = Pin B, Ctrl = Pin A
    // lctrl = REVERSE, hctrl = KEEP, pos = INC, neg = DEC
    PcntChannelConfig ch1_fixed = {
        .pos_mode   = PCNT_COUNT_INC,
        .neg_mode   = PCNT_COUNT_DEC,
        .hctrl_mode = PCNT_MODE_KEEP,
        .lctrl_mode = PCNT_MODE_REVERSE
    };

    // 3. Cấu hình Kênh 1 CŨ BỊ LỖI (Để chứng minh hiện tượng triệt tiêu 0/-1):
    // lctrl = KEEP, hctrl = REVERSE, pos = INC, neg = DEC
    PcntChannelConfig ch1_faulty = {
        .pos_mode   = PCNT_COUNT_INC,
        .neg_mode   = PCNT_COUNT_DEC,
        .hctrl_mode = PCNT_MODE_REVERSE,
        .lctrl_mode = PCNT_MODE_KEEP
    };

    std::cout << "\n[TEST 1] PHAN TICH NGUYEN NHAN LOI TREN CAU HINH CU:\n";
    {
        // 4 bước quay thuận cơ bản: (0,0) -> (1,0) -> (1,1) -> (0,1) -> (0,0)
        struct Step { int a, b; };
        std::vector<Step> seq = {{0,0}, {1,0}, {1,1}, {0,1}, {0,0}};
        int faulty_count = 0;
        int prevA = 0, prevB = 0;

        for (size_t i = 1; i < seq.size(); ++i) {
            int curA = seq[i].a, curB = seq[i].b;
            int d0 = evaluatePcntChannel(ch0, prevA, curA, curB);
            int d1 = evaluatePcntChannel(ch1_faulty, prevB, curB, curA);
            faulty_count += (d0 + d1);
            std::cout << "  Canh " << i << ": A=" << curA << " B=" << curB 
                      << " -> Ch0=" << std::showpos << d0 << " Ch1=" << d1 
                      << " => Tong net=" << (d0 + d1) 
                      << " (Tich luy Count = " << faulty_count << ")" << std::noshowpos << "\n";
            prevA = curA; prevB = curB;
        }
        std::cout << "  ==> KET QUA CAU HINH CU: Ch0 va Ch1 triet tieu nhau lien tuc (+1, -1, +1, -1).\n";
        std::cout << "      Gia tri Count bi giam giua 0 va 1 (hoac 0 va -1) du truc quay lien tuc!\n";
        assert(faulty_count == 0);
    }

    std::cout << "\n[TEST 2] MO PHONG CHIEU THUAN (FORWARD) 1 VONG = 2400 COUNTS (600 PPR * 4):\n";
    {
        int curA = 0, curB = 0;
        int hw_count = 0;
        int sw_count = 0;
        uint8_t swState = 0;
        const int TOTAL_CYCLES = 600; // 600 chu kỳ quang * 4 cạnh = 2400 counts

        for (int c = 0; c < TOTAL_CYCLES; ++c) {
            // Bước 1: A lên 1, B giữ 0
            {
                int nextA = 1, nextB = 0;
                int d0 = evaluatePcntChannel(ch0, curA, nextA, nextB);
                int d1 = evaluatePcntChannel(ch1_fixed, curB, nextB, nextA);
                int d_sw = evaluateSwLookup(swState, nextA, nextB);
                assert(d0 == +1 && d1 == 0);
                assert(d_sw == +1);
                hw_count += (d0 + d1);
                sw_count += d_sw;
                curA = nextA; curB = nextB;
            }
            // Bước 2: A giữ 1, B lên 1
            {
                int nextA = 1, nextB = 1;
                int d0 = evaluatePcntChannel(ch0, curA, nextA, nextB);
                int d1 = evaluatePcntChannel(ch1_fixed, curB, nextB, nextA);
                int d_sw = evaluateSwLookup(swState, nextA, nextB);
                assert(d0 == 0 && d1 == +1);
                assert(d_sw == +1);
                hw_count += (d0 + d1);
                sw_count += d_sw;
                curA = nextA; curB = nextB;
            }
            // Bước 3: A xuống 0, B giữ 1
            {
                int nextA = 0, nextB = 1;
                int d0 = evaluatePcntChannel(ch0, curA, nextA, nextB);
                int d1 = evaluatePcntChannel(ch1_fixed, curB, nextB, nextA);
                int d_sw = evaluateSwLookup(swState, nextA, nextB);
                assert(d0 == +1 && d1 == 0);
                assert(d_sw == +1);
                hw_count += (d0 + d1);
                sw_count += d_sw;
                curA = nextA; curB = nextB;
            }
            // Bước 4: A giữ 0, B xuống 0
            {
                int nextA = 0, nextB = 0;
                int d0 = evaluatePcntChannel(ch0, curA, nextA, nextB);
                int d1 = evaluatePcntChannel(ch1_fixed, curB, nextB, nextA);
                int d_sw = evaluateSwLookup(swState, nextA, nextB);
                assert(d0 == 0 && d1 == +1);
                assert(d_sw == +1);
                hw_count += (d0 + d1);
                sw_count += d_sw;
                curA = nextA; curB = nextB;
            }
        }

        std::cout << "  -> So xung dem phan cung PCNT (HW): " << hw_count << " / 2400\n";
        std::cout << "  -> So xung dem bang tra SW (Lookup): " << sw_count << " / 2400\n";
        assert(hw_count == 2400);
        assert(sw_count == 2400);
        assert(hw_count == sw_count);
        std::cout << "  ==> [PASS] Chieu thuan 2400 counts: HW va SW hoan toan khop nhau!\n";
    }

    std::cout << "\n[TEST 3] MO PHONG CHIEU NGHICH (REVERSE) 1 VONG = -2400 COUNTS (600 PPR * 4):\n";
    {
        int curA = 0, curB = 0;
        int hw_count = 0;
        int sw_count = 0;
        uint8_t swState = 0;
        const int TOTAL_CYCLES = 600;

        for (int c = 0; c < TOTAL_CYCLES; ++c) {
            // Bước 1: B lên 1, A giữ 0
            {
                int nextA = 0, nextB = 1;
                int d0 = evaluatePcntChannel(ch0, curA, nextA, nextB);
                int d1 = evaluatePcntChannel(ch1_fixed, curB, nextB, nextA);
                int d_sw = evaluateSwLookup(swState, nextA, nextB);
                assert(d0 == 0 && d1 == -1);
                assert(d_sw == -1);
                hw_count += (d0 + d1);
                sw_count += d_sw;
                curA = nextA; curB = nextB;
            }
            // Bước 2: B giữ 1, A lên 1
            {
                int nextA = 1, nextB = 1;
                int d0 = evaluatePcntChannel(ch0, curA, nextA, nextB);
                int d1 = evaluatePcntChannel(ch1_fixed, curB, nextB, nextA);
                int d_sw = evaluateSwLookup(swState, nextA, nextB);
                assert(d0 == -1 && d1 == 0);
                assert(d_sw == -1);
                hw_count += (d0 + d1);
                sw_count += d_sw;
                curA = nextA; curB = nextB;
            }
            // Bước 3: B xuống 0, A giữ 1
            {
                int nextA = 1, nextB = 0;
                int d0 = evaluatePcntChannel(ch0, curA, nextA, nextB);
                int d1 = evaluatePcntChannel(ch1_fixed, curB, nextB, nextA);
                int d_sw = evaluateSwLookup(swState, nextA, nextB);
                assert(d0 == 0 && d1 == -1);
                assert(d_sw == -1);
                hw_count += (d0 + d1);
                sw_count += d_sw;
                curA = nextA; curB = nextB;
            }
            // Bước 4: B giữ 0, A xuống 0
            {
                int nextA = 0, nextB = 0;
                int d0 = evaluatePcntChannel(ch0, curA, nextA, nextB);
                int d1 = evaluatePcntChannel(ch1_fixed, curB, nextB, nextA);
                int d_sw = evaluateSwLookup(swState, nextA, nextB);
                assert(d0 == -1 && d1 == 0);
                assert(d_sw == -1);
                hw_count += (d0 + d1);
                sw_count += d_sw;
                curA = nextA; curB = nextB;
            }
        }

        std::cout << "  -> So xung dem phan cung PCNT (HW): " << hw_count << " / -2400\n";
        std::cout << "  -> So xung dem bang tra SW (Lookup): " << sw_count << " / -2400\n";
        assert(hw_count == -2400);
        assert(sw_count == -2400);
        assert(hw_count == sw_count);
        std::cout << "  ==> [PASS] Chieu nghich -2400 counts: HW va SW hoan toan khop nhau!\n";
    }

    std::cout << "\n=================================================================\n";
    std::cout << "  TAT CA CAC UNIT TEST NATIVE CHO PCNT 4X DEU DA THANH CONG (100%)!\n";
    std::cout << "=================================================================\n";
    return 0;
}
