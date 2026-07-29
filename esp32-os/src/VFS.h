#pragma once
#include <Arduino.h>

bool VFS_init();
bool VFS_format();
bool VFS_exists(const char* path);
bool VFS_read(const char* path, String& out);
bool VFS_write(const char* path, const char* data);
bool VFS_append(const char* path, const char* data);
bool VFS_remove(const char* path);
bool VFS_mkdir(const char* path);
bool VFS_rmdir(const char* path);
bool VFS_df(size_t& total, size_t& used);
bool VFS_ls(const char* path, String& out);

bool VFS_resolvePath(const char* input, char* output, size_t maxLen);
void VFS_setCwd(const char* path);
const char* VFS_getCwd();
