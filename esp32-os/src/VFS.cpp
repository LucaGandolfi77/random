#include "VFS.h"
#include "Config.h"
#include <FS.h>
#include <LittleFS.h>

static String vfs_cwd = "/";

bool VFS_init() {
    if (!LittleFS.begin(false)) {
        Serial.println("[VFS] mount fallito, formato...");
        if (!LittleFS.format()) {
            Serial.println("[VFS] formato fallito!");
            return false;
        }
        if (!LittleFS.begin(false)) {
            Serial.println("[VFS] mount dopo formato fallito!");
            return false;
        }
    }
    Serial.println("[VFS] montato " FS_MOUNT_POINT);
    return true;
}

bool VFS_format() {
    return LittleFS.format();
}

bool VFS_exists(const char* path) {
    return LittleFS.exists(path);
}

bool VFS_read(const char* path, String& out) {
    fs::File f = LittleFS.open(path, FILE_READ);
    if (!f) return false;
    out = f.readString();
    f.close();
    return true;
}

bool VFS_write(const char* path, const char* data) {
    fs::File f = LittleFS.open(path, FILE_WRITE);
    if (!f) return false;
    size_t written = f.print(data);
    f.close();
    return written > 0;
}

bool VFS_append(const char* path, const char* data) {
    fs::File f = LittleFS.open(path, FILE_APPEND);
    if (!f) return false;
    size_t written = f.print(data);
    f.close();
    return written > 0;
}

bool VFS_remove(const char* path) {
    return LittleFS.remove(path);
}

bool VFS_mkdir(const char* path) {
    return LittleFS.mkdir(path);
}

bool VFS_rmdir(const char* path) {
    return LittleFS.rmdir(path);
}

bool VFS_df(size_t& total, size_t& used) {
    total = LittleFS.totalBytes();
    used = LittleFS.usedBytes();
    return true;
}

bool VFS_ls(const char* path, String& out) {
    fs::File root = LittleFS.open(path);
    if (!root || !root.isDirectory()) return false;
    fs::File f;
    while ((f = root.openNextFile())) {
        out += f.isDirectory() ? "d " : "- ";
        out += String(f.size());
        out += " ";
        out += String(f.name());
        out += "\n";
        f.close();
    }
    return true;
}

void VFS_setCwd(const char* path) {
    vfs_cwd = path;
    if (vfs_cwd.length() == 0 || vfs_cwd[0] != '/') {
        vfs_cwd = "/";
    }
    if (vfs_cwd.length() > 1 && vfs_cwd[vfs_cwd.length() - 1] == '/') {
        vfs_cwd.remove(vfs_cwd.length() - 1);
    }
}

const char* VFS_getCwd() {
    return vfs_cwd.c_str();
}

bool VFS_resolvePath(const char* input, char* output, size_t maxLen) {
    if (input == nullptr || input[0] == '\0') return false;
    String resolved;
    if (input[0] == '/') {
        resolved = input;
    } else if (strcmp(input, ".") == 0) {
        resolved = vfs_cwd;
    } else if (strcmp(input, "..") == 0) {
        if (vfs_cwd == "/") {
            resolved = "/";
        } else {
            int pos = vfs_cwd.lastIndexOf('/');
            if (pos <= 0) resolved = "/";
            else resolved = vfs_cwd.substring(0, pos);
        }
    } else {
        resolved = vfs_cwd;
        if (resolved.length() > 1) resolved += '/';
        resolved += input;
    }
    resolved.replace("//", "/");
    if (resolved.length() >= maxLen) return false;
    strncpy(output, resolved.c_str(), maxLen);
    output[maxLen - 1] = '\0';
    return true;
}
