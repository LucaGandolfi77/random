#pragma once
#include <Arduino.h>

typedef void (*CommandHandler)(int argc, char** argv);

struct Command {
    const char* name;
    const char* help;
    CommandHandler handler;
};

void Shell_registerCommand(const char* name, const char* help, CommandHandler handler);
void Shell_registerBuiltins();
const Command* Shell_findCommand(const char* name);
void Shell_dispatch(int argc, char** argv);
void Shell_task(void* param);
