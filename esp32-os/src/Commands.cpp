#include "Commands.h"
#include "Config.h"
#include "Kernel.h"
#include "VFS.h"
#include "WiFiSvc.h"
#include "Shell.h"
#include <esp_system.h>
#include <esp_chip_info.h>
#include <esp_mac.h>
#include <esp_timer.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

static uint32_t bootTime = 0;

void Commands_registerAll() {
    Shell_registerCommand("help",       "Lista comandi",                    Cmd_help);
    Shell_registerCommand("uname",      "Nome e versione OS",              Cmd_uname);
    Shell_registerCommand("sysinfo",    "Info hardware",                    Cmd_sysinfo);
    Shell_registerCommand("uptime",     "Tempo dall'accensione",           Cmd_uptime);
    Shell_registerCommand("free",       "Utilizzo memoria",                 Cmd_free);
    Shell_registerCommand("reboot",     "Riavvia il sistema",              Cmd_reboot);
    Shell_registerCommand("clear",      "Pulisce terminale",                Cmd_clear);
    Shell_registerCommand("echo",       "Stampa testo",                     Cmd_echo);
    Shell_registerCommand("ps",         "Lista task",                       Cmd_ps);
    Shell_registerCommand("kill",       "Termina task",                     Cmd_kill);
    Shell_registerCommand("blink",      "Avvia task blink LED",             Cmd_blink);
    Shell_registerCommand("ls",         "Elenca directory",                 Cmd_ls);
    Shell_registerCommand("cd",         "Cambia directory",                 Cmd_cd);
    Shell_registerCommand("pwd",        "Directory corrente",               Cmd_pwd);
    Shell_registerCommand("cat",        "Legge file",                       Cmd_cat);
    Shell_registerCommand("write",      "Scrive file",                      Cmd_write);
    Shell_registerCommand("append",     "Aggiunge a file",                  Cmd_append);
    Shell_registerCommand("rm",         "Cancella file",                    Cmd_rm);
    Shell_registerCommand("mkdir",      "Crea directory",                   Cmd_mkdir);
    Shell_registerCommand("rmdir",      "Rimuove directory",                Cmd_rmdir);
    Shell_registerCommand("df",         "Spazio filesystem",                Cmd_df);
    Shell_registerCommand("run",        "Esegue script",                    Cmd_run);
    Shell_registerCommand("wifi",       "Gestione WiFi",                    Cmd_wifi);
}

void Commands_initUptime() {
    bootTime = millis();
}

static void blinkTask(void* param) {
    int pin = (int)(intptr_t)param;
    pinMode(pin, OUTPUT);
    while (true) {
        digitalWrite(pin, HIGH);
        delay(500);
        digitalWrite(pin, LOW);
        delay(500);
    }
}

void Cmd_help(int argc, char** argv) {
    Serial.println("Comandi disponibili:");
    Serial.println("  help, uname, sysinfo, uptime, free");
    Serial.println("  reboot, clear, echo <testo>");
    Serial.println("  ps, kill <nome>, blink <pin>");
    Serial.println("  ls, cd, pwd, cat, write, append, rm, mkdir, rmdir, df");
    Serial.println("  run <script>, wifi <scan|connect|status|disconnect>");
}

void Cmd_uname(int argc, char** argv) {
    Serial.print(OS_NAME " v" OS_VERSION " (");
    Serial.print(esp_get_idf_version());
    Serial.println(")");
}

void Cmd_sysinfo(int argc, char** argv) {
    esp_chip_info_t info;
    esp_chip_info(&info);

    Serial.print("Chip:       ESP32-S3 (rev ");
    Serial.print(info.revision);
    Serial.println(")");

    Serial.print("Core:       ");
    Serial.println(info.cores);

    Serial.print("Freq CPU:   ");
    Serial.print(ESP.getCpuFreqMHz());
    Serial.println(" MHz");

    Serial.print("Flash:      ");
    Serial.print(ESP.getFlashChipSize() / 1024 / 1024);
    Serial.println(" MB");

    uint8_t mac[8];
    esp_efuse_mac_get_default(mac);
    char macStr[18];
    snprintf(macStr, sizeof(macStr), "%02X:%02X:%02X:%02X:%02X:%02X",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    Serial.print("MAC:        ");
    Serial.println(macStr);

    Serial.print("SDK:        ");
    Serial.println(esp_get_idf_version());

    Serial.print("Arduino:    ");
    Serial.println(ESP.getSdkVersion());
}

void Cmd_uptime(int argc, char** argv) {
    uint32_t ms = millis() - bootTime;
    int days = ms / 86400000; ms %= 86400000;
    int hrs  = ms / 3600000;  ms %= 3600000;
    int mins = ms / 60000;    ms %= 60000;
    int secs = ms / 1000;
    char buf[48];
    snprintf(buf, sizeof(buf), "%dd %02dh %02dm %02ds", days, hrs, mins, secs);
    Serial.println(buf);
}

void Cmd_free(int argc, char** argv) {
    Serial.print("Heap libero:   ");
    Serial.print(ESP.getFreeHeap());
    Serial.println(" B");
    Serial.print("Heap minimo:   ");
    Serial.print(ESP.getMinFreeHeap());
    Serial.println(" B");
    Serial.print("Heap massimo:  ");
    Serial.print(ESP.getMaxAllocHeap());
    Serial.println(" B");
    if (ESP.getPsramSize() > 0) {
        Serial.print("PSRAM libera:  ");
        Serial.print(ESP.getFreePsram());
        Serial.println(" B");
    }
}

void Cmd_reboot(int argc, char** argv) {
    Serial.println("Reboot in corso...");
    delay(100);
    ESP.restart();
}

void Cmd_clear(int argc, char** argv) {
    Serial.write(0x1B);
    Serial.print("[2J");
    Serial.write(0x1B);
    Serial.print("[H");
}

void Cmd_echo(int argc, char** argv) {
    for (int i = 1; i < argc; i++) {
        if (i > 1) Serial.print(' ');
        if (strcmp(argv[i], ">") == 0 && i + 1 < argc) {
            String rest;
            for (int j = i + 1; j < argc; j++) {
                if (j > i + 1) rest += ' ';
                rest += argv[j];
            }
            int spacePos = rest.indexOf(' ');
            if (spacePos > 0) {
                String file = rest.substring(0, spacePos);
                String data = rest.substring(spacePos + 1);
                char resolved[FS_MAX_PATH];
                if (VFS_resolvePath(file.c_str(), resolved, sizeof(resolved))) {
                    if (VFS_write(resolved, data.c_str())) {
                        Serial.println("OK");
                    } else {
                        Serial.println("Errore scrittura");
                    }
                }
            }
            return;
        }
        Serial.print(argv[i]);
    }
    Serial.println();
}

void Cmd_ps(int argc, char** argv) {
    String out;
    Kernel_ps(out);
    Serial.print(out);
}

void Cmd_kill(int argc, char** argv) {
    if (argc < 2) {
        Serial.println("Uso: kill <nome task>");
        return;
    }
    if (Kernel_isSystem(argv[1])) {
        Serial.println("Non puoi killare un task di sistema!");
        return;
    }
    if (Kernel_kill(argv[1])) {
        Serial.print(argv[1]);
        Serial.println(" terminato");
    } else {
        Serial.print(argv[1]);
        Serial.println(": task non trovato");
    }
}

#ifndef LED_BUILTIN
#define LED_BUILTIN 48
#endif

void Cmd_blink(int argc, char** argv) {
    int pin = LED_BUILTIN;
    if (argc >= 2) pin = atoi(argv[1]);
    char name[24];
    snprintf(name, sizeof(name), "blink_%d", pin);
    if (Kernel_spawn(name, blinkTask, (void*)(intptr_t)pin, 1, 1)) {
        Serial.print("Task blink avviato su pin ");
        Serial.print(pin);
        Serial.println(" (usa 'ps' per vederlo)");
    } else {
        Serial.println("Errore creazione task blink");
    }
}

void Cmd_ls(int argc, char** argv) {
    char resolved[FS_MAX_PATH];
    const char* target = (argc >= 2) ? argv[1] : VFS_getCwd();
    if (!VFS_resolvePath(target, resolved, sizeof(resolved))) {
        Serial.println("Path non valido");
        return;
    }
    String out;
    if (VFS_ls(resolved, out)) {
        Serial.print(out);
    } else {
        Serial.print("ls: ");
        Serial.print(resolved);
        Serial.println(": directory non trovata");
    }
}

void Cmd_cd(int argc, char** argv) {
    if (argc < 2) {
        VFS_setCwd("/");
        return;
    }
    char resolved[FS_MAX_PATH];
    if (!VFS_resolvePath(argv[1], resolved, sizeof(resolved))) {
        Serial.println("Path non valido");
        return;
    }
    if (!VFS_exists(resolved) || resolved[strlen(resolved) - 1] == '/') {
        VFS_setCwd(resolved);
    } else {
        Serial.print("cd: ");
        Serial.print(resolved);
        Serial.println(": non e' una directory");
    }
}

void Cmd_pwd(int argc, char** argv) {
    Serial.println(VFS_getCwd());
}

void Cmd_cat(int argc, char** argv) {
    if (argc < 2) {
        Serial.println("Uso: cat <file>");
        return;
    }
    char resolved[FS_MAX_PATH];
    if (!VFS_resolvePath(argv[1], resolved, sizeof(resolved))) {
        Serial.println("Path non valido");
        return;
    }
    String data;
    if (VFS_read(resolved, data)) {
        Serial.print(data);
        if (data.length() > 0 && data[data.length() - 1] != '\n') {
            Serial.println();
        }
    } else {
        Serial.print("cat: ");
        Serial.print(resolved);
        Serial.println(": file non trovato");
    }
}

void Cmd_write(int argc, char** argv) {
    if (argc < 3) {
        Serial.println("Uso: write <file> <testo>");
        return;
    }
    char resolved[FS_MAX_PATH];
    if (!VFS_resolvePath(argv[1], resolved, sizeof(resolved))) {
        Serial.println("Path non valido");
        return;
    }
    String data;
    for (int i = 2; i < argc; i++) {
        if (i > 2) data += ' ';
        data += argv[i];
    }
    if (VFS_write(resolved, data.c_str())) {
        Serial.println("OK");
    } else {
        Serial.println("Errore scrittura");
    }
}

void Cmd_append(int argc, char** argv) {
    if (argc < 3) {
        Serial.println("Uso: append <file> <testo>");
        return;
    }
    char resolved[FS_MAX_PATH];
    if (!VFS_resolvePath(argv[1], resolved, sizeof(resolved))) {
        Serial.println("Path non valido");
        return;
    }
    String data;
    for (int i = 2; i < argc; i++) {
        if (i > 2) data += ' ';
        data += argv[i];
    }
    if (VFS_append(resolved, data.c_str())) {
        Serial.println("OK");
    } else {
        Serial.println("Errore append");
    }
}

void Cmd_rm(int argc, char** argv) {
    if (argc < 2) {
        Serial.println("Uso: rm <file>");
        return;
    }
    char resolved[FS_MAX_PATH];
    if (!VFS_resolvePath(argv[1], resolved, sizeof(resolved))) {
        Serial.println("Path non valido");
        return;
    }
    if (VFS_remove(resolved)) {
        Serial.println("OK");
    } else {
        Serial.print("rm: ");
        Serial.print(resolved);
        Serial.println(": impossibile rimuovere");
    }
}

void Cmd_mkdir(int argc, char** argv) {
    if (argc < 2) {
        Serial.println("Uso: mkdir <dir>");
        return;
    }
    char resolved[FS_MAX_PATH];
    if (!VFS_resolvePath(argv[1], resolved, sizeof(resolved))) {
        Serial.println("Path non valido");
        return;
    }
    if (VFS_mkdir(resolved)) {
        Serial.println("OK");
    } else {
        Serial.print("mkdir: ");
        Serial.print(resolved);
        Serial.println(": impossibile creare");
    }
}

void Cmd_rmdir(int argc, char** argv) {
    if (argc < 2) {
        Serial.println("Uso: rmdir <dir>");
        return;
    }
    char resolved[FS_MAX_PATH];
    if (!VFS_resolvePath(argv[1], resolved, sizeof(resolved))) {
        Serial.println("Path non valido");
        return;
    }
    if (VFS_rmdir(resolved)) {
        Serial.println("OK");
    } else {
        Serial.print("rmdir: ");
        Serial.print(resolved);
        Serial.println(": impossibile rimuovere");
    }
}

void Cmd_df(int argc, char** argv) {
    size_t total, used;
    if (VFS_df(total, used)) {
        Serial.print("Dimensione: ");
        Serial.print(total);
        Serial.println(" B");
        Serial.print("Usato:      ");
        Serial.print(used);
        Serial.println(" B");
        Serial.print("Libero:     ");
        Serial.print(total - used);
        Serial.println(" B");
    }
}

void Cmd_run(int argc, char** argv) {
    if (argc < 2) {
        Serial.println("Uso: run <script>");
        return;
    }
    char resolved[FS_MAX_PATH];
    if (!VFS_resolvePath(argv[1], resolved, sizeof(resolved))) {
        Serial.println("Path non valido");
        return;
    }
    String content;
    if (!VFS_read(resolved, content)) {
        Serial.print("run: ");
        Serial.print(resolved);
        Serial.println(": file non trovato");
        return;
    }
    char line[SHELL_MAX_LINE];
    char* args[SHELL_MAX_ARGS];
    int linePos = 0;
    for (size_t i = 0; i <= content.length(); i++) {
        char c = (i < content.length()) ? content[i] : '\n';
        if (c == '\n' || c == '\r') {
            if (linePos > 0) {
                line[linePos] = '\0';
                Serial.print("# ");
                Serial.println(line);
                int ac = 0;
                char* p = line;
                while (*p == ' ') p++;
                while (*p && ac < SHELL_MAX_ARGS) {
                    args[ac++] = p;
                    while (*p && *p != ' ') p++;
                    if (*p) { *p = '\0'; p++; }
                    while (*p == ' ') p++;
                }
                if (ac > 0) Shell_dispatch(ac, args);
                linePos = 0;
            }
        } else if (linePos < SHELL_MAX_LINE - 1) {
            line[linePos++] = c;
        }
    }
}

void Cmd_wifi(int argc, char** argv) {
    if (argc < 2) {
        Serial.println("Uso: wifi <scan|connect <ssid> <pass>|status|disconnect>");
        return;
    }
    if (strcmp(argv[1], "scan") == 0) {
        Serial.println("Scansione in corso...");
        String out;
        WiFiSvc_scan(out);
        Serial.print(out);
    } else if (strcmp(argv[1], "connect") == 0) {
        if (argc < 4) {
            Serial.println("Uso: wifi connect <ssid> <password>");
            return;
        }
        Serial.print("Connessione a ");
        Serial.print(argv[2]);
        Serial.println("...");
        if (WiFiSvc_connect(argv[2], argv[3])) {
            Serial.println("Connesso!");
            Serial.println(WiFiSvc_status());
        } else {
            Serial.println("Connessione fallita");
        }
    } else if (strcmp(argv[1], "status") == 0) {
        Serial.println(WiFiSvc_status());
    } else if (strcmp(argv[1], "disconnect") == 0) {
        WiFiSvc_disconnect();
        Serial.println("Disconnesso");
    } else {
        Serial.println("Sottocomando sconosciuto. Usa: scan, connect, status, disconnect");
    }
}
