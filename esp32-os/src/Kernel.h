#pragma once
#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

struct UserTask {
    char name[24];
    TaskHandle_t handle;
    UBaseType_t priority;
    BaseType_t core;
    bool active;
};

void Kernel_init();
bool Kernel_spawn(const char* name, TaskFunction_t func, void* params,
                  UBaseType_t priority, BaseType_t core);
bool Kernel_kill(const char* name);
int Kernel_list(UserTask* out, int max);
void Kernel_registerSystem(const char* name, TaskHandle_t handle);
bool Kernel_isSystem(const char* name);
int Kernel_count();
void Kernel_ps(String& out);
