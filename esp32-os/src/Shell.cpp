#include "Shell.h"
#include "Config.h"
#include <string.h>

static Command cmdTable[SHELL_MAX_CMDS];
static int cmdCount = 0;

static char history[SHELL_HISTORY][SHELL_MAX_LINE];
static int histCount = 0;
static int histPos = -1;

void Shell_registerCommand(const char* name, const char* help, CommandHandler handler) {
    if (cmdCount >= SHELL_MAX_CMDS) return;
    cmdTable[cmdCount].name = name;
    cmdTable[cmdCount].help = help;
    cmdTable[cmdCount].handler = handler;
    cmdCount++;
}

void Shell_registerBuiltins() {
    extern void Commands_registerAll();
    Commands_registerAll();
}

const Command* Shell_findCommand(const char* name) {
    for (int i = 0; i < cmdCount; i++) {
        if (strcmp(cmdTable[i].name, name) == 0) {
            return &cmdTable[i];
        }
    }
    return NULL;
}

void Shell_dispatch(int argc, char** argv) {
    if (argc == 0) return;
    const Command* cmd = Shell_findCommand(argv[0]);
    if (cmd) {
        cmd->handler(argc, argv);
    } else {
        Serial.print(argv[0]);
        Serial.println(": comando non trovato (usa 'help')");
    }
}

static void addHistory(const char* line) {
    if (strlen(line) == 0) return;
    if (histCount > 0 && strcmp(history[(histCount - 1) % SHELL_HISTORY], line) == 0) return;
    strncpy(history[histCount % SHELL_HISTORY], line, SHELL_MAX_LINE - 1);
    history[histCount % SHELL_HISTORY][SHELL_MAX_LINE - 1] = '\0';
    histCount++;
    histPos = histCount;
}

static void readLine(char* buf, int maxLen) {
    int pos = 0;
    histPos = histCount;
    while (true) {
        while (!Serial.available()) { taskYIELD(); }
        char c = Serial.read();
        if (c == '\r' || c == '\n') {
            buf[pos] = '\0';
            Serial.println();
            break;
        }
        if (c == 0x1B) {
            delay(10);
            if (Serial.available()) {
                char bracket = Serial.read();
                if (bracket == '[' && Serial.available()) {
                    char arrow = Serial.read();
                    if (arrow == 'A' && histCount > 0) {
                        while (pos > 0) { pos--; Serial.write(8); Serial.write(' '); Serial.write(8); }
                        if (histPos > 0) histPos--;
                        int idx = histPos < histCount ? histPos % SHELL_HISTORY : (histCount - 1) % SHELL_HISTORY;
                        strncpy(buf, history[idx], maxLen - 1);
                        pos = strlen(buf);
                        Serial.write(buf);
                    } else if (arrow == 'B' && histCount > 0) {
                        while (pos > 0) { pos--; Serial.write(8); Serial.write(' '); Serial.write(8); }
                        if (histPos < histCount) histPos++;
                        if (histPos >= histCount) {
                            pos = 0; buf[0] = '\0';
                        } else {
                            int idx = histPos % SHELL_HISTORY;
                            strncpy(buf, history[idx], maxLen - 1);
                            pos = strlen(buf);
                            Serial.write(buf);
                        }
                    }
                }
            }
            continue;
        }
        if (c == 0x7F || c == 0x08) {
            if (pos > 0) {
                pos--;
                Serial.write(8);
                Serial.write(' ');
                Serial.write(8);
            }
            continue;
        }
        if (c >= 0x20 && c <= 0x7E && pos < maxLen - 1) {
            buf[pos++] = c;
            Serial.write(c);
        }
    }
    addHistory(buf);
}

static int tokenize(char* line, char** argv, int maxArgs) {
    int argc = 0;
    char* p = line;
    while (*p == ' ') p++;
    while (*p && argc < maxArgs) {
        if (*p == '"') {
            p++;
            argv[argc] = p;
            while (*p && *p != '"') p++;
            if (*p) { *p = '\0'; p++; }
            argc++;
        } else {
            argv[argc] = p;
            while (*p && *p != ' ') p++;
            if (*p) { *p = '\0'; p++; }
            argc++;
        }
        while (*p == ' ') p++;
    }
    return argc;
}

void Shell_task(void* param) {
    char line[SHELL_MAX_LINE];
    char* argv[SHELL_MAX_ARGS];
    char prompt[64];

    snprintf(prompt, sizeof(prompt), "%s# ", SHELL_PROMPT);

    while (true) {
        Serial.print(prompt);
        readLine(line, SHELL_MAX_LINE);
        int argc = tokenize(line, argv, SHELL_MAX_ARGS);
        if (argc > 0) {
            Shell_dispatch(argc, argv);
        }
    }
}
