#include "Kernel.h"
#include "Config.h"

static UserTask taskRegistry[KERNEL_MAX_TASKS];
static int taskCount = 0;

static const char* systemTasks[] = {
    "shell"
};

void Kernel_init() {
    for (int i = 0; i < KERNEL_MAX_TASKS; i++) {
        taskRegistry[i].active = false;
    }
    taskCount = 0;
}

bool Kernel_spawn(const char* name, TaskFunction_t func, void* params,
                  UBaseType_t priority, BaseType_t core) {
    if (taskCount >= KERNEL_MAX_TASKS) return false;
    TaskHandle_t h = NULL;
    if (xTaskCreatePinnedToCore(func, name, 4096, params, priority, &h, core) != pdPASS) {
        return false;
    }
    int i = 0;
    for (; i < KERNEL_MAX_TASKS; i++) {
        if (!taskRegistry[i].active) break;
    }
    taskRegistry[i].handle = h;
    taskRegistry[i].priority = priority;
    taskRegistry[i].core = core;
    taskRegistry[i].active = true;
    strncpy(taskRegistry[i].name, name, sizeof(taskRegistry[i].name) - 1);
    taskRegistry[i].name[sizeof(taskRegistry[i].name) - 1] = '\0';
    taskCount++;
    return true;
}

bool Kernel_kill(const char* name) {
    for (int i = 0; i < KERNEL_MAX_TASKS; i++) {
        if (taskRegistry[i].active && strcmp(taskRegistry[i].name, name) == 0) {
            vTaskDelete(taskRegistry[i].handle);
            taskRegistry[i].active = false;
            taskCount--;
            return true;
        }
    }
    return false;
}

int Kernel_list(UserTask* out, int max) {
    int n = 0;
    for (int i = 0; i < KERNEL_MAX_TASKS && n < max; i++) {
        if (taskRegistry[i].active) {
            out[n++] = taskRegistry[i];
        }
    }
    return n;
}

void Kernel_registerSystem(const char* name, TaskHandle_t handle) {
    for (int i = 0; i < KERNEL_MAX_TASKS; i++) {
        if (!taskRegistry[i].active) {
            taskRegistry[i].active = true;
            taskRegistry[i].handle = handle;
            taskRegistry[i].priority = 0;
            taskRegistry[i].core = tskNO_AFFINITY;
            strncpy(taskRegistry[i].name, name, sizeof(taskRegistry[i].name) - 1);
            taskRegistry[i].name[sizeof(taskRegistry[i].name) - 1] = '\0';
            taskCount++;
            return;
        }
    }
}

bool Kernel_isSystem(const char* name) {
    for (auto s : systemTasks) {
        if (strcmp(s, name) == 0) return true;
    }
    return false;
}

int Kernel_count() {
    return taskCount;
}

static const char* taskStateStr(eTaskState s) {
    switch (s) {
        case eRunning: return "RUN ";
        case eReady:   return "RDY ";
        case eBlocked: return "BLK ";
        case eSuspended: return "SUS ";
        case eDeleted: return "DEL ";
        default:       return "?   ";
    }
}

void Kernel_ps(String& out) {
    out += "NAME                     STATE PRIO CORE STACK FREE\n";
    out += "--------------------------------------------------\n";
    char buf[64];
    for (int i = 0; i < KERNEL_MAX_TASKS; i++) {
        if (!taskRegistry[i].active) continue;
        eTaskState st = eTaskGetState(taskRegistry[i].handle);
        UBaseType_t freeStack = uxTaskGetStackHighWaterMark(taskRegistry[i].handle);
        snprintf(buf, sizeof(buf), "%-24s %s %4d %4d %d\n",
                 taskRegistry[i].name,
                 taskStateStr(st),
                 taskRegistry[i].priority,
                 taskRegistry[i].core == tskNO_AFFINITY ? -1 : (int)taskRegistry[i].core,
                 freeStack * 4);
        out += buf;
    }
}
