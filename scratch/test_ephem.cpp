#include <iostream>
#include "firmware/esp32_tracker_control/lib/solar_core/solar_ephemeris.h"
#include "firmware/esp32_tracker_control/lib/solar_core/solar_geometry.h"

int main() {
    solar::SolarPosition pos = solar::SolarEphemeris::calculate(2026, 11, 5, 17, 8, 30, 7.0, 10.78816, 106.66617);
    std::cout << "az: " << pos.azimuth_deg << "\n";
    std::cout << "el: " << pos.elevation_deg << "\n";
    std::cout << "is_daylight: " << pos.is_daylight << "\n";
    std::cout << "tracking_active: " << pos.tracking_active << "\n";
    
    solar::AxisTarget outAz, outEl;
    bool ok = solar::SolarGeometry::computeAxisTargets(pos, outAz, outEl, 180.0f, 50.0f);
    std::cout << "computeAxisTargets return: " << ok << "\n";
    std::cout << "outAz.final_ref_deg: " << outAz.final_ref_deg << "\n";
    std::cout << "outEl.final_ref_deg: " << outEl.final_ref_deg << "\n";
    return 0;
}

