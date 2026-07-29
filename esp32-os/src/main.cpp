#include <Arduino.h>
#include "Config.h"
#include "Kernel.h"
#include "VFS.h"
#include "Shell.h"
#include "WiFiSvc.h"
#include "Commands.h"

void printBanner() {
    Serial.println();
    Serial.println("  _____                       ____   _____ ");
    Serial.println(" | ____|  _ __    ___   _ __  / ___| | ____|");
    Serial.println(" |  _|   | '_ \\  / _ \\ | '__| \\___ \\ |  _|  ");
    Serial.println(" | |___  | |_) || (_) || |    ___) || |___ ");
    Serial.println(" |_____| | .__/  \\___/ |_|   |____/ |_____|");
    Serial.println("         |_|                                ");
    Serial.println();
    Serial.print(OS_NAME " v" OS_VERSION " - ");
    Serial.print(ESP.getChipModel());
    Serial.print(" @ ");
    Serial.print(ESP.getCpuFreqMHz());
    Serial.println(" MHz");
    Serial.print("Free heap: ");
    Serial.print(ESP.getFreeHeap());
    Serial.println(" B");
    Serial.println();
}

void runInitScript() {
    if (VFS_exists(INIT_RC_PATH)) {
        Serial.print("[boot] esecuzione di ");
        Serial.println(INIT_RC_PATH);
        String content;
        if (VFS_read(INIT_RC_PATH, content)) {
            char line[128];
            int pos = 0;
            for (size_t i = 0; i <= content.length(); i++) {
                char c = (i < content.length()) ? content[i] : '\n';
                if (c == '\n' || c == '\r') {
                    if (pos > 0) {
                        line[pos] = '\0';
                        Serial.print("# ");
                        Serial.println(line);
                        char* args[8];
                        int ac = 0;
                        char* p = line;
                        while (*p == ' ') p++;
                        while (*p && ac < 8) {
                            args[ac++] = p;
                            while (*p && *p != ' ') p++;
                            if (*p) { *p = '\0'; p++; }
                            while (*p == ' ') p++;
                        }
                        if (ac > 0) {
                            const Command* cmd = Shell_findCommand(args[0]);
                            if (cmd) cmd->handler(ac, args);
                        }
                        pos = 0;
                    }
                } else if (pos < 127) {
                    line[pos++] = c;
                }
            }
        }
        Serial.println("[boot] init.rc completato");
    } else {
        Serial.println("[boot] nessun " INIT_RC_PATH " trovato");
    }
}

void printMotd() {
    if (VFS_exists(MOTD_PATH)) {
        String motd;
        if (VFS_read(MOTD_PATH, motd)) {
            Serial.print(motd);
        }
    }
}

void setup() {
    Serial.begin(SERIAL_BAUD);
    delay(500);

    Kernel_init();
    Commands_initUptime();
    WiFiSvc_init();

    VFS_init();

    Shell_registerBuiltins();

    printBanner();

    runInitScript();
    printMotd();

    xTaskCreatePinnedToCore(
        Shell_task,
        "shell",
        8192,
        NULL,
        1,
        NULL,
        1
    );
}

void loop() {
    vTaskDelete(NULL);
}
