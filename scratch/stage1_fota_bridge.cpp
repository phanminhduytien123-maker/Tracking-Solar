#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>
#include <WiFiClientSecure.h>

const char* ssid = "Tyny";
const char* pass = "11860868";

// Link firmware final v2.1.2 tren Fastly CDN (khong redirect, sieu toc)
const char* FINAL_FIRMWARE_URL = "https://raw.githubusercontent.com/phanminhduytien123-maker/Tracking-Solar/refs/heads/Backup_4_11/firmware/esp32_devkit_test/firmware.bin";

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=======================================================");
  Serial.println(">> [STAGE 1 FOTA BRIDGE] DA BOOT VAO CAU NOI FOTA NHẸ!");
  Serial.println("=======================================================");

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(ssid, pass);

  Serial.printf(">> Ket noi WiFi: %s ...\n", ssid);
  unsigned long startWifi = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startWifi < 25000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n[!] Khong ket noi duoc WiFi -> Reboot!");
    ESP.restart();
  }

  Serial.printf("\n>> [WIFI OK] IP: %s! Bat dau nap Firmware Final v2.1.2...\n", WiFi.localIP().toString().c_str());

  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  httpUpdate.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  httpUpdate.rebootOnUpdate(true); // Tu dong reboot khi flash xong 100% v2.1.2!

  httpUpdate.onProgress([](size_t current, size_t total) {
    if (total > 0) {
      int pct = (int)((current * 100) / total);
      Serial.printf(">> [STAGE 1 -> V2.1.2] Ghi Flash: %d%% (%u / %u bytes)\n", pct, (unsigned)current, (unsigned)total);
    }
  });

  t_httpUpdate_return ret = httpUpdate.update(secureClient, FINAL_FIRMWARE_URL);
  if (ret != HTTP_UPDATE_OK) {
    Serial.printf(">> [STAGE 1 ERROR] Loi: %s -> Thu lai sau 3s...\n", httpUpdate.getLastErrorString().c_str());
    delay(3000);
    ESP.restart();
  }
}

void loop() {
  delay(1000);
}

